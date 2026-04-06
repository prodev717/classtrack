import express from "express";
import { 
    getStudents, 
    getEnrolledCourses,
    getAttendanceLogs,
    getAttendanceStats
} from "../controllers/studentController.js";
import { authenticate, requireStudent } from "../middleware/authMiddleware.js";

const router = express.Router();

// General authenticated routes
router.get("/", authenticate, getStudents);

// Student specific dashboard dashboard
router.get("/my-courses", authenticate, requireStudent, getEnrolledCourses);
router.get("/my-logs", authenticate, requireStudent, getAttendanceLogs);
router.get("/my-stats", authenticate, requireStudent, getAttendanceStats);

export default router;
