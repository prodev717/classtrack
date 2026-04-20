import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
    User, 
    LogOut, 
    CheckCircle, 
    Clock, 
    BookOpen, 
    UserCircle, 
    Mail, 
    MapPin, 
    Calendar 
} from 'lucide-react';

const StudentDashboard = () => {
    const [user, setUser] = useState(null);
    const [enrolledClasses, setEnrolledClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
        }
    }, [user]);

    const fetchEnrolledClasses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/student/classes');
            setEnrolledClasses(res.data.data);
        } catch (err) {
            console.error('Failed to fetch classes', err);
        } finally {
            setLoading(false);
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

            <main className="flex-1 max-w-5xl mx-auto w-full p-8 space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-40 h-40 bg-indigo-50 rounded-[40px] flex items-center justify-center text-indigo-600 border-4 border-white shadow-2xl relative">
                         <UserCircle className="w-24 h-24 stroke-[1]" />
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

                {/* Classes Section */}
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

                                        <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                                            <button className="bg-slate-50 hover:bg-indigo-50 text-indigo-600 px-5 py-2 rounded-xl text-xs font-black transition">
                                                View Info
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Class</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <footer className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">
                ClassTrack Student Infrastructure • v1.0.4
            </footer>
        </div>
    );
};

export default StudentDashboard;
