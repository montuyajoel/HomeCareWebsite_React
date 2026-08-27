// src/pages/AdminLogin.jsx
import React from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';
import { authService } from '../services/authService';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const registrationMessage = location.state?.message;

  if (authService.isAuthenticated()) {
    return <Navigate to={authService.getDashboardPath()} replace />;
  }

  const handleSuccess = () => {
    navigate('/admin/dashboard');
  };

  return (
    <AuthLayout
      title="Admin Login"
      subtitle="Sign in to coordinate schedules, manage clients, review leave requests, and monitor caregivers."
    >
      {registrationMessage && (
        <div className="alert alert-success" role="status" aria-live="polite">
          <span>{registrationMessage}</span>
        </div>
      )}
      <LoginForm role="admin" onSuccess={handleSuccess} />
    </AuthLayout>
  );
}
