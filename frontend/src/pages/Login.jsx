import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { LogIn, Mail, Lock, Loader2, BookOpen, Quote, ShieldCheck, Zap, ArrowRight, AlertCircle } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/login', { email, password });
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            if (user.role === 'ADMIN') {
                navigate('/admin');
            } else if (user.role === 'FACULTY') {
                navigate('/faculty');
            } else if (user.role === 'STUDENT') {
                navigate('/student');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex overflow-hidden bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
            {/* Left Promotional Pane */}
            <div className="hidden lg:flex lg:w-[42%] h-full bg-indigo-600 relative overflow-hidden p-12 xl:p-16 flex-col justify-between shadow-2xl z-20">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-400 rounded-full blur-3xl opacity-30 mix-blend-screen"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500 rounded-full blur-3xl opacity-40 mix-blend-screen"></div>
                
                <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-lg border border-white/10">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-3xl font-black text-white tracking-tight italic">ClassTrack</span>
                </div>

                <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <Quote className="w-12 h-12 text-white/20 mb-6" />
                    <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
                        The Future of <br/> 
                        <span className="text-indigo-200">Campus Attendance.</span>
                    </h1>
                    <div className="space-y-4 mt-8 max-w-md">
                        <div className="flex items-center gap-4 text-indigo-100 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="bg-indigo-500/50 p-3 rounded-lg shadow-inner border border-white/10"><Zap className="w-5 h-5 text-white"/></div>
                            <div>
                                <p className="font-bold text-white text-base tracking-wide">Smart Tracking</p>
                                <p className="text-xs opacity-70 mt-0.5">Effortless attendance tracking directly to your dashboard.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-indigo-100 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="bg-indigo-500/50 p-3 rounded-lg shadow-inner border border-white/10"><ShieldCheck className="w-5 h-5 text-white"/></div>
                            <div>
                                <p className="font-bold text-white text-base tracking-wide">Secure & Automated</p>
                                <p className="text-xs opacity-70 mt-0.5">Zero manual entry, zero tampering. Bulletproof accuracy.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-indigo-200 text-xs font-black tracking-widest uppercase flex items-center gap-2">
                    <span className="w-8 h-[2px] bg-indigo-300/50 rounded-full"></span>
                    © 2026 ClassTrack Systems
                </div>
            </div>

            {/* Right Login Pane */}
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 lg:p-16 xl:p-24 relative bg-white overflow-hidden">
                {/* Decorative background blobs for right side */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-50 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/3"></div>
                
                <div className="w-full max-w-md relative z-10 w-full">
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-16">
                        <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
                            <BookOpen className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-4xl font-black text-slate-800 tracking-tight italic">ClassTrack</span>
                    </div>

                    <div className="mb-12 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 lg:hidden border border-indigo-100">
                            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span>
                            Portal Access
                        </div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-4">Welcome Back</h2>
                        <p className="text-slate-500 font-medium">Please enter your credentials to securely access your workspace.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-2 border-red-100 text-red-600 p-5 rounded-2xl mb-8 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                            <div className="bg-red-100 p-2 rounded-full mt-0.5 shrink-0"><AlertCircle className="w-4 h-4 text-red-600" /></div>
                            <p className="font-bold text-sm leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="group/field">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1 transition-colors group-focus-within/field:text-indigo-600">Email Address</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl group-focus-within:bg-indigo-600 group-focus-within:border-indigo-600 group-focus-within:text-white transition-all text-slate-400 shadow-sm">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-20 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[24px] hover:border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-black text-slate-800 placeholder:font-bold placeholder:text-slate-300 shadow-sm"
                                    placeholder="name@university.edu"
                                    required
                                />
                            </div>
                        </div>

                        <div className="group/field">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 pl-1 transition-colors group-focus-within/field:text-indigo-600">Secure Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl group-focus-within:bg-indigo-600 group-focus-within:border-indigo-600 group-focus-within:text-white transition-all text-slate-400 shadow-sm">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-20 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[24px] hover:border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-black text-slate-800 placeholder:font-bold placeholder:text-slate-300 shadow-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg py-5 px-6 rounded-[24px] transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 mt-8 group border border-indigo-500 hover:border-indigo-600"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In to Portal</span>
                                    <div className="bg-white/20 p-1.5 rounded-full group-hover:translate-x-1.5 transition-transform duration-300">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
