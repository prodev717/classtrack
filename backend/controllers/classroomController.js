import { query } from "../db.js";

// Get all classrooms (useful if we want to list all, maybe restricted later)
export const getClassrooms = async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM classrooms");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get classrooms for the logged-in teacher
export const getTeacherClassrooms = async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM classrooms WHERE teacher_id = $1", [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create a classroom
export const createClassroom = async (req, res) => {
    const { room_number, subject, time_slot } = req.body;
    try {
        const result = await query(
            "INSERT INTO classrooms (teacher_id, room_number, subject, time_slot) VALUES ($1, $2, $3, $4) RETURNING *",
            [req.user.id, room_number, subject, time_slot]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get students for a specific classroom
export const getClassroomStudents = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await query(
            `SELECT s.id, s.reg_no, s.name 
             FROM students s 
             JOIN classroom_students cs ON s.id = cs.student_id 
             WHERE cs.classroom_id = $1`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Add student(s) to classroom
export const addStudentToClassroom = async (req, res) => {
    const { id } = req.params;
    const { student_id } = req.body; // Can be enhanced to accept an array of IDs
    try {
        const result = await query(
            "INSERT INTO classroom_students (classroom_id, student_id) VALUES ($1, $2) RETURNING *",
            [id, student_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Remove a student from classroom
export const removeStudentFromClassroom = async (req, res) => {
    const { id, studentId } = req.params;
    try {
        await query(
            "DELETE FROM classroom_students WHERE classroom_id = $1 AND student_id = $2",
            [id, studentId]
        );
        res.status(200).json({ message: "Student removed from classroom" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
