import prisma from '../db.js';
import express from 'express';
import bcrypt from 'bcrypt';

const router = express.Router();

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
                })
            },
            include: {
                student: true,
                faculty: true
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
                faculty: true
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
                })
            },
            include: {
                student: true,
                faculty: true
            }
        });

        res.json({ data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;