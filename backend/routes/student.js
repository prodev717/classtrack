import express from 'express';
import { authenticate, authorizeStudent } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeStudent);

// TEST ENDPOINT
router.get('/test', (req, res) => {
    res.json({
        message: 'Student access verified',
        student: req.user
    });
});

export default router;
