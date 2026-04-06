import { query } from "../db.js";

// Get all students (potentially for a teacher to add to a class)
export const getStudents = async (req, res) => {
    try {
        const { rows } = await query("SELECT id, reg_no, name FROM students ORDER BY name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Student Dashboard: get enrolled courses
export const getEnrolledCourses = async (req, res) => {
    try {
        const studentRegNo = req.user.reg_no;
        const studentRes = await query("SELECT id FROM students WHERE reg_no = $1", [studentRegNo]);
        if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
        const studentId = studentRes.rows[0].id;

        const { rows } = await query(
            `SELECT c.* 
             FROM classrooms c 
             JOIN classroom_students cs ON c.id = cs.classroom_id 
             WHERE cs.student_id = $1`,
            [studentId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Student Dashboard: get biometric/attendance logs
export const getAttendanceLogs = async (req, res) => {
    try {
        const studentRegNo = req.user.reg_no;
        const { rows } = await query(
            `SELECT a.*, c.subject, c.room_number 
             FROM attendance_records a 
             JOIN classrooms c ON a.classroom_id = c.id 
             WHERE a.reg_no = $1 
             ORDER BY a.timestamp DESC`,
            [studentRegNo]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Student Dashboard: get attendance percentage & stats for graphs
export const getAttendanceStats = async (req, res) => {
    try {
        const studentRegNo = req.user.reg_no;
        const studentRes = await query("SELECT id FROM students WHERE reg_no = $1", [studentRegNo]);
        if (studentRes.rows.length === 0) return res.status(404).json({ error: "Student not found" });
        const studentId = studentRes.rows[0].id;

        // For each enrolled class, count total sessions and attended sessions
        // For simplicity right now, a session could be distinct timestamps, 
        // but typically it means either the teacher created "sessions" or we count distinct days.
        // Let's provide basic attendance count for now.
        const statsRes = await query(
            `SELECT 
                c.id as classroom_id, 
                c.subject, 
                COUNT(a.id) as attended_classes
             FROM classrooms c
             JOIN classroom_students cs ON c.id = cs.classroom_id
             LEFT JOIN attendance_records a ON a.classroom_id = c.id AND a.reg_no = $1
             WHERE cs.student_id = $2
             GROUP BY c.id, c.subject`,
             [studentRegNo, studentId]
        );

        res.json(statsRes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
