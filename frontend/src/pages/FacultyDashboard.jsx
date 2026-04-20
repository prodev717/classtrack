import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { LayoutDashboard, BookOpen, Users, LogOut, X, Plus, Calendar, Settings, Clock, Check, Trash2, MapPin, User, ChevronRight, Edit2, Search, Download } from 'lucide-react';

const FacultyDashboard = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [classes, setClasses] = useState([]);
    const [courses, setCourses] = useState([]);
    const [venues, setVenues] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ studentIds: [] });

    // Attendance states
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [sessionRecords, setSessionRecords] = useState([]);
    const [classStats, setClassStats] = useState(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await api.get('/auth/me');
                if (res.data.data.role !== 'FACULTY') navigate('/');
                setUser(res.data.data);
            } catch (err) {
                navigate('/login');
            }
        };
        fetchMe();
    }, [navigate]);

    useEffect(() => {
        if (user) {
            fetchClasses();
            fetchInitialData();
        }
    }, [user]);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/faculty/classes');
            setClasses(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [coursesRes, venuesRes, studentsRes] = await Promise.all([
                api.get('/faculty/courses'),
                api.get('/faculty/venues'),
                api.get('/faculty/students')
            ]);
            setCourses(coursesRes.data.data);
            setVenues(venuesRes.data.data);
            setStudents(studentsRes.data.data);
        } catch (err) {
            console.error('Failed to fetch modal data', err);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleCreateOrUpdateClass = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (editingItem) {
                await api.put(`/faculty/classes/${editingItem.id}`, formData);
            } else {
                await api.post('/faculty/classes', formData);
            }
            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({ studentIds: [] });
            fetchClasses();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save class');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteClass = async (id) => {
        if (!window.confirm('Are you sure you want to delete this class? This cannot be undone.')) return;
        setProcessing(true);
        try {
            await api.delete(`/faculty/classes/${id}`);
            fetchClasses();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete class');
        } finally {
            setProcessing(false);
        }
    };

    const handleEndClass = async (id) => {
        if (!window.confirm('Are you sure you want to end this class? This indicates the end of the semester for this course.')) return;
        setProcessing(true);
        try {
            await api.patch(`/faculty/classes/${id}/end`);
            fetchClasses();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to end class');
        } finally {
            setProcessing(false);
        }
    };

    const openEdit = (c) => {
        setEditingItem(c);
        setFormData({
            courseId: c.courseId,
            venueId: c.venueId,
            studentIds: c.students?.map(s => s.userId) || [],
            status: c.status
        });
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingItem(null);
        setFormData({ studentIds: [] });
        setIsModalOpen(true);
    };

    const toggleStudent = (id) => {
        const currentIds = [...formData.studentIds];
        if (currentIds.includes(id)) {
            setFormData({ ...formData, studentIds: currentIds.filter(i => i !== id) });
        } else {
            setFormData({ ...formData, studentIds: [...currentIds, id] });
        }
    };

    // --- ATTENDANCE ACTIONS ---

    const fetchClassStats = async (classId) => {
        try {
            const res = await api.get(`/attendance/faculty/class/${classId}/stats`);
            setClassStats(res.data.data);
        } catch (err) {
            console.error('Failed to fetch class stats', err);
        }
    };

    const fetchSessions = async (classId) => {
        setAttendanceLoading(true);
        setActiveTab('sessions');
        try {
            const res = await api.get(`/attendance/classes/${classId}/sessions`);
            setSessions(res.data.data);
            const cls = classes.find(c => c.id === classId);
            setSelectedClass(cls);
            fetchClassStats(classId);
        } catch (err) {
            console.error(err);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const fetchSessionRecords = async (sessionId) => {
        setAttendanceLoading(true);
        setActiveTab('session_records');
        try {
            const res = await api.get(`/attendance/sessions/${sessionId}/records`);
            setSessionRecords(res.data.data);
            setSelectedSession(res.data.session);
        } catch (err) {
            console.error(err);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const toggleAttendanceManual = async (student) => {
        setProcessing(true);
        try {
            if (student.present) {
                await api.delete(`/attendance/records/${student.recordId}`);
            } else {
                await api.post('/attendance/records', {
                    sessionId: selectedSession.id,
                    userId: student.userId
                });
            }
            fetchSessionRecords(selectedSession.id);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update attendance');
        } finally {
            setProcessing(false);
        }
    };

    const downloadAttendanceReport = async () => {
        if (!selectedClass) return;
        setProcessing(true);
        try {
            const res = await api.get(`/attendance/classes/${selectedClass.id}/report`);
            const { data, columns } = res.data;
            
            // Generate CSV
            const header = columns.join(',');
            const rows = data.map(row => 
                columns.map(col => `"${row[col] || ''}"`).join(',')
            );
            const csvContent = [header, ...rows].join('\n');
            
            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${selectedClass.course?.courseCode}_Attendance_Report.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error(err);
            alert('Failed to generate report');
        } finally {
            setProcessing(false);
        }
    };

    const renderTimetable = () => {
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        
        // Flatten all slots from all classes
        const allSlots = classes.flatMap(c => 
            c.course?.slots?.map(slot => ({
                ...slot,
                courseName: c.course.courseName,
                courseCode: c.course.courseCode,
                venue: `${c.venue?.block}-${c.venue?.room}`,
                status: c.status
            })) || []
        );

        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    {days.map(day => (
                        <div key={day} className="space-y-4">
                            <div className="bg-indigo-600 text-white p-4 rounded-2xl text-center font-black shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs">
                                {day}
                            </div>
                            <div className="space-y-3">
                                {allSlots.filter(s => s.dayOfWeek === day)
                                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                                    .map((slot, idx) => (
                                        <div key={idx} className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${slot.status === 'COMPLETED' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-indigo-100 shadow-sm hover:shadow-md'}`}>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">{formatTime(slot.startTime)}</p>
                                            <h6 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">{slot.courseName}</h6>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[9px] font-black text-slate-400 uppercase">{slot.venue}</span>
                                                <span className="text-[8px] font-bold bg-slate-100 px-1.5 py-0.5 rounded uppercase text-slate-500">{slot.slotName}</span>
                                            </div>
                                        </div>
                                    ))}
                                {allSlots.filter(s => s.dayOfWeek === day).length === 0 && (
                                    <div className="py-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                                        No Classes
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (!user) return null;

    const renderDashboard = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Ongoing Classes</p>
                        <p className="text-2xl font-bold">{classes.filter(c => c.status === 'ONGOING').length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm">Faculty ID</p>
                        <p className="text-2xl font-bold">{user.faculty?.employeeId}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div className="flex justify-between items-center mb-8">
                    <h4 className="text-xl font-black text-slate-800">My Classes</h4>
                    <button
                        onClick={openCreate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-100"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Class
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : classes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <LayoutDashboard className="w-16 h-16 mb-4 opacity-20" />
                        <p>No classes created yet. Click "Create New Class" to start.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {classes.map(c => (
                            <div key={c.id} className="bg-slate-50 rounded-[28px] p-6 border border-slate-200 hover:border-indigo-300 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition duration-1000">
                                    <BookOpen className="w-32 h-32" />
                                </div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                                            <BookOpen className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(c)} className="p-2 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 shadow-sm border border-indigo-100 transition"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteClass(c.id)} className="p-2 bg-white text-red-600 rounded-xl hover:bg-red-50 shadow-sm border border-red-100 transition"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block">
                                                {c.course?.courseCode}
                                            </span>
                                            {c.status === 'COMPLETED' ? (
                                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Completed
                                                </span>
                                            ) : (
                                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block">
                                                    Ongoing
                                                </span>
                                            )}
                                        </div>
                                        <h5 className="text-xl font-black text-slate-800 mb-1">{c.course?.courseName}</h5>
                                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                                            <MapPin className="w-4 h-4" />
                                            <span>{c.venue?.block} - {c.venue?.room}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {c.course?.slots?.map(slot => (
                                            <div key={slot.id} className="bg-white border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                                <span className="text-[9px] font-black text-indigo-600 uppercase leading-none">{slot.dayOfWeek}</span>
                                                <span className="text-[10px] font-bold text-slate-600">{formatTime(slot.startTime)}</span>
                                                <span className="text-[8px] font-black bg-slate-100 px-1 rounded text-slate-400 border border-slate-200 ml-0.5">{slot.slotName}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <span className="font-bold text-slate-700">{c.students?.length} Students</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => fetchSessions(c.id)}
                                                className="text-indigo-600 font-black text-sm hover:underline"
                                            >
                                                View Attendance →
                                            </button>
                                            {c.status === 'ONGOING' && (
                                                <button
                                                    onClick={() => handleEndClass(c.id)}
                                                    className="bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-700 px-3 py-1 rounded-lg text-[10px] font-black transition-colors"
                                                >
                                                    End Semester
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderCoursesSlots = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h4 className="text-2xl font-black text-slate-800">Course Schedule</h4>
                    <p className="text-slate-500 font-medium">View all courses and their assigned time slots</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {courses.length === 0 ? (
                    <div className="py-20 text-center text-slate-400">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>No courses found in the system.</p>
                    </div>
                ) : (
                    courses.map(course => (
                        <div key={course.id} className="group bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-3xl p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                                        <BookOpen className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-md tracking-wider">
                                                {course.courseCode}
                                            </span>
                                        </div>
                                        <h5 className="text-xl font-bold text-slate-800">{course.courseName}</h5>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {course.slots && course.slots.length > 0 ? (
                                        course.slots.map(slot => (
                                            <div key={slot.id} className="bg-white border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm hover:border-indigo-300 transition-colors">
                                                <div className="bg-slate-100 p-1.5 rounded-lg text-indigo-600">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter leading-none">{slot.dayOfWeek}</p>
                                                    <p className="text-xs font-bold text-slate-700">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</p>
                                                </div>
                                                <div className="ml-2 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-[10px] font-black text-slate-400">
                                                    {slot.slotName}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-slate-400 italic text-sm">No slots assigned yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderSessions = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="text-2xl font-black text-slate-800">Attendance Sessions</h4>
                    <p className="text-slate-500 font-medium">History for {selectedClass?.course?.courseName}</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={downloadAttendanceReport} 
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 flex items-center gap-2 transition"
                    >
                        <Download className="w-5 h-5" />
                        Download Report (.csv)
                    </button>
                    <button onClick={() => setActiveTab('dashboard')} className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
                        ← Back to Classes
                    </button>
                </div>
            </div>

            {classStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className={`${classStats.averageAttendance < 75 ? 'bg-red-500' : 'bg-indigo-600'} p-8 rounded-[32px] text-white shadow-xl`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Avg Attendance</p>
                        <h3 className="text-4xl font-black">{classStats.averageAttendance}%</h3>
                        <p className="text-[9px] font-bold mt-2 opacity-80 uppercase">{classStats.averageAttendance < 75 ? 'Critical: Below 75%' : 'Meeting Target'}</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Students</p>
                        <p className="text-3xl font-black text-slate-800">{classStats.totalStudents}</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sessions Held</p>
                        <p className="text-3xl font-black text-slate-800">{classStats.totalSessions}</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-200 overflow-hidden relative">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance Trend</p>
                        <div className="flex items-end gap-1 h-12 mt-2">
                            {classStats.trend.map((s, i) => (
                                <div 
                                    key={i} 
                                    className={`w-full ${s.percentage < 75 ? 'bg-red-200 hover:bg-red-500' : 'bg-indigo-200 hover:bg-indigo-600'} rounded-t transition-colors cursor-pointer relative group`}
                                    style={{ height: `${s.percentage}%` }}
                                >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap mb-1 z-20">
                                        {s.percentage.toFixed(0)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {attendanceLoading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic">No attendance sessions recorded yet for this class.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map(s => (
                        <div key={s.id} onClick={() => fetchSessionRecords(s.id)} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-indigo-300 transition group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-white p-2 rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${s.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                                        s.status === 'AUTO_CLOSED' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-200 text-slate-600'
                                    }`}>
                                    {s.status}
                                </span>
                            </div>
                            <h5 className="font-bold text-slate-800">{new Date(s.date).toLocaleDateString()}</h5>
                            <p className="text-xs text-slate-500 mb-4">{formatTime(s.startTime)} - {s.endTime ? formatTime(s.endTime) : '---'}</p>
                            <div className="bg-white rounded-xl p-3 border border-slate-200 flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-600">Present</span>
                                <span className="font-black text-indigo-600">{s._count?.records || 0} Students</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderSessionRecords = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="text-2xl font-black text-slate-800">Session Attendance</h4>
                    <p className="text-slate-500 font-medium">{new Date(selectedSession?.date).toLocaleDateString()} • {selectedSession?.class?.course?.courseName}</p>
                </div>
                <button onClick={() => fetchSessions(selectedSession?.classId)} className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
                    ← Back to Sessions
                </button>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Student Name</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Reg Number</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {sessionRecords.map(s => (
                            <tr key={s.userId} className="hover:bg-white transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                                            {s.name?.charAt(0)}
                                        </div>
                                        <span className="font-bold text-slate-800">{s.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-600">{s.regNumber}</td>
                                <td className="px-6 py-4">
                                    {s.present ? (
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex w-fit items-center gap-1">
                                            <Check className="w-3 h-3" /> Present
                                        </span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex w-fit items-center gap-1">
                                            <X className="w-3 h-3" /> Absent
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => toggleAttendanceManual(s)}
                                        disabled={processing}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition shadow-sm ${s.present
                                                ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                    >
                                        {s.present ? 'Mark Absent' : 'Mark Present'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <div className="w-72 bg-indigo-950 text-white flex flex-col shrink-0 sticky top-0 h-screen shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-white/5">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <div className="bg-white/10 p-2 rounded-xl">
                            <BookOpen className="w-6 h-6 text-indigo-300" />
                        </div>
                        ClassTrack
                    </h2>
                    <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ml-12">Faculty</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-8">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'timetable', label: 'Timetable', icon: Calendar },
                        { id: 'courses_slots', label: 'Course Slots', icon: BookOpen },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${activeTab === item.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 translate-x-2'
                                : 'text-indigo-300/60 hover:bg-white/5 hover:text-indigo-200'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/5">
                    <div className="bg-white/5 p-4 rounded-2xl mb-4 border border-white/5">
                        <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Logged in as</p>
                        <p className="text-sm font-bold truncate">{user.name}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-6 py-4 w-full hover:bg-red-500/10 text-red-300 rounded-2xl font-bold transition"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-auto">
                <header className="h-24 bg-white/50 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-12 sticky top-0 z-10">
                    <h3 className="text-2xl font-black text-slate-800 capitalize tracking-tight">{activeTab}</h3>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-black text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{user.faculty?.department}</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center text-white font-black text-lg">
                            {user.name?.charAt(0)}
                        </div>
                    </div>
                </header>

                <main className="p-12 max-w-7xl mx-auto w-full">
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'timetable' && renderTimetable()}
                    {activeTab === 'courses_slots' && renderCoursesSlots()}
                    {activeTab === 'sessions' && renderSessions()}
                    {activeTab === 'session_records' && renderSessionRecords()}
                </main>
            </div>

            {/* Create/Edit Class Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-2xl font-black text-slate-800">{editingItem ? 'Edit Class' : 'Create New Class'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleCreateOrUpdateClass} className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-3 px-1">Select Course</label>
                                    <select
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition"
                                        value={formData.courseId || ''}
                                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a course</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.courseName} ({c.courseCode})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-3 px-1">Class Status</label>
                                    <select
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition"
                                        value={formData.status || 'ONGOING'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        required
                                    >
                                        <option value="ONGOING">Ongoing</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-3 px-1">Select Venue</label>
                                <select
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition"
                                    value={formData.venueId || ''}
                                    onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                                    required
                                >
                                    <option value="">Choose a venue</option>
                                    {venues.map(v => <option key={v.id} value={v.id}>{v.block} - {v.room}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-3 px-1 flex justify-between">
                                    <span>Select Students</span>
                                    <span className="text-indigo-600 italic font-medium">{formData.studentIds.length} Selected</span>
                                </label>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-200">
                                        {students.map(s => (
                                            <div
                                                key={s.userId}
                                                onClick={() => toggleStudent(s.userId)}
                                                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-white transition ${formData.studentIds.includes(s.userId) ? 'bg-indigo-50 hover:bg-indigo-50' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${formData.studentIds.includes(s.userId) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                        {s.user?.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{s.user?.name}</p>
                                                        <p className="text-xs text-slate-500">{s.regNumber} • {s.department}</p>
                                                    </div>
                                                </div>
                                                {formData.studentIds.includes(s.userId) && (
                                                    <Check className="w-5 h-5 text-indigo-600" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-[20px] transition">Cancel</button>
                                <button type="submit" disabled={processing} className={`flex-[2] px-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[20px] shadow-2xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 ${processing ? 'opacity-70 cursor-not-allowed text-indigo-100' : 'active:scale-95'}`}>
                                    {processing && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    {processing ? 'Processing...' : editingItem ? 'Update Class' : 'Create Class Instance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyDashboard;
