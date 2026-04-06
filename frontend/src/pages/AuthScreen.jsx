import React, { useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const AuthScreen = () => {
  const { login: onLogin } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('teacher'); // 'teacher' or 'student'
  const [form, setForm] = useState({ name: '', email: '', reg_no: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = `/auth/${role}/${isLogin ? 'login' : 'register'}`;
      const payload = role === 'teacher' 
        ? { name: form.name, email: form.email, password: form.password }
        : { name: form.name, reg_no: form.reg_no, password: form.password };
        
      const res = await axios.post(`${API_BASE}${endpoint}`, payload);
      if (res.data.token) {
        onLogin(res.data.token, res.data.user);
      } else if (!isLogin && res.data.id) {
        setIsLogin(true);
        setForm({ ...form, password: '' });
        alert('Registration successful! Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Activity size={48} color="var(--primary)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h2>ClassTrack Pro</h2>
          <p className="label">{isLogin ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>

        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button 
            type="button"
            className={`tab ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => { setRole('teacher'); setError(''); }}
          >
            Teacher
          </button>
          <button 
            type="button"
            className={`tab ${role === 'student' ? 'active' : ''}`}
            onClick={() => { setRole('student'); setError(''); }}
          >
            Student
          </button>
        </div>

        {error && <div className="badge badge-warning" style={{ display: 'block', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="label">Full Name</label>
              <input 
                className="input" 
                type="text" 
                placeholder={role === 'teacher' ? "Dr. John Doe" : "Alice Smith"}
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                required 
              />
            </div>
          )}
          
          {role === 'teacher' ? (
            <div className="form-group">
              <label className="label">Email Address</label>
              <input 
                className="input" 
                type="email" 
                placeholder="you@university.edu"
                value={form.email} 
                onChange={(e) => setForm({...form, email: e.target.value})} 
                required 
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="label">Registration Number</label>
              <input 
                className="input" 
                type="text" 
                placeholder="22BCE1234"
                value={form.reg_no} 
                onChange={(e) => setForm({...form, reg_no: e.target.value})} 
                required 
              />
            </div>
          )}

          <div className="form-group">
            <label className="label">Password</label>
            <input 
              className="input" 
              type="password" 
              placeholder="••••••••"
              value={form.password} 
              onChange={(e) => setForm({...form, password: e.target.value})} 
              required 
            />
          </div>

          <button type="submit" className="button" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }} 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
