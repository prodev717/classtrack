import express from 'express';
import { authenticate, authorizeFaculty } from '../middleware/auth.js';

import prisma from '../db.js';

const router = express.Router();

// Apply faculty protection to all routes in this file
router.use(authenticate);
router.use(authorizeFaculty);

// GET FACULTY'S CLASSES
router.get('/classes', async (req, res) => {
    try {
        const userId = req.user.id;
        const classes = await prisma.class.findMany({
            where: { facultyId: userId },
            include: {
                course: {
                    include: {
                        slots: true
                    }
                },
                venue: true,
                students: {
                    include: {
                        user: true
                    }
                }
            }
        });
        res.json({ data: classes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET ALL COURSES (to choose from)
router.get('/courses', async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            include: { slots: true },
            orderBy: { courseName: 'asc' }
        });
        res.json({ data: courses });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET ALL STUDENTS (to add to class)
router.get('/students', async (req, res) => {
    try {
        const students = await prisma.studentProfile.findMany({
            include: {
                user: true
            }
        });
        res.json({ data: students });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET ALL VENUES (for faculty to pick from)
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

// CREATE A CLASS
router.post('/classes', async (req, res) => {
    try {
        const { courseId, venueId, studentIds } = req.body;
        const facultyId = req.user.id;

        // 1. Get the slots of the course being assigned
        const selectedCourse = await prisma.course.findUnique({
            where: { id: parseInt(courseId) },
            include: { slots: true }
        });

        if (!selectedCourse) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const selectedSlotIds = selectedCourse.slots.map(s => s.id);

        // 2. Check for overlap in the same venue
        // overlap if any existing class in venueId has a course that shares any slotIds
        const conflict = await prisma.class.findFirst({
            where: {
                venueId: parseInt(venueId),
                course: {
                    slots: {
                        some: {
                            id: { in: selectedSlotIds }
                        }
                    }
                }
            },
            include: {
                course: true
            }
        });

        if (conflict) {
            return res.status(400).json({
                error: `Venue overlap! This room is already occupied by ${conflict.course.courseName} during the requested slots.`
            });
        }

        // 3. Create the class
        const newClass = await prisma.class.create({
            data: {
                faculty: { connect: { userId: facultyId } },
                venue: { connect: { id: parseInt(venueId) } },
                course: { connect: { id: parseInt(courseId) } },
                students: {
                    connect: (studentIds || []).map(id => ({ userId: parseInt(id) }))
                }
            }
        });

        res.json({ data: newClass });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// UPDATE A CLASS
router.put('/classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { courseId, venueId, studentIds, status } = req.body;
        const facultyId = req.user.id;

        // Verify ownership
        const existingClass = await prisma.class.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingClass || existingClass.facultyId !== facultyId) {
            return res.status(403).json({ error: 'Not authorized to edit this class' });
        }

        // Conflict check (exclude self)
        const selectedCourse = await prisma.course.findUnique({
            where: { id: parseInt(courseId) },
            include: { slots: true }
        });

        const selectedSlotIds = selectedCourse.slots.map(s => s.id);

        const conflict = await prisma.class.findFirst({
            where: {
                id: { not: parseInt(id) },
                venueId: parseInt(venueId),
                course: {
                    slots: {
                        some: { id: { in: selectedSlotIds } }
                    }
                }
            },
            include: { course: true }
        });

        if (conflict) {
            return res.status(400).json({
                error: `Venue overlap! This room is already occupied by ${conflict.course.courseName} during the requested slots.`
            });
        }

        const updatedClass = await prisma.class.update({
            where: { id: parseInt(id) },
            data: {
                venue: { connect: { id: parseInt(venueId) } },
                course: { connect: { id: parseInt(courseId) } },
                students: {
                    set: (studentIds || []).map(id => ({ userId: parseInt(id) }))
                },
                status: status
            }
        });

        res.json({ data: updatedClass });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE A CLASS
router.delete('/classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const facultyId = req.user.id;

        const existingClass = await prisma.class.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingClass || existingClass.facultyId !== facultyId) {
            return res.status(403).json({ error: 'Not authorized to delete this class' });
        }

        await prisma.class.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Class deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// END A CLASS (Mark as COMPLETED)
router.patch('/classes/:id/end', async (req, res) => {
    try {
        const { id } = req.params;
        const facultyId = req.user.id;

        const existingClass = await prisma.class.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingClass || existingClass.facultyId !== facultyId) {
            return res.status(403).json({ error: 'Not authorized to end this class' });
        }

        const updatedClass = await prisma.class.update({
            where: { id: parseInt(id) },
            data: { status: 'COMPLETED' }
        });

        res.json({ data: updatedClass });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
