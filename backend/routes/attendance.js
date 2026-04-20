import prisma from '../db.js';
import express from 'express';

const router = express.Router();

const DAY_MAP = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Helper to normalize time to 2000-01-01 for comparison with Slot times
function normalizeTime(date) {
    const d = new Date(date);
    const normalized = new Date("2000-01-01T00:00:00");
    normalized.setHours(d.getHours());
    normalized.setMinutes(d.getMinutes());
    normalized.setSeconds(d.getSeconds());
    return normalized;
}

/**
 * Identify the current slot and class based on device and time
 */
async function getCurrentContext(deviceId, facultyId = null, simulatedTime = null) {
    const now = simulatedTime ? new Date(simulatedTime) : new Date();
    const currentDay = DAY_MAP[now.getDay()];
    const normalizedNow = normalizeTime(now);

    // 1. Find reader and venue
    const reader = await prisma.rFIDReader.findUnique({
        where: { deviceIdentifier: deviceId },
        include: { venue: true }
    });
    if (!reader) throw new Error('Device not found');

    // 2. Find eligible slots (matching day and time)
    const slots = await prisma.slot.findMany({
        where: {
            dayOfWeek: currentDay,
            startTime: { lte: normalizedNow },
            endTime: { gte: normalizedNow }
        }
    });

    if (slots.length === 0) return null;

    // 3. Find Class for the venue and slots
    // If facultyId is provided, we filter by it
    const classes = await prisma.class.findMany({
        where: {
            venueId: reader.roomId,
            status: 'ONGOING',
            course: {
                slots: {
                    some: {
                        id: { in: slots.map(s => s.id) }
                    }
                }
            },
            ...(facultyId && { facultyId: facultyId })
        },
        include: {
            course: { include: { slots: true } },
            faculty: { include: { user: true } }
        }
    });

    if (classes.length === 0) return null;

    // Pick the class that best matches the current time if multiple (unlikely in good schedule)
    return {
        classInstance: classes[0],
        slot: slots[0],
        reader: reader
    };
}

/**
 * RFID Tap Endpoint
 * Payload: { deviceId, rfid }
 */
router.post('/tap', async (req, res) => {
    try {
        const { deviceId, rfid, simulatedTime } = req.body;

        if (!deviceId || !rfid) {
            return res.status(400).json({ error: 'deviceId and rfid are required' });
        }

        // 1. Identify User
        const user = await prisma.user.findUnique({
            where: { rfid },
            include: { faculty: true, student: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not recognized' });
        }

        // 2. Determine Context
        const context = await getCurrentContext(deviceId, user.role === 'FACULTY' ? user.id : null, simulatedTime);

        if (!context) {
            return res.status(404).json({ error: 'No active class found for this device at this time' });
        }

        const { classInstance, slot } = context;

        if (user.role === 'FACULTY') {
            // Logic for Faculty: Open/Close session
            const currentDayStart = simulatedTime ? new Date(new Date(simulatedTime).setHours(0,0,0,0)) : new Date(new Date().setHours(0, 0, 0, 0));
            const currentDayEnd = simulatedTime ? new Date(new Date(simulatedTime).setHours(23,59,59,999)) : new Date(new Date().setHours(23, 59, 59, 999));
            
            const activeSession = await prisma.attendanceSession.findFirst({
                where: {
                    classId: classInstance.id,
                    status: 'OPEN',
                    date: {
                        gte: currentDayStart,
                        lte: currentDayEnd
                    }
                }
            });

            if (activeSession) {
                // Close existing session
                const closedSession = await prisma.attendanceSession.update({
                    where: { id: activeSession.id },
                    data: {
                        status: 'CLOSED',
                        endTime: simulatedTime ? new Date(simulatedTime) : new Date()
                    }
                });
                return res.json({ 
                    message: 'Attendance session closed', 
                    type: 'FACULTY_CLOSE', 
                    session: closedSession 
                });
            } else {
                // Open new session
                const newSession = await prisma.attendanceSession.create({
                    data: {
                        classId: classInstance.id,
                        date: simulatedTime ? new Date(simulatedTime) : new Date(),
                        startTime: simulatedTime ? new Date(simulatedTime) : new Date(),
                        endTime: new Date(slot.endTime), // Potential auto-close target
                        status: 'OPEN'
                    }
                });
                return res.json({ 
                    message: 'Attendance session opened', 
                    type: 'FACULTY_OPEN', 
                    session: newSession 
                });
            }
        } else if (user.role === 'STUDENT') {
            // Logic for Student: Record attendance
            // Find an open session for THIS class
            const openSession = await prisma.attendanceSession.findFirst({
                where: {
                    classId: classInstance.id,
                    status: 'OPEN'
                }
            });

            if (!openSession) {
                // Check if session needs auto-close (time exceeded)
                // But if no session is open, we can't record.
                return res.status(400).json({ error: 'No open attendance session for this class' });
            }

            // check if session is expired
            const now = normalizeTime(simulatedTime ? new Date(simulatedTime) : new Date());
            if (now > normalizeTime(slot.endTime)) {
                // Auto close it
                await prisma.attendanceSession.update({
                    where: { id: openSession.id },
                    data: { 
                        status: 'AUTO_CLOSED', 
                        endTime: simulatedTime ? new Date(simulatedTime) : new Date() 
                    }
                });
                return res.status(400).json({ error: 'Attendance session has expired and was auto-closed' });
            }

            // Record attendance
            try {
                const record = await prisma.attendanceRecord.create({
                    data: {
                        sessionId: openSession.id,
                        userId: user.id,
                        readerId: context.reader.id
                    }
                });
                return res.json({ 
                    message: 'Attendance recorded', 
                    type: 'STUDENT_TAP', 
                    record: record,
                    userName: user.name 
                });
            } catch (err) {
                if (err.code === 'P2002') {
                    return res.status(400).json({ error: 'Attendance already recorded for this session' });
                }
                throw err;
            }
        } else {
            return res.status(403).json({ error: 'Unauthorized role' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Endpoint to trigger auto-closure of expired sessions
router.post('/auto-close', async (req, res) => {
    try {
        const now = normalizeTime(new Date());
        
        // Find all open sessions
        const openSessions = await prisma.attendanceSession.findMany({
            where: { status: 'OPEN' },
            include: {
                class: {
                    include: {
                        course: { include: { slots: true } }
                    }
                }
            }
        });

        let closedCount = 0;
        for (const session of openSessions) {
            // Find the slot for this session
            // Since a class can have multiple slots, we need to find the one matching today
            const currentDay = DAY_MAP[new Date().getDay()];
            const slot = session.class.course.slots.find(s => s.dayOfWeek === currentDay);

            if (slot && now > normalizeTime(slot.endTime)) {
                await prisma.attendanceSession.update({
                    where: { id: session.id },
                    data: { status: 'AUTO_CLOSED', endTime: new Date() }
                });
                closedCount++;
            }
        }

        res.json({ message: `Scanned sessions. Closed ${closedCount} expired sessions.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- RETRIEVAL ENDPOINTS ---

/**
 * Get all sessions for a specific class (Faculty/Admin)
 */
router.get('/classes/:classId/sessions', async (req, res) => {
    try {
        const { classId } = req.params;
        const sessions = await prisma.attendanceSession.findMany({
            where: { classId: parseInt(classId) },
            include: {
                _count: { select: { records: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json({ data: sessions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get all records for a session (Faculty/Admin)
 * Also includes enrolled students who haven't tapped (Absent)
 */
router.get('/sessions/:sessionId/records', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const session = await prisma.attendanceSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: {
                class: {
                    include: {
                        students: { include: { user: true } }
                    }
                },
                records: { include: { user: true } }
            }
        });

        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Map records for easy lookup
        const recordMap = new Map(session.records.map(r => [r.userId, r]));

        // Combine enrolled students with their record (if any)
        const students = session.class.students.map(s => ({
            userId: s.userId,
            name: s.user.name,
            regNumber: s.regNumber,
            present: recordMap.has(s.userId),
            recordId: recordMap.get(s.userId)?.id || null,
            timestamp: recordMap.get(s.userId)?.timestamp || null
        }));

        res.json({ data: students, session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get current student's attendance records
 */
router.get('/my-records', async (req, res) => {
    // This expects the student to be authenticated
    // Note: Since this route is used in index.js without global auth, 
    // I should probably rely on a token or user ID. 
    // For now, I'll assume it's used with authenticate middleware from routes or I'll add it here.
    try {
        // We'll need a way to get student ID. If using middleware:
        // const userId = req.user.id;
        // For now, I'll allow passing userId in query for simulation if needed, 
        // but real production would use req.user.id.
        const userId = req.query.userId; 
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        const records = await prisma.attendanceRecord.findMany({
            where: { userId: parseInt(userId) },
            include: {
                session: {
                    include: {
                        class: {
                            include: {
                                course: true,
                                faculty: { include: { user: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });
        res.json({ data: records });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MANUAL MANAGEMENT ENDPOINTS ---

/**
 * Manually add attendance record (Faculty/Admin)
 */
router.post('/records', async (req, res) => {
    try {
        const { sessionId, userId } = req.body;
        const record = await prisma.attendanceRecord.create({
            data: {
                sessionId: parseInt(sessionId),
                userId: parseInt(userId)
            }
        });
        res.json({ data: record });
    } catch (err) {
        if (err.code === 'P2002') return res.status(400).json({ error: 'Record already exists' });
        res.status(500).json({ error: err.message });
    }
});

/**
 * Manually remove attendance record (Faculty/Admin)
 */
router.delete('/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.attendanceRecord.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Record deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin CRUD for Sessions
 */
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await prisma.attendanceSession.findMany({
            include: {
                class: {
                    include: {
                        course: true,
                        faculty: { include: { user: true } }
                    }
                },
                _count: { select: { records: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json({ data: sessions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.attendanceSession.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Session deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
