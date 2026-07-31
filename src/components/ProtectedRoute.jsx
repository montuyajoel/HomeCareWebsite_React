// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ProtectedRoute({ children, allowedRole }) {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (!isAuthenticated || !user) {
    // Redirect to the role-specific login page if not logged in
    return <Navigate to={allowedRole === 'admin' ? '/admin/login' : '/caregiver/login'} replace />;
  }

  if (user.role !== allowedRole) {
    // If logged in but accessing the wrong dashboard, redirect to the correct one
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/caregiver/dashboard'} replace />;
  }

  return children;
}
