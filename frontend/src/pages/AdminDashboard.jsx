import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    Users,
    Calendar,
    MapPin,
    Cpu,
    BookOpen,
    Plus,
    Edit2,
    Trash2,
    LogOut,
    Settings,
    Search,
    X,
    Check,
    BarChart3,
    TrendingUp,
    AlertTriangle,
    Menu
} from 'lucide-react';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [user, setUser] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await api.get('/auth/me');
                if (res.data.data.role !== 'ADMIN') navigate('/');
                setUser(res.data.data);
                // Fetch all data needed for modals
                fetchInitialData();
            } catch (err) {
                navigate('/login');
            }
        };
        fetchMe();
    }, [navigate]);

    const [allSlots, setAllSlots] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [allVenues, setAllVenues] = useState([]);
    const [allFaculties, setAllFaculties] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [reportsData, setReportsData] = useState(null);

    const fetchInitialData = async () => {
        try {
            const [slotsRes, coursesRes, venuesRes, usersRes] = await Promise.all([
                api.get('/admin/slots'),
                api.get('/admin/courses'),
                api.get('/admin/venues'),
                api.get('/admin/users')
            ]);
            setAllSlots(slotsRes.data.data);
            setAllCourses(coursesRes.data.data);
            setAllVenues(venuesRes.data.data);
            setAllFaculties(usersRes.data.data.filter(u => u.role === 'FACULTY'));
            setAllStudents(usersRes.data.data.filter(u => u.role === 'STUDENT'));
        } catch (err) {
            console.error('Failed to fetch initial data', err);
        }
    };

    const fetchSlots = async () => {
        try {
            const res = await api.get('/admin/slots');
            setAllSlots(res.data.data);
        } catch (err) { }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'reports') {
                const res = await api.get('/attendance/admin/stats');
                setReportsData(res.data.data);
            } else {
                const url = activeTab.startsWith('attendance') ? `/${activeTab}` : `/admin/${activeTab}`;
                const res = await api.get(url);
                setData(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        setProcessing(true);
        try {
            const url = activeTab.startsWith('attendance') ? `/${activeTab}/${id}` : `/admin/${activeTab}/${id}`;
            await api.delete(url);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Delete failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (editingItem) {
                await api.put(`/admin/${activeTab}/${editingItem.id}`, formData);
            } else {
                await api.post(`/admin/${activeTab}`, formData);
            }
            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({});
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Operation failed');
        } finally {
            setProcessing(false);
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        if (activeTab === 'courses' && item.slots) {
            setFormData({
                ...item,
                slotIds: item.slots.map(s => s.id)
            });
        } else if (activeTab === 'users') {
            setFormData({
                name: item.name,
                email: item.email,
                rfid: item.rfid,
                role: item.role,
                regNumber: item.student?.regNumber || '',
                employeeId: item.faculty?.employeeId || '',
                department: item.student?.department || item.faculty?.department || ''
            });
        } else if (activeTab === 'slots') {
            const formatTime = (isoStr) => {
                const date = new Date(isoStr);
                return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
            };
            setFormData({
                slotName: item.slotName,
                dayOfWeek: item.dayOfWeek,
                startTime: formatTime(item.startTime),
                endTime: formatTime(item.endTime)
            });
        } else if (activeTab === 'courses') {
            setFormData({
                courseName: item.courseName,
                courseCode: item.courseCode,
                slotIds: item.slots?.map(s => s.id) || []
            });
        } else if (activeTab === 'classes') {
            setFormData({
                courseId: item.courseId,
                venueId: item.venueId,
                facultyId: item.facultyId,
                studentIds: item.students?.map(s => s.userId) || [],
                status: item.status
            });
        } else {
            setFormData(item);
        }
        setIsModalOpen(true);
    };

    const toggleSlot = (id) => {
        const currentIds = formData.slotIds || [];
        if (currentIds.includes(id)) {
            setFormData({ ...formData, slotIds: currentIds.filter(i => i !== id) });
        } else {
            setFormData({ ...formData, slotIds: [...currentIds, id] });
        }
    };

    const renderUsers = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                        <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                        <th className="px-6 py-4 font-semibold text-slate-700">RFID</th>
                        <th className="px-6 py-4 font-semibold text-slate-700">Identifier</th>
                        <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="px-6 py-4">
                                <p className="font-medium text-slate-800">{u.name}</p>
                                <p className="text-sm text-slate-500">{u.email}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                    u.role === 'FACULTY' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-slate-600">{u.rfid}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                                {u.student?.regNumber || u.faculty?.employeeId || 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => openEdit(u)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(u.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderSlots = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((s) => (
                <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => openEdit(s)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <h5 className="text-lg font-bold text-slate-800">{s.slotName}</h5>
                    <div className="mt-4 flex items-center gap-2 text-slate-500 text-sm">
                        <span className="bg-slate-100 px-2 py-1 rounded font-bold text-slate-700">{s.dayOfWeek}</span>
                        <span>
                            {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })} - {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderVenues = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.map((v) => (
                <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{v.block} - {v.room}</p>
                            <p className="text-xs text-slate-400">ID: {v.id}</p>
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderReaders = () => (
        <div className="space-y-4">
            {data.map((r) => (
                <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between hover:border-indigo-200 transition">
                    <div className="flex items-center gap-6">
                        <div className="bg-slate-50 p-4 rounded-xl text-slate-600">
                            <Cpu className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">{r.deviceIdentifier}</p>
                            <p className="text-lg font-bold text-slate-800">Venue: {r.venue?.block} - {r.venue?.room}</p>
                            <p className="text-sm text-slate-500">Status:
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {r.status}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl transition"><Trash2 className="w-5 h-5" /></button>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderCourses = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => openEdit(c)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <h5 className="text-lg font-bold text-slate-800">{c.courseName}</h5>
                    <p className="text-sm text-slate-500 font-mono mt-1">{c.courseCode}</p>
                </div>
            ))}
        </div>
    );

    const renderClasses = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.map((cls) => (
                <div key={cls.id} className="bg-white border border-slate-200 rounded-[32px] p-8 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openEdit(cls)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl transition border border-slate-100 hover:border-indigo-200"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(cls.id)} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl transition border border-slate-100 hover:border-red-200"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                            {cls.course?.courseCode}
                        </span>
                        <h5 className="text-xl font-black text-slate-800 mb-2 truncate">{cls.course?.courseName}</h5>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                <Users className="w-4 h-4 text-indigo-400" />
                                <span>Prof. {cls.faculty?.user?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                <MapPin className="w-4 h-4 text-indigo-400" />
                                <span>{cls.venue?.block} - {cls.venue?.room}</span>
                            </div>

                            {/* Class slots display */}
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {cls.course?.slots?.map(slot => (
                                    <div key={slot.id} className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                        <span className="text-[9px] font-black text-indigo-600 uppercase leading-none">{slot.dayOfWeek}</span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {cls.students?.slice(0, 3).map(s => (
                                    <div key={s.userId} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-500">
                                        {s.user?.name?.charAt(0)}
                                    </div>
                                ))}
                                {cls.students?.length > 3 && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-600">
                                        +{cls.students.length - 3}
                                    </div>
                                )}
                            </div>
                            <span className="text-xs font-bold text-slate-400 ml-2">{cls.students?.length} Enrolled</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 ${cls.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-emerald-500'} rounded-full`}></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {cls.status === 'COMPLETED' ? 'Completed' : 'Active'}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderAdminAttendance = () => (
        <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Class / Course</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Faculty</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date & Time</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Records</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map(s => (
                            <tr key={s.id} className="hover:bg-white transition">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-800">{s.class?.course?.courseName}</p>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">{s.class?.course?.courseCode}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                                            {s.class?.faculty?.user?.name?.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-slate-600">{s.class?.faculty?.user?.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-700">{new Date(s.date).toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-500">{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${s.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                                            s.status === 'AUTO_CLOSED' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-200 text-slate-600'
                                        }`}>
                                        {s.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black">
                                        {s._count?.records || 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center italic">
                Note: Individual attendance records can be managed by faculty from their dashboard or via API.
            </p>
        </div>
    );

    const renderReports = () => {
        if (!reportsData) return null;

        return (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-indigo-600 p-10 rounded-[40px] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                        <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition duration-700" />
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Total Managed Classes</p>
                            <h3 className="text-5xl font-black">{reportsData.totalClasses}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 flex flex-col justify-center shadow-sm hover:shadow-xl transition-shadow group">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Low Attendance Classes</p>
                        <div className="flex items-center gap-4">
                            <span className={`text-5xl font-black ${reportsData.lowAttendanceClasses.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {reportsData.lowAttendanceClasses.length}
                            </span>
                            {reportsData.lowAttendanceClasses.length > 0 && <AlertTriangle className="text-red-500 w-8 h-8 animate-bounce" />}
                        </div>
                    </div>
                    <div className="bg-white p-10 rounded-[40px] border border-slate-100 flex flex-col justify-center shadow-sm hover:shadow-xl transition-shadow">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">System Enrollment</p>
                        <p className="text-5xl font-black text-slate-800">{allStudents.length}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h4 className="text-2xl font-black text-slate-800 tracking-tight">Performance Analytics</h4>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Below 75% threshold</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course / Class</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Avg Presence</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Progress</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {reportsData.classStats.sort((a, b) => a.avgAttendance - b.avgAttendance).map(cls => (
                                    <tr key={cls.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${cls.avgAttendance < 75 ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    {cls.courseCode.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-lg leading-tight mb-1">{cls.courseName}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cls.courseCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-center text-xl font-black">
                                            <span className={cls.avgAttendance < 75 ? 'text-red-500' : 'text-slate-800'}>
                                                {cls.avgAttendance}%
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            {cls.avgAttendance < 75 ? (
                                                <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-red-100">Critical</span>
                                            ) : (
                                                <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100">Optimal</span>
                                            )}
                                        </td>
                                        <td className="px-10 py-8 text-right w-80">
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${cls.avgAttendance < 75 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]'}`}
                                                        style={{ width: `${cls.avgAttendance}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Attendance Health</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen w-full bg-slate-50 flex overflow-hidden">
            {/* Sidebar Desktop */}
            <div className={`fixed inset-y-0 left-0 lg:relative transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 w-72 bg-indigo-950 text-white flex flex-col shrink-0 h-full shadow-2xl transition duration-300 z-50 overflow-hidden`}>
                <div className="p-8 border-b border-white/5">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <div className="bg-white/10 p-2 rounded-xl">
                            <BookOpen className="w-6 h-6 text-indigo-300" />
                        </div>
                        ClassTrack
                    </h2>
                    <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ml-12">Administration</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-8 overflow-y-auto scrollbar-hide">
                    {[
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'courses', label: 'Courses', icon: BookOpen },
                        { id: 'slots', label: 'Time Slots', icon: Calendar },
                        { id: 'venues', label: 'Venues', icon: MapPin },
                        { id: 'readers', label: 'IoT Readers', icon: Cpu },
                        { id: 'classes', label: 'Classes', icon: Calendar },
                        { id: 'attendance/sessions', label: 'Attendance', icon: Check },
                        { id: 'reports', label: 'Analytics', icon: BarChart3 }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsSidebarOpen(false);
                            }}
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
            </div>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"></div>
            )}

            {/* Main Content */}
            <div className="flex-1 h-full flex flex-col min-w-0 overflow-y-auto">
                <header className="h-20 lg:h-24 bg-white/50 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-12 sticky top-0 z-30 w-full shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-indigo-600 hover:bg-slate-100 rounded-xl transition">
                            <Menu className="w-6 h-6" />
                        </button>
                        <h3 className="text-xl lg:text-2xl font-black text-slate-800 capitalize tracking-tight">{activeTab.includes('/') ? activeTab.split('/')[1] : activeTab}</h3>

                        {!['reports', 'attendance/sessions'].includes(activeTab) && (
                            <button
                                onClick={() => { setEditingItem(null); setFormData({}); setIsModalOpen(true); }}
                                className="ml-2 lg:ml-6 bg-indigo-600 hover:bg-indigo-700 text-white px-3 lg:px-5 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl shadow-xl shadow-indigo-100 transition flex items-center gap-2 group active:scale-95"
                            >
                                <Plus className="w-4 h-4 lg:w-5 lg:h-5 group-hover:rotate-90 transition-transform duration-300" />
                                <span className="text-xs lg:text-sm font-black uppercase tracking-widest">Create</span>
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl shadow-md flex items-center justify-center text-white font-black text-lg shrink-0">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="text-left px-2 hidden sm:block">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Administrator</p>
                            <p className="text-sm font-black text-slate-800 truncate max-w-[120px]">{user?.name}</p>
                        </div>
                        <div className="pl-4 border-l border-slate-100 ml-2">
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center p-3 text-red-500 hover:bg-red-50 rounded-xl transition group"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="p-4 lg:p-12 max-w-7xl mx-auto w-full">
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] p-8">
                        {loading ? (
                            <div className="h-full flex items-center justify-center py-40">
                                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'users' && renderUsers()}
                                {activeTab === 'classes' && renderClasses()}
                                {activeTab === 'courses' && renderCourses()}
                                {activeTab === 'slots' && renderSlots()}
                                {activeTab === 'venues' && renderVenues()}
                                {activeTab === 'readers' && renderReaders()}
                                {activeTab === 'attendance/sessions' && renderAdminAttendance()}
                                {activeTab === 'reports' && renderReports()}
                            </>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <h3 className="text-2xl font-black text-slate-800">
                                {editingItem ? 'Edit' : 'Create New'} {activeTab.slice(0, -1)}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 sm:p-10 space-y-6 overflow-y-auto">
                            {activeTab === 'users' && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Full Name</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Email</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Password {editingItem && '(Optional)'}</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} {...(!editingItem && { required: true })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">RFID Tag</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.rfid || ''} onChange={e => setFormData({ ...formData, rfid: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Role</label>
                                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.role || 'STUDENT'} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="STUDENT">Student</option>
                                            <option value="FACULTY">Faculty</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                        {formData.role === 'STUDENT' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Registration No</label>
                                                    <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.regNumber || ''} onChange={e => setFormData({ ...formData, regNumber: e.target.value })} required />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Department</label>
                                                    <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.department || ''} onChange={e => setFormData({ ...formData, department: e.target.value })} required />
                                                </div>
                                            </>
                                        )}
                                        {formData.role === 'FACULTY' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Employee ID</label>
                                                    <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.employeeId || ''} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} required />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Department</label>
                                                    <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.department || ''} onChange={e => setFormData({ ...formData, department: e.target.value })} required />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'slots' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Slot Name</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" placeholder="e.g., Morning A" value={formData.slotName || ''} onChange={e => setFormData({ ...formData, slotName: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Day of Week</label>
                                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.dayOfWeek || 'MON'} onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}>
                                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => <option key={day} value={day}>{day}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Start Time</label>
                                            <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" type="time" value={formData.startTime || ''} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-600 mb-2 px-1">End Time</label>
                                            <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" type="time" value={formData.endTime || ''} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'venues' && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Block</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" placeholder="e.g., Block A" value={formData.block || ''} onChange={e => setFormData({ ...formData, block: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Room</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" placeholder="e.g., 101" value={formData.room || ''} onChange={e => setFormData({ ...formData, room: e.target.value })} required />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'readers' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Device Identifier (UID)</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" placeholder="READER_001" value={formData.deviceIdentifier || ''} onChange={e => setFormData({ ...formData, deviceIdentifier: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Venue (ID)</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" placeholder="1" value={formData.roomId || ''} onChange={e => setFormData({ ...formData, roomId: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Status</label>
                                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.status || 'ACTIVE'} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'classes' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Select Course</label>
                                            <select
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition"
                                                value={formData.courseId || ''}
                                                onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                                                required
                                            >
                                                <option value="">Choose Course</option>
                                                {allCourses.map(c => <option key={c.id} value={c.id}>{c.courseName} ({c.courseCode})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Select Venue</label>
                                            <select
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition"
                                                value={formData.venueId || ''}
                                                onChange={e => setFormData({ ...formData, venueId: e.target.value })}
                                                required
                                            >
                                                <option value="">Choose Venue</option>
                                                {allVenues.map(v => <option key={v.id} value={v.id}>{v.block} - {v.room}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Select Faculty</label>
                                            <select
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition"
                                                value={formData.facultyId || ''}
                                                onChange={e => setFormData({ ...formData, facultyId: e.target.value })}
                                                required
                                            >
                                                <option value="">Choose Faculty</option>
                                                {allFaculties.map(f => <option key={f.id} value={f.id}>{f.name} ({f.faculty?.employeeId})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Class Status</label>
                                            <select
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition"
                                                value={formData.status || 'ONGOING'}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                                required
                                            >
                                                <option value="ONGOING">Ongoing</option>
                                                <option value="COMPLETED">Completed</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-3 px-1 flex justify-between">
                                            <span>Enroll Students</span>
                                            <span className="text-indigo-600 font-bold text-[10px] uppercase tracking-wider">{(formData.studentIds || []).length} Selected</span>
                                        </label>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                                            {allStudents.map(s => (
                                                <div
                                                    key={s.id}
                                                    onClick={() => {
                                                        const current = formData.studentIds || [];
                                                        setFormData({
                                                            ...formData,
                                                            studentIds: current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id]
                                                        });
                                                    }}
                                                    className={`p-4 flex items-center justify-between cursor-pointer transition ${(formData.studentIds || []).includes(s.id) ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-white'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${(formData.studentIds || []).includes(s.id) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                            {s.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{s.student?.regNumber} • {s.student?.department}</p>
                                                        </div>
                                                    </div>
                                                    {(formData.studentIds || []).includes(s.id) && <Check className="w-5 h-5 text-indigo-600" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'courses' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Course Name</label>
                                            <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.courseName || ''} onChange={e => setFormData({ ...formData, courseName: e.target.value })} required placeholder="e.g. Computer Networks" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-600 mb-2 px-1">Course Code</label>
                                            <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition" value={formData.courseCode || ''} onChange={e => setFormData({ ...formData, courseCode: e.target.value })} required placeholder="e.g. CS101" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-3 px-1">Select Time Slots</label>
                                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                                            {allSlots.map(s => (
                                                <div
                                                    key={s.id}
                                                    onClick={() => toggleSlot(s.id)}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${(formData.slotIds || []).includes(s.id)
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase opacity-60">{s.dayOfWeek}</span>
                                                        <span className="text-xs font-bold">{s.slotName}</span>
                                                    </div>
                                                    {(formData.slotIds || []).includes(s.id) && <Check className="w-4 h-4" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-8 border-t border-slate-100 flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-lg transition">Cancel</button>
                                <button type="submit" disabled={processing} className={`flex-[2] px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg shadow-xl shadow-indigo-100 transition flex items-center justify-center gap-2 ${processing ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                    {processing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    {editingItem ? 'Save Changes' : `Create ${activeTab.slice(0, -1)}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
