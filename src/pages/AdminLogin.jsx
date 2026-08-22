// src/pages/AdminLogin.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const registrationMessage = location.state?.message;

  const handleSuccess = () => {
    navigate('/admin/dashboard');
  };

  return (
    <AuthLayout
      title="Admin Login"
      subtitle="Sign in to coordinate schedules, manage clients, review leaf requests, and monitor caregivers."
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
