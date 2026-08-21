// src/pages/CaregiverLogin.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';

export default function CaregiverLogin() {
  const navigate = useNavigate();

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
