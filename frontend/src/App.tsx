import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing Page (Identik dengan Sistem Ujian Online) */}
            <Route path="/" element={<LandingPage />} />

            {/* Login Page (Identik dengan Sistem Ujian Online) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Dashboard Test Bench */}
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/super-admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/test" element={<AdminDashboardPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
