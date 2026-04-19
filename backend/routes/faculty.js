import express from 'express';
import { authenticate, authorizeFaculty } from '../middleware/auth.js';

const router = express.Router();

// Apply faculty protection to all routes in this file
router.use(authenticate);
router.use(authorizeFaculty);

// TEST ENDPOINT
router.get('/test', (req, res) => {
    res.json({
        message: 'Faculty access verified',
        faculty: req.user
    });
});

export default router;
