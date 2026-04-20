import express from 'express';
import { authenticate, authorizeStudent } from '../middleware/auth.js';

import prisma from '../db.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeStudent);

// GET ENROLLED CLASSES
router.get('/classes', async (req, res) => {
    try {
        const userId = req.user.id;
        const classes = await prisma.class.findMany({
            where: {
                students: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                course: {
                    include: {
                        slots: true
                    }
                },
                venue: true,
                faculty: {
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

export default router;
