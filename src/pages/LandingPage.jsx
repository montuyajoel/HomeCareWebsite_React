// src/pages/LandingPage.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { authService } from '../services/authService';

const DEMO_ACCOUNTS = {
  caregiver: {
    fullName: 'Sarah Connor',
    employeeCode: 'EMP003',
    role: 'caregiver',
    path: '/caregiver/dashboard',
    label: 'Enter as Caregiver',
    detail: 'Sarah Connor (EMP003)'
  },
  admin: {
    fullName: 'James Smith',
    employeeCode: 'ADM-003',
    role: 'admin',
    path: '/admin/dashboard',
    label: 'Enter as Admin',
    detail: 'James Smith (ADM-003)'
  }
};

function useAuthUser() {
  const [user, setUser] = useState(() =>
    authService.isAuthenticated() ? authService.getCurrentUser() : null
  );

  useEffect(() => {
    const sync = () => {
      setUser(authService.isAuthenticated() ? authService.getCurrentUser() : null);
    };
    window.addEventListener('auth:logout', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('auth:logout', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return user;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const user = useAuthUser();
  const [demoLoginKey, setDemoLoginKey] = useState(null);
  const [demoError, setDemoError] = useState('');
  const dashboardPath = user
    ? user.role === 'admin'
      ? '/admin/dashboard'
      : '/caregiver/dashboard'
    : null;

  const handleDemoLogin = async (accountKey) => {
    const account = DEMO_ACCOUNTS[accountKey];
    if (!account) return;

    setDemoError('');
    setDemoLoginKey(accountKey);

    try {
      const result = await authService.login(
        account.fullName,
        account.employeeCode,
        account.role
      );
      if (result.success) {
        navigate(account.path);
      }
    } catch (err) {
      setDemoError(err.message || 'Could not sign in with the demo account.');
    } finally {
      setDemoLoginKey(null);
    }
  };

  return (
    <div className="app-container landing-shell">
      <Navbar />
      <main className="landing-hero">
        <div className="landing-hero-media" aria-hidden="true">
          <img
            src="/hero-caregiver-elderly.png"
            alt=""
            className="landing-hero-image"
          />
        </div>
        <div className="landing-hero-scrim" aria-hidden="true" />

        <div className="landing-hero-content">
          <p className="landing-brand">United Healthcare IE</p>
          <h1 className="landing-title">
            Homecare that feels personal, scheduled with care
          </h1>
          <p className="landing-description">
            Coordinate visits, caregivers, and client records for families across Ireland—so every call feels like someone who knows the home.
          </p>
          <div className="landing-actions">
            {user && dashboardPath ? (
              <Link to={dashboardPath} className="btn btn-primary btn-lg landing-cta-primary">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/caregiver/login" className="btn btn-primary btn-lg landing-cta-primary">
                  Caregiver Login
                </Link>
                <Link to="/admin/login" className="btn btn-lg landing-cta-secondary">
                  Admin Login
                </Link>
                <div className="landing-demo">
                  <p className="landing-demo-label">Quick demo access</p>
                  <div className="landing-demo-actions">
                    {Object.entries(DEMO_ACCOUNTS).map(([key, account]) => (
                      <button
                        key={key}
                        type="button"
                        className={`btn btn-lg ${key === 'caregiver' ? 'landing-cta-primary' : 'landing-cta-secondary'}`}
                        onClick={() => handleDemoLogin(key)}
                        disabled={Boolean(demoLoginKey)}
                      >
                        {demoLoginKey === key ? 'Signing in...' : `${account.label} · ${account.detail}`}
                      </button>
                    ))}
                  </div>
                  {demoError && (
                    <p className="landing-demo-error" role="alert">
                      {demoError}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
