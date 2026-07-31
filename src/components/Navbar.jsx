// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Navbar() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <svg className="navbar-logo-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="navbar-title">HomeCare Scheduler</span>
        </Link>

        {user ? (
          <>
            <button 
              className="navbar-toggle" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className={`navbar-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
              <div className="navbar-user-info">
                <span className="navbar-avatar">
                  {user.fullName.charAt(0).toUpperCase()}
                </span>
                <div className="navbar-user-text">
                  <span className="navbar-username">{user.fullName}</span>
                  <span className="navbar-role">{user.role === 'admin' ? 'Administrator' : `Caregiver (${user.employeeCode})`}</span>
                </div>
              </div>
              
              <div className="navbar-actions">
                <Link 
                  to={user.role === 'admin' ? '/admin/dashboard' : '/caregiver/dashboard'} 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  Logout
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="navbar-guest-actions">
            <Link to="/caregiver/login" className="btn btn-outline btn-sm">Caregiver Login</Link>
            <Link to="/admin/login" className="btn btn-primary btn-sm">Admin Login</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
