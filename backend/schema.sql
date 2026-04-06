DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS classroom_students CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;

CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE classrooms (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    time_slot VARCHAR(100)
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    reg_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE classroom_students (
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (classroom_id, student_id)
);

CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    reg_no VARCHAR(50) REFERENCES students(reg_no) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
