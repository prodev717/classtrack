import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { User, LogOut, LayoutDashboard, Calendar, Users, Settings } from 'lucide-react';

const FacultyDashboard = () => {
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
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-indigo-900 text-white flex flex-col shrink-0">
                <div className="p-6">
                    <h2 className="text-2xl font-bold tracking-tight">ClassTrack</h2>
                    <p className="text-indigo-300 text-xs">Faculty Portal</p>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-indigo-800 rounded-xl transition">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-800 rounded-xl transition">
                        <Users className="w-5 h-5" />
                        Students
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-800 rounded-xl transition">
                        <Calendar className="w-5 h-5" />
                        Attendance
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-800 rounded-xl transition">
                        <Settings className="w-5 h-5" />
                        Settings
                    </a>
                </nav>

                <div className="p-4 border-t border-indigo-800">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-500/20 text-red-300 rounded-xl transition"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
                    <h3 className="text-xl font-semibold text-gray-800">Faculty Dashboard</h3>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.faculty?.department}</p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                            {user.name?.charAt(0)}
                        </div>
                    </div>
                </header>

                <main className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm">Total Students</p>
                                <p className="text-2xl font-bold">--</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm">Today's Attendance</p>
                                <p className="text-2xl font-bold">--%</p>
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
                        <h4 className="text-lg font-bold mb-6">Welcome back, Professor!</h4>
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <LayoutDashboard className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select an option from the sidebar to begin managing your classes.</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default FacultyDashboard;
