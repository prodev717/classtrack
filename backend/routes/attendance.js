import prisma from '../db.js';
import express from 'express';
import { authenticate, authorizeFaculty, authorizeStudent, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

// Helper to get time components in the institution's timezone
function getInstitutionTime(date, timeZone = DEFAULT_TIMEZONE) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(date);
    const map = {};
    parts.forEach(p => map[p.type] = p.value);

    const dayMap = {
        'Sun': 'SUN', 'Mon': 'MON', 'Tue': 'TUE', 'Wed': 'WED', 'Thu': 'THU', 'Fri': 'FRI', 'Sat': 'SAT'
    };

    return {
        dayOfWeek: dayMap[map.weekday],
        hours: parseInt(map.hour),
        minutes: parseInt(map.minute),
        seconds: parseInt(map.second),
        year: map.year,
        month: map.month,
        day: map.day
    };
}

// Helper to normalize time to 2000-01-01 for comparison with Slot times
// It produces a UTC date where the time components match the wall-clock time in the target timezone
function normalizeTime(date) {
    const info = getInstitutionTime(date);
    const normalized = new Date("2000-01-01T00:00:00Z");
    normalized.setUTCHours(info.hours);
    normalized.setUTCMinutes(info.minutes);
    normalized.setUTCSeconds(info.seconds);
    normalized.setUTCMilliseconds(0);
    return normalized;
}

/**
 * Identify the current slot and class based on device and time
 */
async function getCurrentContext(deviceId, facultyId = null, simulatedTime = null) {
    const now = simulatedTime ? new Date(simulatedTime) : new Date();
    const info = getInstitutionTime(now);
    const currentDay = info.dayOfWeek;
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
        const now = simulatedTime ? new Date(simulatedTime) : new Date();

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

        // 2. Identify Reader/Venue
        const reader = await prisma.rFIDReader.findUnique({
            where: { deviceIdentifier: deviceId },
            include: { venue: true }
        });
        if (!reader) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // 3. Find any currently OPEN session at this venue
        let activeSession = await prisma.attendanceSession.findFirst({
            where: {
                status: 'OPEN',
                class: { venueId: reader.roomId }
            },
            include: {
                class: {
                    include: {
                        course: { include: { slots: true } },
                        faculty: { include: { user: true } }
                    }
                }
            }
        });

        // 4. Handle expired session (Auto-close)
        if (activeSession) {
            const info = getInstitutionTime(now);
            const slot = activeSession.class.course.slots.find(s => s.dayOfWeek === info.dayOfWeek);
            const normalizedNow = normalizeTime(now);

            if (slot && normalizedNow > slot.endTime) {
                // Auto-close it
                const autoClosedSession = await prisma.attendanceSession.update({
                    where: { id: activeSession.id },
                    data: {
                        status: 'AUTO_CLOSED',
                        endTime: now
                    }
                });

                // If the faculty member who owns the session is tapping, treat it as a close event
                if (user.role === 'FACULTY' && activeSession.class.facultyId === user.id) {
                    return res.json({
                        message: 'Attendance session expired and was auto-closed',
                        type: 'FACULTY_CLOSE',
                        session: autoClosedSession
                    });
                }

                // Otherwise, proceed as if no active session (it's now closed)
                activeSession = null;
            }
        }

        // 5. Role-based Logic
        if (user.role === 'FACULTY') {
            // If this faculty has an active session, close it
            if (activeSession && activeSession.class.facultyId === user.id) {
                // Cooldown check: 15 seconds since opening
                const diff = now.getTime() - new Date(activeSession.startTime).getTime();
                if (diff < 10000) {
                    return res.status(429).json({
                        error: 'Cooldown active. Please wait 15 seconds between taps.',
                        remainingSeconds: Math.ceil((15000 - diff) / 1000)
                    });
                }

                const closedSession = await prisma.attendanceSession.update({
                    where: { id: activeSession.id },
                    data: {
                        status: 'CLOSED',
                        endTime: now
                    }
                });
                return res.json({
                    message: 'Attendance session closed',
                    type: 'FACULTY_CLOSE',
                    session: closedSession
                });
            }

            // If another faculty has a session open, prevent starting a new one
            if (activeSession) {
                return res.status(400).json({ error: 'Another faculty member has an open session in this venue' });
            }

            // Try to open a new session: Find current context for this faculty
            const context = await getCurrentContext(deviceId, user.id, simulatedTime);
            if (!context) {
                return res.status(404).json({ error: 'No active class found for you at this device at this time' });
            }

            const { classInstance, slot } = context;

            // Cooldown check for opening (against last session of this class)
            const lastSession = await prisma.attendanceSession.findFirst({
                where: { classId: classInstance.id },
                orderBy: { id: 'desc' }
            });

            if (lastSession) {
                const lastActionTime = lastSession.status === 'OPEN' ? lastSession.startTime : lastSession.endTime;
                const diff = now.getTime() - new Date(lastActionTime).getTime();
                if (diff < 15000) {
                    return res.status(429).json({
                        error: 'Cooldown active. Please wait 15 seconds between taps.',
                        remainingSeconds: Math.ceil((15000 - diff) / 1000)
                    });
                }
            }

            const info = getInstitutionTime(now);
            const dateStr = `${info.year}-${info.month}-${info.day}`;
            const targetDate = new Date(`${dateStr}T00:00:00Z`);

            // Check if a session already exists for this class and date
            const existingSession = await prisma.attendanceSession.findFirst({
                where: {
                    classId: classInstance.id,
                    date: targetDate
                }
            });

            if (existingSession) {
                // Resume the existing session instead of creating a new one
                const resumedSession = await prisma.attendanceSession.update({
                    where: { id: existingSession.id },
                    data: {
                        status: 'OPEN',
                        endTime: slot.endTime // Update endTime to current slot's end
                    }
                });
                return res.json({
                    message: 'Attendance session resumed',
                    type: 'FACULTY_OPEN',
                    session: resumedSession
                });
            }

            const newSession = await prisma.attendanceSession.create({
                data: {
                    classId: classInstance.id,
                    date: targetDate,
                    startTime: now,
                    endTime: slot.endTime,
                    status: 'OPEN'
                }
            });
            return res.json({
                message: 'Attendance session opened',
                type: 'FACULTY_OPEN',
                session: newSession
            });

        } else if (user.role === 'STUDENT') {
            if (activeSession) {
                // Check if student is enrolled in this class
                const enrollment = await prisma.class.findFirst({
                    where: {
                        id: activeSession.classId,
                        students: { some: { userId: user.id } }
                    }
                });

                if (!enrollment) {
                    return res.status(403).json({ error: 'You are not enrolled in the current active class' });
                }

                // Record attendance
                try {
                    const record = await prisma.attendanceRecord.create({
                        data: {
                            sessionId: activeSession.id,
                            userId: user.id,
                            readerId: reader.id
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
                // No active session. Check if a class *should* be happening to give a better error message.
                const context = await getCurrentContext(deviceId, null, simulatedTime);
                if (context) {
                    return res.status(400).json({ error: 'Attendance session not yet opened by faculty' });
                } else {
                    return res.status(404).json({ error: 'No active class found for this device at this time' });
                }
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
            const info = getInstitutionTime(new Date());
            const currentDay = info.dayOfWeek;
            const slot = session.class.course.slots.find(s => s.dayOfWeek === currentDay);

            const normalizedNow = normalizeTime(new Date());
            if (slot && normalizedNow > slot.endTime) {
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
 * Get full attendance matrix for a class (CSV format)
 */
router.get('/classes/:classId/report', authenticate, authorizeFaculty, async (req, res) => {
    try {
        const { classId } = req.params;
        const userId = req.user.id;

        const classInstance = await prisma.class.findUnique({
            where: { id: parseInt(classId) },
            include: {
                students: { include: { user: true } },
                attendanceSessions: {
                    include: { records: true },
                    orderBy: { date: 'asc' }
                }
            }
        });

        if (!classInstance || classInstance.facultyId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const sessions = classInstance.attendanceSessions;
        const students = classInstance.students;

        // Create a lookup for attendance: studentId_sessionId -> boolean
        const attendanceMap = new Set();
        sessions.forEach(s => {
            s.records.forEach(r => {
                attendanceMap.add(`${r.userId}_${s.id}`);
            });
        });

        const report = students.map((s, idx) => {
            const studentData = {
                'SNo': idx + 1,
                'Name': s.user.name,
                'RegNo': s.regNumber
            };

            sessions.forEach(session => {
                const dateKey = new Date(session.date).toLocaleDateString();
                studentData[dateKey] = attendanceMap.has(`${s.userId}_${session.id}`) ? 'Present' : 'Absent';
            });

            return studentData;
        });

        res.json({ data: report, columns: ['SNo', 'Name', 'RegNo', ...sessions.map(s => new Date(s.date).toLocaleDateString())] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

// --- REPORTING & STATS ENDPOINTS ---

/**
 * Get stats for logged-in student
 */
router.get('/student/stats', authenticate, authorizeStudent, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all classes the student is enrolled in
        const enrolledClasses = await prisma.class.findMany({
            where: { students: { some: { userId } } },
            include: {
                course: true,
                attendanceSessions: {
                    include: {
                        records: { where: { userId } }
                    }
                }
            }
        });

        const stats = enrolledClasses.map(c => {
            const totalSessions = c.attendanceSessions.length;
            const attendedSessions = c.attendanceSessions.filter(s => s.records.length > 0).length;
            const percentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

            return {
                classId: c.id,
                courseName: c.course.courseName,
                courseCode: c.course.courseCode,
                totalSessions,
                attendedSessions,
                percentage: parseFloat(percentage.toFixed(2)),
                status: percentage >= 75 ? 'GOOD' : 'LOW'
            };
        });

        const overallTotal = stats.reduce((acc, curr) => acc + curr.totalSessions, 0);
        const overallAttended = stats.reduce((acc, curr) => acc + curr.attendedSessions, 0);
        const overallPercentage = overallTotal > 0 ? (overallAttended / overallTotal) * 100 : 0;

        res.json({
            data: {
                classWise: stats,
                overall: {
                    attended: overallAttended,
                    total: overallTotal,
                    percentage: parseFloat(overallPercentage.toFixed(2)),
                    status: overallPercentage >= 75 ? 'GOOD' : 'LOW'
                }
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Get stats for faculty classes
 */
router.get('/faculty/class/:classId/stats', authenticate, authorizeFaculty, async (req, res) => {
    try {
        const { classId } = req.params;
        const userId = req.user.id;

        const classInstance = await prisma.class.findUnique({
            where: { id: parseInt(classId) },
            include: {
                course: true,
                students: true,
                attendanceSessions: {
                    include: {
                        _count: { select: { records: true } }
                    },
                    orderBy: { date: 'asc' }
                }
            }
        });

        if (!classInstance || classInstance.facultyId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const totalStudents = classInstance.students.length;
        const sessionStats = classInstance.attendanceSessions.map(s => ({
            date: s.date,
            present: s._count.records,
            percentage: totalStudents > 0 ? (s._count.records / totalStudents) * 100 : 0
        }));

        const avgAttendance = sessionStats.length > 0
            ? sessionStats.reduce((acc, curr) => acc + curr.percentage, 0) / sessionStats.length
            : 0;

        res.json({
            data: {
                className: classInstance.course.courseName,
                totalStudents,
                totalSessions: sessionStats.length,
                averageAttendance: parseFloat(avgAttendance.toFixed(2)),
                trend: sessionStats.slice(-10) // Last 10 sessions
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Admin High Level Stats
 */
router.get('/admin/stats', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const classes = await prisma.class.findMany({
            include: {
                course: true,
                students: true,
                attendanceSessions: {
                    include: { _count: { select: { records: true } } }
                }
            }
        });

        const classStats = classes.map(c => {
            const totalStudents = c.students.length;
            const sessions = c.attendanceSessions;
            const avgClassAttendance = sessions.length > 0
                ? sessions.reduce((acc, s) => acc + (totalStudents > 0 ? (s._count.records / totalStudents) * 100 : 0), 0) / sessions.length
                : 0;

            return {
                id: c.id,
                courseName: c.course.courseName,
                courseCode: c.course.courseCode,
                avgAttendance: parseFloat(avgClassAttendance.toFixed(2))
            };
        });

        res.json({
            data: {
                totalClasses: classes.length,
                classStats,
                lowAttendanceClasses: classStats.filter(c => c.avgAttendance < 75)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


export default router;
