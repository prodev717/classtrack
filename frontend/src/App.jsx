import React from 'react';
import { useAuth } from './context/AuthContext';
import AuthScreen from './pages/AuthScreen';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';

export default function App() {
  const { token, user } = useAuth();

  if (!token) {
    return <AuthScreen />;
  }

  if (user?.role === 'student') {
    return <StudentDashboard />;
  }

  return <TeacherDashboard />;
}
