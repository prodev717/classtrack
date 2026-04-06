import e from "express";
import cors from "cors";
import classroomRoutes from "./routes/classroomRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = e();
app.use(cors());
app.use(e.json());

app.get("/", (req, res) => {
    res.send("Backend server is running");
});

// Routes
app.use("/api/classrooms", classroomRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});