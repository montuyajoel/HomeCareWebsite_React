//src/components/AuthLayout.jsx
/*This is a React component file that defines a reusable "authentication page layout" (AuthLayout),
used to share the same shell design across login, register, and similar pages. */
import React from 'react';
//Importing the Link component from react-router-dom for navigation, between routes without reloading the page
import { Link } from 'react-router-dom';
//imports the global CSS file for styling the component
import '../styles/global.css';

//function component that takes in children, title, and subtitle as props
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <svg className="auth-logo-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  );
}
