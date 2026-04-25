import prisma from '../db.js';
import express from 'express';
import bcrypt from 'bcrypt';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeAdmin);

router.post('/users', async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            rfid,
            role,
            regNumber,
            employeeId,
            department
        } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                rfid,
                password: hashedPassword,
                role,
                ...(role === 'STUDENT' && {
                    student: {
                        create: {
                            regNumber,
                            department
                        }
                    }
                }),
                ...(role === 'FACULTY' && {
                    faculty: {
                        create: {
                            employeeId,
                            department
                        }
                    }
                }),
                ...(role === 'ADMIN' && {
                    admin: {
                        create: {}
                    }
                })
            },
            include: {
                student: true,
                faculty: true,
                admin: true
            }
        });

        res.json({ data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                student: true,
                faculty: true,
                admin: true
            }
        });

        res.json({ data: users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// EDIT USER
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            password,
            rfid,
            role,
            regNumber,
            employeeId,
            department
        } = req.body;

        const updateData = {
            name,
            email,
            rfid,
            role
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                ...updateData,
                ...(role === 'STUDENT' && {
                    student: {
                        upsert: {
                            create: { regNumber, department },
                            update: { regNumber, department }
                        }
                    }
                }),
                ...(role === 'FACULTY' && {
                    faculty: {
                        upsert: {
                            create: { employeeId, department },
                            update: { employeeId, department }
                        }
                    }
                }),
                ...(role === 'ADMIN' && {
                    admin: {
                        upsert: {
                            create: {},
                            update: {}
                        }
                    }
                })
            },
            include: {
                student: true,
                faculty: true,
                admin: true
            }
        });

        res.json({ data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE USER
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- SLOT MANAGEMENT ---

// GET ALL SLOTS
router.get('/slots', async (req, res) => {
    try {
        const slots = await prisma.slot.findMany({
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
        res.json({ data: slots });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CREATE SLOT
router.post('/slots', async (req, res) => {
    try {
        const { slotName, dayOfWeek, startTime, endTime } = req.body;
        // Combine time string with an arbitrary date to store as DateTime
        const baseDate = "2000-01-01T";
        const slot = await prisma.slot.create({
            data: {
                slotName,
                dayOfWeek,
                startTime: new Date(`${baseDate}${startTime}:00Z`),
                endTime: new Date(`${baseDate}${endTime}:00Z`)
            }
        });
        res.json({ data: slot });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// UPDATE SLOT
router.put('/slots/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { slotName, dayOfWeek, startTime, endTime } = req.body;
        const baseDate = "2000-01-01T";
        const slot = await prisma.slot.update({
            where: { id: parseInt(id) },
            data: {
                slotName,
                dayOfWeek,
                startTime: new Date(`${baseDate}${startTime}${startTime.includes(':') && startTime.split(':').length === 2 ? ':00' : ''}Z`),
                endTime: new Date(`${baseDate}${endTime}${endTime.includes(':') && endTime.split(':').length === 2 ? ':00' : ''}Z`)
            }
        });
        res.json({ data: slot });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE SLOT
router.delete('/slots/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.slot.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Slot deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- VENUE MANAGEMENT ---

// GET ALL VENUES
router.get('/venues', async (req, res) => {
    try {
        const venues = await prisma.venue.findMany({
            orderBy: { block: 'asc' }
        });
        res.json({ data: venues });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CREATE VENUE
router.post('/venues', async (req, res) => {
    try {
        const { room, block } = req.body;
        const venue = await prisma.venue.create({
            data: { room, block }
        });
        res.json({ data: venue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// UPDATE VENUE
router.put('/venues/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { room, block } = req.body;
        const venue = await prisma.venue.update({
            where: { id: parseInt(id) },
            data: { room, block }
        });
        res.json({ data: venue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE VENUE
router.delete('/venues/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.venue.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Venue deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- RFID READER MANAGEMENT ---

// GET ALL READERS
router.get('/readers', async (req, res) => {
    try {
        const readers = await prisma.rFIDReader.findMany({
            include: { venue: true }
        });
        res.json({ data: readers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CREATE READER
router.post('/readers', async (req, res) => {
    try {
        const { roomId, deviceIdentifier, status } = req.body;
        const reader = await prisma.rFIDReader.create({
            data: {
                roomId: parseInt(roomId),
                deviceIdentifier,
                status: status || 'ACTIVE'
            },
            include: { venue: true }
        });
        res.json({ data: reader });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// UPDATE READER
router.put('/readers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { roomId, deviceIdentifier, status } = req.body;
        const reader = await prisma.rFIDReader.update({
            where: { id: parseInt(id) },
            data: {
                roomId: parseInt(roomId),
                deviceIdentifier,
                status
            },
            include: { venue: true }
        });
        res.json({ data: reader });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE READER
router.delete('/readers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.rFIDReader.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Reader deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- COURSE MANAGEMENT ---

// GET ALL COURSES
router.get('/courses', async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            include: { slots: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: courses });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CREATE COURSE
router.post('/courses', async (req, res) => {
    try {
        const { courseName, courseCode, slotIds } = req.body;

        const existing = await prisma.course.findUnique({
            where: { courseCode }
        });

        if (existing) {
            return res.status(400).json({ error: 'Course code already exists' });
        }

        const course = await prisma.course.create({
            data: { 
                courseName, 
                courseCode,
                slots: {
                    connect: (slotIds || []).map(id => ({ id: parseInt(id) }))
                }
            },
            include: { slots: true }
        });
        res.json({ data: course });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ error: 'Course code must be unique' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// UPDATE COURSE
router.put('/courses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { courseName, courseCode, slotIds } = req.body;
        const course = await prisma.course.update({
            where: { id: parseInt(id) },
            data: { 
                courseName, 
                courseCode,
                slots: {
                    set: (slotIds || []).map(id => ({ id: parseInt(id) }))
                }
            },
            include: { slots: true }
        });
        res.json({ data: course });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE COURSE
router.delete('/courses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.course.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Course deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- CLASS MANAGEMENT ---

// GET ALL CLASSES
router.get('/classes', async (req, res) => {
    try {
        const classes = await prisma.class.findMany({
            include: {
                course: { include: { slots: true } },
                venue: true,
                faculty: { include: { user: true } },
                students: { include: { user: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: classes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CREATE CLASS
router.post('/classes', async (req, res) => {
    try {
        const { courseId, venueId, facultyId, studentIds } = req.body;

        const newClass = await prisma.class.create({
            data: {
                course: { connect: { id: parseInt(courseId) } },
                venue: { connect: { id: parseInt(venueId) } },
                faculty: { connect: { userId: parseInt(facultyId) } },
                students: {
                    connect: (studentIds || []).map(id => ({ userId: parseInt(id) }))
                }
            },
            include: {
                course: true,
                venue: true,
                faculty: { include: { user: true } },
                students: { include: { user: true } }
            }
        });

        res.json({ data: newClass });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// UPDATE CLASS
router.put('/classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { courseId, venueId, facultyId, studentIds, status } = req.body;

        const updatedClass = await prisma.class.update({
            where: { id: parseInt(id) },
            data: {
                course: { connect: { id: parseInt(courseId) } },
                venue: { connect: { id: parseInt(venueId) } },
                faculty: { connect: { userId: parseInt(facultyId) } },
                students: {
                    set: (studentIds || []).map(id => ({ userId: parseInt(id) }))
                },
                status: status
            },
            include: {
                course: true,
                venue: true,
                faculty: { include: { user: true } },
                students: { include: { user: true } }
            }
        });

        res.json({ data: updatedClass });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE CLASS
router.delete('/classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.class.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Class deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;