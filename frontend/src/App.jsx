import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Cpu, 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  BookOpen, 
  Clock,
  ChevronRight,
  TrendingUp,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity
} from 'lucide-react';
import axios from 'axios';

// --- API Configuration ---
const API_BASE = 'https://classtrack-six.vercel.app/api';

// --- Shared Components ---
const LoadingSpinner = () => (
  <div className="empty-state">
    <Loader2 className="animate-spin" size={48} color="var(--primary)" />
    <p style={{ marginTop: '1rem' }}>Loading data...</p>
  </div>
);

const Badge = ({ children, variant = 'success' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState('classrooms');
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Form States
  const [classForm, setClassForm] = useState({
    teacher_name: '',
    room_number: '',
    subject: '',
    time_slot: ''
  });
  const [studentForm, setStudentForm] = useState({
    reg_no: '',
    name: ''
  });
  const [iotForm, setIotForm] = useState({
    classroomId: '',
    regNo: ''
  });
  const [iotStatus, setIotStatus] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, studentRes] = await Promise.all([
        axios.get(`${API_BASE}/classrooms`),
        // Note: Students endpoint isn't fully implemented in backend yet, 
        // but we'll try to fetch it if it exists or fallback gracefully.
        axios.get(`${API_BASE}/students`).catch(() => ({ data: [] }))
      ]);
      setClassrooms(classRes.data);
      setStudents(studentRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/classrooms`, classForm);
      setShowClassModal(false);
      setClassForm({ teacher_name: '', room_number: '', subject: '', time_slot: '' });
      fetchData();
    } catch (err) {
      alert("Error creating classroom: " + err.message);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/students`, studentForm);
      setShowStudentModal(false);
      setStudentForm({ reg_no: '', name: '' });
      fetchData();
    } catch (err) {
      alert("Error creating student: " + err.message);
    }
  };

  const handleSimulateIoT = async (e) => {
    e.preventDefault();
    setIotStatus('loading');
    try {
      await axios.post(`${API_BASE}/attendance/iot`, {
        classroomId: parseInt(iotForm.classroomId),
        regNo: iotForm.regNo
      });
      setIotStatus('success');
      setTimeout(() => setIotStatus(null), 3000);
    } catch (err) {
      setIotStatus('error');
      alert("IoT Simulation Error: " + (err.response?.data?.error || err.message));
      setTimeout(() => setIotStatus(null), 3000);
    }
  };

  const viewAttendance = async (id) => {
    setSelectedClassId(id);
    setLoadingAttendance(true);
    try {
      const res = await axios.get(`${API_BASE}/classrooms/${id}/attendance`);
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Activity size={32} />
          <span>ClassTrack Pro</span>
        </div>
        <div className="stats" style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p className="label">Total Classes</p>
            <h3>{classrooms.length}</h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="label">Total Students</p>
            <h3>{students.length}</h3>
          </div>
        </div>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'classrooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('classrooms')}
        >
          <LayoutDashboard size={20} /> Classrooms
        </button>
        <button 
          className={`tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <Users size={20} /> Students
        </button>
        <button 
          className={`tab ${activeTab === 'iot' ? 'active' : ''}`}
          onClick={() => setActiveTab('iot')}
        >
          <Cpu size={20} /> IoT Simulator
        </button>
      </div>

      <main className="fade-in">
        {activeTab === 'classrooms' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Active Classrooms</h2>
              <button className="button" onClick={() => setShowClassModal(true)}>
                <Plus size={18} /> New Classroom
              </button>
            </div>

            {loading ? <LoadingSpinner /> : (
              <div className="grid">
                {classrooms.length === 0 ? (
                  <div className="card empty-state" style={{ gridColumn: '1 / -1' }}>
                    <p>No classrooms found. Create one to get started!</p>
                  </div>
                ) : classrooms.map(cls => (
                  <div key={cls.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <Badge variant="success">{cls.time_slot || 'N/A'}</Badge>
                      <MapPin size={16} color="var(--text-muted)" />
                    </div>
                    <h3 style={{ marginBottom: '0.5rem' }}>{cls.subject}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      <User size={14} /> {cls.teacher_name}
                      <span style={{ color: 'var(--border)' }}>|</span>
                      <MapPin size={14} /> Room {cls.room_number}
                    </div>
                    <button className="button button-outline" style={{ width: '100%' }} onClick={() => viewAttendance(cls.id)}>
                      View Attendance <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Student Records</h2>
              <button className="button" onClick={() => setShowStudentModal(true)}>
                <Plus size={18} /> Add Student
              </button>
            </div>

            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Registration No.</th>
                      <th>Name</th>
                      <th>Class Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center' }}>No students registered.</td>
                      </tr>
                    ) : students.map(s => (
                      <tr key={s.reg_no}>
                        <td><strong>{s.reg_no}</strong></td>
                        <td>{s.name}</td>
                        <td><Badge variant="warning">0 classes</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'iot' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Cpu size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h2>IoT Attendance Simulator</h2>
                <p className="label">Simulate a student scanning their ID at a classroom node.</p>
              </div>

              <form onSubmit={handleSimulateIoT}>
                <div className="form-group">
                  <label className="label">Select Classroom</label>
                  <select 
                    className="input"
                    value={iotForm.classroomId}
                    onChange={e => setIotForm({...iotForm, classroomId: e.target.value})}
                    required
                  >
                    <option value="">Choose a classroom...</option>
                    {classrooms.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.subject} ({cls.room_number})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Student Registration Number</label>
                  <input 
                    className="input"
                    placeholder="e.g. 22BCE1234"
                    value={iotForm.regNo}
                    onChange={e => setIotForm({...iotForm, regNo: e.target.value})}
                    required
                  />
                </div>
                <button type="submit" className="button" style={{ width: '100%', marginTop: '1rem' }} disabled={iotStatus === 'loading'}>
                  {iotStatus === 'loading' ? 'Processing...' : 'Send Log to Backend'}
                </button>
                
                {iotStatus === 'success' && (
                  <div style={{ marginTop: '1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} /> Attendance Logged Successfully!
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}
      {showClassModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>New Classroom</h3>
              <button onClick={() => setShowClassModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><XCircle /></button>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label className="label">Subject Name</label>
                <input className="input" placeholder="e.g. Embedded Systems" value={classForm.subject} onChange={e => setClassForm({...classForm, subject: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="label">Teacher Name</label>
                <input className="input" placeholder="Dr. Sajid" value={classForm.teacher_name} onChange={e => setClassForm({...classForm, teacher_name: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Room Number</label>
                  <input className="input" placeholder="SJ-401" value={classForm.room_number} onChange={e => setClassForm({...classForm, room_number: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="label">Time Slot</label>
                  <input className="input" placeholder="MWF 10-11" value={classForm.time_slot} onChange={e => setClassForm({...classForm, time_slot: e.target.value})} required />
                </div>
              </div>
              <button type="submit" className="button" style={{ width: '100%', marginTop: '1rem' }}>Create Classroom</button>
            </form>
          </div>
        </div>
      )}

      {showStudentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>Add Student</h3>
              <button onClick={() => setShowStudentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><XCircle /></button>
            </div>
            <form onSubmit={handleCreateStudent}>
              <div className="form-group">
                <label className="label">Registration Number</label>
                <input className="input" placeholder="22BCE1234" value={studentForm.reg_no} onChange={e => setStudentForm({...studentForm, reg_no: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="label">Full Name</label>
                <input className="input" placeholder="John Doe" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} required />
              </div>
              <button type="submit" className="button" style={{ width: '100%', marginTop: '1rem' }}>Add Student</button>
            </form>
          </div>
        </div>
      )}

      {selectedClassId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', position: 'sticky', top: 0, background: 'var(--bg-card)', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3>Attendance Records</h3>
                <p className="label">Class ID: {selectedClassId}</p>
              </div>
              <button onClick={() => setSelectedClassId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><XCircle /></button>
            </div>
            
            {loadingAttendance ? <LoadingSpinner /> : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Student Reg No.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center' }}>No logs for this class yet.</td>
                      </tr>
                    ) : attendance.map(log => (
                      <tr key={log.id}>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>{log.reg_no}</td>
                        <td><Badge variant="success">Present</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
