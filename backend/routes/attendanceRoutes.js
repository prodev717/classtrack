import express from "express";
import { logIotAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/iot", logIotAttendance);

export default router;
