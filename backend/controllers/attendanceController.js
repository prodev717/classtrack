import { query } from "../db.js";

// Get attendance for a classroom
export const getClassroomAttendance = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            "SELECT * FROM attendance_records WHERE classroom_id = $1 ORDER BY timestamp DESC",
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// IoT Device Endpoint - Logs specific student presence for a class
export const logIotAttendance = async (req, res) => {
    const { classroomId, regNo } = req.body;

    if (!classroomId || !regNo) {
        return res.status(400).json({ error: "Missing classroomId or regNo" });
    }

    try {
        // Verify student exists (optional check, but good for data integrity)
        const studentCheck = await query("SELECT * FROM students WHERE reg_no = $1", [regNo]);
        if (studentCheck.rows.length === 0) {
            return res.status(404).json({ error: `Student with regNo ${regNo} not found` });
        }

        // Insert attendance record
        const result = await query(
            "INSERT INTO attendance_records (classroom_id, reg_no) VALUES ($1, $2) RETURNING *",
            [classroomId, regNo]
        );

        console.log(`[IoT] Attendance logged: Student ${regNo} in Classroom ${classroomId}`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("[IoT Error]", err.message);
        res.status(500).json({ error: err.message });
    }
};
