import React, { useState, useEffect } from 'react';
import { Activity, MapPin, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';

const StudentDashboard = () => {
  const { user, logout: onLogout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const [courseRes, logsRes] = await Promise.all([
          axios.get(`${API_BASE}/students/my-courses`),
          axios.get(`${API_BASE}/students/my-logs`)
        ]);
        setCourses(courseRes.data);
        setLogs(logsRes.data);
      } catch (err) {
        console.error("Error fetching student data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Activity size={32} />
          <span>ClassTrack Pro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div className="stats" style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p className="label">Enrolled</p>
              <h3>{courses.length} courses</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="label">Attendance</p>
              <h3>{logs.length} logs</h3>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p className="label" style={{ marginBottom: 0 }}>Student</p>
              <strong style={{ fontSize: '0.875rem' }}>{user?.name} ({user?.reg_no})</strong>
            </div>
            <button className="button button-outline" onClick={onLogout} style={{ padding: '0.5rem 1rem' }}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h2>My Enrolled Courses</h2>
        </div>
        
        {loading ? <LoadingSpinner /> : (
          <div className="grid">
            {courses.length === 0 ? (
              <div className="card empty-state" style={{ gridColumn: '1 / -1' }}>
                <p>Not enrolled in any tracking courses yet.</p>
              </div>
            ) : courses.map(cls => (
              <div key={cls.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <Badge variant="success">{cls.time_slot || 'N/A'}</Badge>
                  <MapPin size={16} color="var(--text-muted)" />
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>{cls.subject}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  <User size={14} /> {cls.teacher_name}
                  <span style={{ color: 'var(--border)' }}>|</span>
                  <MapPin size={14} /> Room {cls.room_number}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>
          <h2>Recent Attendance Logs</h2>
        </div>
        
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center' }}>No attendance logs found.</td>
                  </tr>
                ) : logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.subject} (Room {log.room_number})</td>
                    <td><Badge variant="success">Present</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
