import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { User, LogOut, CheckCircle, Clock, BookOpen, UserCircle, Mail } from 'lucide-react';

const StudentDashboard = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await api.get('/auth/me');
                setUser(res.data.data);
            } catch (err) {
                navigate('/login');
            }
        };
        fetchMe();
    }, [navigate]);

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
                    <BookOpen className="w-8 h-8" />
                    <h1 className="text-2xl font-bold italic tracking-tight text-white">ClassTrack</h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                        <p className="font-bold">{user.name}</p>
                        <p className="text-indigo-200 text-xs">{user.student?.regNumber}</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition"
                    >
                        <LogOut className="w-5 h-5 text-white" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full p-8 space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition duration-500">
                            <CheckCircle className="w-24 h-24" />
                        </div>
                        <p className="text-slate-500 font-medium mb-1">Attendance</p>
                        <p className="text-4xl font-extrabold text-indigo-600">--%</p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 font-medium mb-1">Registration No</p>
                        <p className="text-2xl font-bold">{user.student?.regNumber}</p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 font-medium mb-1">Department</p>
                        <p className="text-2xl font-bold">{user.student?.department}</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="bg-white p-10 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-40 h-40 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border-4 border-white shadow-xl">
                        <UserCircle className="w-24 h-24 stroke-[1]" />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 mb-1">{user.name}</h2>
                            <p className="text-slate-500 font-medium italic">Active Student Portal</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-4 max-w-sm mx-auto md:mx-0 pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-slate-600">
                                <Mail className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm">Join: {new Date(user.createdAt).getFullYear()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Placeholder Classes */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold px-2">Scheduled Classes Today</h3>
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 flex flex-col items-center justify-center py-16 text-slate-300">
                        <Clock className="w-12 h-12 mb-3 opacity-20" />
                        <p>Your RFID tag is linked to: <span className="text-indigo-600 font-mono font-bold bg-indigo-50 px-2 py-1 rounded">{user.rfid}</span></p>
                    </div>
                </div>
            </main>

            <footer className="text-center py-10 text-slate-400 text-sm">
                ClassTrack Student Portal v1.0 • Built with Passion
            </footer>
        </div>
    );
};

export default StudentDashboard;
