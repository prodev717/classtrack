# ClassTrack: Classroom Attendance Management System

ClassTrack is an IoT-based classroom attendance management system. This project consists of a Node.js/Express backend and a React frontend to manage classrooms, student enrollments, and attendance records.

## Project Structure
- `/backend`: Node.js Express server with PostgreSQL (Neon DB).
- `/frontend`: React + Vite application for the user interface.

## Getting Started

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your database URL:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   PORT=5000
   ```
4. Initialize the database schema:
   ```bash
   node init-db.js
   ```
5. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## API Documentation

The backend server runs on `http://localhost:5000` by default. All API endpoints are prefixed with `/api`.

### Classrooms

#### GET `/api/classrooms`
Fetch all classrooms.
- **Response**: `200 OK` - Array of classroom objects.

#### POST `/api/classrooms`
Create a new classroom.
- **Body**:
  ```json
  {
    "teacher_name": "string",
    "room_number": "string",
    "subject": "string",
    "time_slot": "string"
  }
  ```
- **Response**: `201 Created` - The created classroom object.

### Students

#### GET `/api/students`
Fetch all students, ordered by name.
- **Response**: `200 OK` - Array of student objects.

#### POST `/api/students`
Add a new student to the system.
- **Body**:
  ```json
  {
    "reg_no": "string",
    "name": "string"
  }
  ```
- **Response**: `201 Created` - The created student object.

### Attendance

#### GET `/api/classrooms/:id/attendance`
Fetch attendance records for a specific classroom.
- **Parameters**: `id` (Classroom ID)
- **Response**: `200 OK` - Array of attendance records.

#### POST `/api/attendance/iot` (IoT Endpoint)
Endpoint for IoT devices to log student presence.
- **Body**:
  ```json
  {
    "classroomId": "number",
    "regNo": "string"
  }
  ```
- **Response**: `201 Created` - The logged attendance record.

---

## Database Schema

The system uses the following tables:
- `classrooms`: Details about classes.
- `students`: Central student registry.
- `classroom_students`: **Many-to-Many mapping** for student enrollment in specific classes.
- `attendance_records`: Logs of student arrivals/presence.
