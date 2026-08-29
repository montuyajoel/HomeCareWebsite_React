// src/pages/LandingPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { authService } from '../services/authService';

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
  const user = useAuthUser();
  const dashboardPath = user
    ? user.role === 'admin'
      ? '/admin/dashboard'
      : '/caregiver/dashboard'
    : null;

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
          <div
            className={`landing-actions${user && dashboardPath ? '' : ' landing-actions--guest-logins'}`}
          >
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
