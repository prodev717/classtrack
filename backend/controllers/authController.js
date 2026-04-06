import { query } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export const teacherRegister = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await query(
            "INSERT INTO teachers (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
            [name, email, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const teacherLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await query("SELECT * FROM teachers WHERE email = $1", [email]);
        const teacher = result.rows[0];
        if (!teacher) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: teacher.id, role: "teacher" }, JWT_SECRET, { expiresIn: "1d" });
        res.json({ token, user: { id: teacher.id, name: teacher.name, email: teacher.email, role: "teacher" } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const studentRegister = async (req, res) => {
    const { name, reg_no, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await query(
            "INSERT INTO students (name, reg_no, password) VALUES ($1, $2, $3) RETURNING id, name, reg_no",
            [name, reg_no, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const studentLogin = async (req, res) => {
    const { reg_no, password } = req.body;
    try {
        const result = await query("SELECT * FROM students WHERE reg_no = $1", [reg_no]);
        const student = result.rows[0];
        if (!student) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: student.id, reg_no: student.reg_no, role: "student" }, JWT_SECRET, { expiresIn: "1d" });
        res.json({ token, user: { id: student.id, name: student.name, reg_no: student.reg_no, role: "student" } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
