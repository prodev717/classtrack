import e from "express";
import { query } from "./db.js";

const app = e();
app.use(e.json());

app.get("/", (req, res) => {
    res.send("Backend server is running");
});

// Get all classrooms
app.get("/api/classrooms", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM classrooms");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a classroom
app.post("/api/classrooms", async (req, res) => {
    const { teacher_name, room_number, subject, time_slot } = req.body;
    try {
        const result = await query(
            "INSERT INTO classrooms (teacher_name, room_number, subject, time_slot) VALUES ($1, $2, $3, $4) RETURNING *",
            [teacher_name, room_number, subject, time_slot]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a student
app.post("/api/students", async (req, res) => {
    const { reg_no, name } = req.body;
    try {
        const result = await query(
            "INSERT INTO students (reg_no, name) VALUES ($1, $2) RETURNING *",
            [reg_no, name]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get attendance for a classroom
app.get("/api/classrooms/:id/attendance", async (req, res) => {
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
});

// IoT Device Endpoint - Logs specific student presence for a class
app.post("/api/attendance/iot", async (req, res) => {
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
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});