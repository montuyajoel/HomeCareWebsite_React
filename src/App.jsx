// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CaregiverLogin from './pages/CaregiverLogin';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import CaregiverRegister from './pages/CaregiverRegister';
import CaregiverDashboard from './pages/CaregiverDashboard';
import CaregiverUpcomingShifts from './pages/CaregiverUpcomingShifts';
import AdminLeaveRequests from './pages/AdminLeaveRequests';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Landing & Login Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/caregiver/login" element={<CaregiverLogin />} />
        <Route path="/caregiver/register" element={<CaregiverRegister />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* Protected Portals */}
        <Route
          path="/caregiver/dashboard"
          element={
            <ProtectedRoute allowedRole="caregiver">
              <CaregiverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caregiver/upcoming-shifts"
          element={
            <ProtectedRoute allowedRole="caregiver">
              <CaregiverUpcomingShifts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/leave-requests"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLeaveRequests />
            </ProtectedRoute>
          }
        />

        {/* Default Wildcard Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
