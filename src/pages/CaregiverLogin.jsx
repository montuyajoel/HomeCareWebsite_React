// src/pages/CaregiverLogin.jsx
import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';
import { authService } from '../services/authService';

export default function CaregiverLogin() {
  const navigate = useNavigate();

  if (authService.isAuthenticated()) {
    return <Navigate to={authService.getDashboardPath()} replace />;
  }

  const handleSuccess = () => {
    navigate('/caregiver/dashboard');
  };

  return (
    <AuthLayout
      title="Caregiver Login"
      subtitle="Sign in to view today's client schedule, clock in/out of visits, and submit requests."
    >
      <LoginForm role="caregiver" onSuccess={handleSuccess} />
    </AuthLayout>
  );
}
