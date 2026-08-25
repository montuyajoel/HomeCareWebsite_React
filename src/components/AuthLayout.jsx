//src/components/AuthLayout.jsx
/* Shared authentication page shell: glassy full-bleed layout for login/register. */
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/global.css';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell-media" aria-hidden="true">
        <img
          src="/hero-caregiver-elderly.png"
          alt=""
          className="auth-shell-image"
        />
      </div>
      <div className="auth-shell-scrim" aria-hidden="true" />

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <svg
                className="auth-logo-icon"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="auth-logo-text">United Healthcare IE</span>
            </Link>
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
