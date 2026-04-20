import React, { useEffect, useState } from 'react';
import { domToPng } from 'modern-screenshot';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { User, LogOut, CheckCircle, Clock, BookOpen, Mail, MapPin, Calendar, AlertCircle, X } from 'lucide-react';

const StudentDashboard = () => {
    const [user, setUser] = useState(null);
    const [enrolledClasses, setEnrolledClasses] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [activeTab, setActiveTab] = useState('courses');
    const [loading, setLoading] = useState(true);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [selectedCourseAttendance, setSelectedCourseAttendance] = useState(null);
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [courseSessionsLoading, setCourseSessionsLoading] = useState(false);
    const navigate = useNavigate();

    const downloadTimetable = async () => {
        const element = document.getElementById('timetable-container');
        if (!element) return;
        try {
            const dataUrl = await domToPng(element, { 
                backgroundColor: '#f8fafc',
                scale: 2,
                quality: 1
            });
            const link = document.createElement('a');
            link.download = 'student_timetable.png';
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download timetable', err);
        }
    };

    const openCourseAttendance = async (course, percentage) => {
        setIsCourseModalOpen(true);
        setCourseSessionsLoading(true);
        setSelectedCourseAttendance({ course, percentage, sessions: [] });
        try {
            const res = await api.get(`/attendance/classes/${course.id}/sessions`);
            const sessions = res.data.data;
            const mappedSessions = sessions.map(s => {
                const isPresent = attendanceRecords.some(r => r.sessionId === s.id);
                return { ...s, isPresent };
            });
            setSelectedCourseAttendance({ course, percentage, sessions: mappedSessions });
        } catch (err) {
            console.error(err);
        } finally {
            setCourseSessionsLoading(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await api.get('/auth/me');
                if (res.data.data.role !== 'STUDENT') navigate('/');
                setUser(res.data.data);
            } catch (err) {
                navigate('/login');
            }
        };
        fetchMe();
    }, [navigate]);

    useEffect(() => {
        if (user) {
            fetchEnrolledClasses();
            fetchAttendance();
        }
    }, [user]);

    const fetchEnrolledClasses = async () => {
        setLoading(true);
        try {
            const classRes = await api.get('/student/classes');
            setEnrolledClasses(classRes.data.data);
            
            const statsRes = await api.get('/attendance/student/stats');
            setStats(statsRes.data.data);
        } catch (err) {
            console.error('Failed to fetch classes', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendance = async () => {
        setRecordsLoading(true);
        try {
            const res = await api.get(`/attendance/my-records?userId=${user.id}`);
            setAttendanceRecords(res.data.data);
        } catch (err) {
            console.error('Failed to fetch attendance', err);
        } finally {
            setRecordsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-indigo-600 text-white px-8 h-20 flex items-center justify-between shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white italic">ClassTrack</h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                        <p className="font-bold">{user.name}</p>
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">{user.student?.regNumber}</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition group"
                    >
                        <LogOut className="w-5 h-5 text-white group-hover:translate-x-0.5 transition" />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 relative z-20">
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition duration-500">
                            <CheckCircle className="w-24 h-24" />
                        </div>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Total Enrolled</p>
                        <p className="text-4xl font-black text-indigo-600">{enrolledClasses.length}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Registration No</p>
                        <p className="text-2xl font-black text-slate-800">{user.student?.regNumber}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">Department</p>
                        <p className="text-2xl font-black text-slate-800">{user.student?.department}</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="bg-white p-8 sm:p-10 rounded-[40px] shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col lg:flex-row items-center gap-8 lg:gap-10 relative z-20 mb-12">
                    <div className="w-40 h-40 bg-indigo-50 rounded-[40px] flex items-center justify-center text-indigo-600 border-4 border-white shadow-2xl relative">
                         <User className="w-24 h-24 stroke-[1]" />
                         <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-8 h-8 rounded-full border-4 border-white"></div>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 mb-1">{user.name}</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">Active Student Portal • {user.student?.department}</p>
                        </div>
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-slate-600">
                                <Mail className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm font-medium">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Calendar className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm font-medium">Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10 w-full">
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-indigo-100 border border-slate-50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Overall Attendance</p>
                            <div className="flex items-end gap-2">
                                <span className={`text-4xl font-black ${stats.overall.percentage < 75 ? 'text-red-500' : 'text-indigo-600'}`}>
                                    {stats.overall.percentage}%
                                </span>
                                <span className="text-xs font-bold text-slate-400 mb-1">/ 100%</span>
                            </div>
                            <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-1000 ${stats.overall.percentage < 75 ? 'bg-red-500' : 'bg-indigo-600'}`}
                                    style={{ width: `${stats.overall.percentage}%` }}
                                ></div>
                            </div>
                            {stats.overall.percentage < 75 && (
                                <p className="text-[9px] font-black text-red-500 mt-2 uppercase animate-pulse">Critical: Below 75%</p>
                            )}
                        </div>
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-indigo-100 border border-slate-50 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Classes</p>
                            <p className="text-3xl font-black text-slate-800">{stats.classWise.length}</p>
                        </div>
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-indigo-100 border border-slate-50 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attended</p>
                            <p className="text-3xl font-black text-emerald-600">{stats.overall.attended} <span className="text-sm text-slate-300">Sessions</span></p>
                        </div>
                        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-indigo-100 border border-slate-50 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sessions</p>
                            <p className="text-3xl font-black text-slate-800">{stats.overall.total}</p>
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex overflow-x-auto gap-2 sm:gap-4 border-b border-slate-200 pb-1 scrollbar-hide">
                    <button 
                        onClick={() => setActiveTab('courses')}
                        className={`px-4 sm:px-6 py-4 font-black transition-all border-b-4 whitespace-nowrap ${activeTab === 'courses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        My Courses
                    </button>
                    <button 
                        onClick={() => setActiveTab('attendance')}
                        className={`px-4 sm:px-6 py-4 font-black transition-all border-b-4 whitespace-nowrap ${activeTab === 'attendance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Attendance History
                    </button>
                    <button 
                        onClick={() => setActiveTab('timetable')}
                        className={`px-4 sm:px-6 py-4 font-black transition-all border-b-4 whitespace-nowrap ${activeTab === 'timetable' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Timetable
                    </button>
                </div>

                {/* Content Section */}
                {activeTab === 'courses' ? (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-slate-800 px-2 tracking-tight">My Enrolled Classes</h3>
                    
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : enrolledClasses.length === 0 ? (
                        <div className="bg-white rounded-[32px] p-6 border border-slate-100 flex flex-col items-center justify-center py-24 text-slate-300 italic">
                            <Clock className="w-16 h-16 mb-4 opacity-10" />
                            <p>You are not enrolled in any classes yet.</p>
                            <p className="text-sm mt-2 font-mono">RFID Tag ID: {user.rfid}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {enrolledClasses.map(c => (
                                <div key={c.id} className="bg-white rounded-[32px] p-8 border border-slate-100 hover:border-indigo-300 transition-all shadow-sm hover:shadow-indigo-100 group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition duration-1000">
                                        <BookOpen className="w-24 h-24" />
                                    </div>
                                    
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                <BookOpen className="w-6 h-6" />
                                            </div>
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                {c.course?.courseCode}
                                            </span>
                                        </div>

                                        <h4 className="text-xl font-black text-slate-800 mb-2 truncate">{c.course?.courseName}</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                                <User className="w-4 h-4 text-indigo-400" />
                                                <span>Prof. {c.faculty?.user?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                                <MapPin className="w-4 h-4 text-indigo-400" />
                                                <span>{c.venue?.block} - {c.venue?.room}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-4">
                                            {c.course?.slots?.map(slot => (
                                                <div key={slot.id} className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                                    <span className="text-[9px] font-black text-indigo-600 uppercase leading-none">{slot.dayOfWeek}</span>
                                                    <span className="text-[10px] font-bold text-slate-500">{formatTime(slot.startTime)}</span>
                                                    <span className="text-[8px] font-black bg-white px-1 rounded text-slate-400 border border-slate-200 ml-0.5">{slot.slotName}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Attendance</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-lg font-black ${
                                                        (stats?.classWise?.find(s => s.classId === c.id)?.percentage || 0) < 75 
                                                        ? 'text-red-500' 
                                                        : 'text-indigo-600'
                                                    }`}>
                                                        {stats?.classWise?.find(s => s.classId === c.id)?.percentage || 0}%
                                                    </span>
                                                    { (stats?.classWise?.find(s => s.classId === c.id)?.percentage || 0) < 75 && (
                                                        <span className="bg-red-50 text-red-500 p-1 rounded-md">
                                                            <AlertCircle className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 ${c.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'} rounded-full`}></div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {c.status === 'COMPLETED' ? 'Semester Ended' : 'Active Class'}
                                                    </span>
                                                </div>
                                                <button onClick={() => openCourseAttendance(c, stats?.classWise?.find(s => s.classId === c.id)?.percentage || 0)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition focus:outline-none">
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                ) : activeTab === 'attendance' ? (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-slate-800 px-2 tracking-tight">Attendance Log</h3>
                        
                        {recordsLoading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : attendanceRecords.length === 0 ? (
                            <div className="bg-white rounded-[32px] p-24 border border-slate-100 flex flex-col items-center justify-center text-slate-300 italic">
                                <CheckCircle className="w-16 h-16 mb-4 opacity-10" />
                                <p>No attendance records found.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Faculty</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {attendanceRecords.map(record => (
                                            <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                                            <BookOpen className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{record.session?.class?.course?.courseName}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase">{record.session?.class?.course?.courseCode}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="font-bold text-slate-700">{new Date(record.timestamp).toLocaleDateString()}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-slate-300" />
                                                        <span className="text-sm font-bold text-slate-600">Prof. {record.session?.class?.faculty?.user?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                                        Present
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Weekly Timetable</h3>
                            <button onClick={downloadTimetable} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-indigo-200">
                                Download Image
                            </button>
                        </div>
                        <div id="timetable-container" className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => {
                                const daySlots = enrolledClasses.flatMap(c => 
                                    c.course?.slots?.filter(s => s.dayOfWeek === day).map(s => ({
                                        ...s,
                                        courseName: c.course.courseName,
                                        venue: `${c.venue?.block}-${c.venue?.room}`,
                                        faculty: c.faculty?.user?.name
                                    })) || []
                                ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

                                return (
                                    <div key={day} className="space-y-4">
                                        <div className="bg-indigo-600 text-white p-3 rounded-xl text-center font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100">
                                            {day}
                                        </div>
                                        <div className="space-y-3">
                                            {daySlots.map((slot, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
                                                    <p className="text-[9px] font-black text-indigo-400 uppercase leading-none mb-1">{formatTime(slot.startTime)}</p>
                                                    <h6 className="text-[10px] font-black text-slate-800 line-clamp-1 leading-tight">{slot.courseName}</h6>
                                                    <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{slot.venue}</p>
                                                    <p className="text-[8px] font-medium text-slate-400 italic">Prof. {slot.faculty}</p>
                                                </div>
                                            ))}
                                            {daySlots.length === 0 && (
                                                <div className="py-8 text-center text-[9px] font-bold text-slate-200 uppercase italic">
                                                    Free Day
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Attendance Details Modal */}
            {isCourseModalOpen && selectedCourseAttendance && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h3 className="text-2xl font-black text-slate-800">{selectedCourseAttendance.course.course.courseName}</h3>
                            <button onClick={() => setIsCourseModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
                            {courseSessionsLoading ? (
                                <div className="flex justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Graph Section */}
                                    <div className="bg-white p-8 rounded-2xl border border-slate-100 flex flex-col items-center justify-center shadow-sm">
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Attendance Overview</p>
                                        <div className="relative w-48 h-48 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                {/* Background circle */}
                                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                                                {/* Progress circle */}
                                                <circle 
                                                    cx="50" 
                                                    cy="50" 
                                                    r="40" 
                                                    fill="transparent" 
                                                    stroke={selectedCourseAttendance.percentage < 75 ? '#ef4444' : '#10b981'} 
                                                    strokeWidth="8" 
                                                    strokeDasharray={`${2 * Math.PI * 40}`} 
                                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - selectedCourseAttendance.percentage / 100)}`}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center">
                                                <span className={`text-4xl font-black ${selectedCourseAttendance.percentage < 75 ? 'text-red-500' : 'text-emerald-500'}`}>{selectedCourseAttendance.percentage}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sessions List */}
                                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                            <h4 className="font-bold text-slate-600 text-sm uppercase">Session History</h4>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {selectedCourseAttendance.sessions.length === 0 ? (
                                                <div className="p-8 text-center text-sm font-medium text-slate-400 italic">No sessions recorded yet.</div>
                                            ) : (
                                                selectedCourseAttendance.sessions.map(s => (
                                                    <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                                        <div>
                                                            <p className="font-bold text-slate-800">{new Date(s.date).toLocaleDateString()}</p>
                                                            <p className="text-xs text-slate-500">{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                        <div>
                                                            {s.isPresent ? (
                                                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black uppercase inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Present</span>
                                                            ) : (
                                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-black uppercase inline-flex items-center gap-1"><X className="w-3 h-3" /> Absent</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <footer className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">
                ClassTrack Student Infrastructure • v1.0.4
            </footer>
        </div>
    );
};

export default StudentDashboard;
