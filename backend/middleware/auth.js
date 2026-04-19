import jwt from 'jsonwebtoken';
import prisma from '../db.js';

export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Authentication required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }, // Token payload has 'id' from auth.js
            include: { student: true, faculty: true }
        });

        if (!user) return res.status(401).json({ error: 'User not found' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export const authorizeFaculty = (req, res, next) => {
    if (req.user.role !== 'FACULTY') {
        return res.status(403).json({ error: 'Access denied: Faculty only' });
    }
    next();
};

export const authorizeStudent = (req, res, next) => {
    if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Access denied: Student only' });
    }
    next();
};
