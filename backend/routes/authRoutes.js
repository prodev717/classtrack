import express from 'express';
import { teacherRegister, teacherLogin, studentRegister, studentLogin } from '../controllers/authController.js';

const router = express.Router();

router.post('/teacher/register', teacherRegister);
router.post('/teacher/login', teacherLogin);
router.post('/student/register', studentRegister);
router.post('/student/login', studentLogin);

export default router;
