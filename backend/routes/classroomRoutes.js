import express from "express";
import { 
    getClassrooms, 
    createClassroom,
    getTeacherClassrooms,
    addStudentToClassroom,
    removeStudentFromClassroom,
    getClassroomStudents
} from "../controllers/classroomController.js";
import { getClassroomAttendance } from "../controllers/attendanceController.js";
import { authenticate, requireTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

// Publicly available or generically authenticated
router.get("/", authenticate, getClassrooms);

// Teacher-specific routes
router.get("/my-classes", authenticate, requireTeacher, getTeacherClassrooms);
router.post("/", authenticate, requireTeacher, createClassroom);

// Student list management for a classroom
router.get("/:id/students", authenticate, requireTeacher, getClassroomStudents);
router.post("/:id/students", authenticate, requireTeacher, addStudentToClassroom);
router.delete("/:id/students/:studentId", authenticate, requireTeacher, removeStudentFromClassroom);

// Attendance management for a classroom
router.get("/:id/attendance", authenticate, requireTeacher, getClassroomAttendance);

export default router;
