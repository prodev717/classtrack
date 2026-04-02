CREATE TABLE IF NOT EXISTS classrooms (
    id SERIAL PRIMARY KEY,
    teacher_name VARCHAR(255) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    time_slot VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    reg_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS classroom_students (
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (classroom_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    classroom_id INTEGER REFERENCES classrooms(id) ON DELETE CASCADE,
    reg_no VARCHAR(50) REFERENCES students(reg_no) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
