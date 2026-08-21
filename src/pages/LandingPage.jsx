// src/pages/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function LandingPage() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content landing-page">
        <div className="landing-grid">
          {/* Text Section */}
          <div className="landing-info">
            <div className="landing-badge">
              <span className="badge-dot"></span>
              <span>Simplifying Care Management</span>
            </div>
            
            <h1 className="landing-title">
              Streamline Your Caregiving Schedules With Ease
            </h1>
            
            <p className="landing-description">
              Manage homecare schedules, caregivers, clients, and daily visits. 
              Built for reliability, accessibility, and clean coordination.
            </p>
            
            <div className="landing-actions">
              <Link to="/caregiver/login" className="btn btn-primary btn-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Caregiver Login</span>
              </Link>
              <Link to="/admin/login" className="btn btn-secondary btn-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Admin Login</span>
              </Link>
            </div>

            <div className="landing-features">
              <div className="feature-item">
                <svg className="feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Real-time Clock In/Out</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Schedule Optimizations</span>
              </div>
              <div className="feature-item">
                <svg className="feature-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Secure Client Records</span>
              </div>
            </div>
          </div>

          {/* Graphic Section */}
          <div className="landing-graphic">
            <svg viewBox="0 0 500 500" className="hero-svg" aria-hidden="true" width="100%" height="auto">
              <defs>
                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#DBEAFE" />
                  <stop offset="100%" stopColor="#EFF6FF" />
                </linearGradient>
                <linearGradient id="mainBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>
              
              {/* Background Circle Grid */}
              <circle cx="250" cy="250" r="220" fill="url(#blueGrad)" />
              <circle cx="250" cy="250" r="180" fill="none" stroke="#93C5FD" strokeWidth="1" strokeDasharray="5 5" />
              
              {/* SVG Calendar Illustration */}
              <g transform="translate(110, 100)">
                {/* Main Card */}
                <rect x="0" y="0" width="280" height="260" rx="20" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" filter="drop-shadow(0 10px 15px rgba(0, 0, 0, 0.04))" />
                
                {/* Header Bar */}
                <rect x="0" y="0" width="280" height="60" rx="20" fill="url(#mainBlue)" />
                {/* Cut bottom corners of header to fit card radius */}
                <rect x="0" y="40" width="280" height="20" fill="url(#mainBlue)" />
                
                {/* Header Dots */}
                <circle cx="30" cy="30" r="6" fill="#FCA5A5" />
                <circle cx="50" cy="30" r="6" fill="#FDE047" />
                <circle cx="70" cy="30" r="6" fill="#86EFAC" />
                <text x="140" y="36" fill="#FFFFFF" fontSize="14" fontWeight="600" textAnchor="middle">Today's Visits</text>

                {/* List items inside calendar */}
                {/* Shift 1 */}
                <g transform="translate(20, 80)">
                  <rect x="0" y="0" width="240" height="65" rx="10" fill="#F0F6FF" stroke="#BFDBFE" strokeWidth="1" />
                  <circle cx="25" cy="32" r="12" fill="#3B82F6" />
                  {/* Heart Icon on Circle */}
                  <path d="M25 28.5s-2.5 1.5-2.5 3.5 1.5 2.5 2.5 2.5 2.5-.5 2.5-2.5-2.5-3.5-2.5-3.5z" fill="#FFFFFF" />
                  <text x="50" y="30" fill="#1E293B" fontSize="12" fontWeight="600">Client: John Doe</text>
                  <text x="50" y="46" fill="#64748B" fontSize="10">08:00 AM - 10:00 AM</text>
                  <rect x="180" y="20" width="50" height="22" rx="11" fill="#3B82F6" />
                  <text x="205" y="34" fill="#FFFFFF" fontSize="9" fontWeight="600" textAnchor="middle">Active</text>
                </g>

                {/* Shift 2 */}
                <g transform="translate(20, 160)">
                  <rect x="0" y="0" width="240" height="65" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
                  <circle cx="25" cy="32" r="12" fill="#E2E8F0" />
                  <path d="M25 28.5s-2.5 1.5-2.5 3.5 1.5 2.5 2.5 2.5 2.5-.5 2.5-2.5-2.5-3.5-2.5-3.5z" fill="#94A3B8" />
                  <text x="50" y="30" fill="#1E293B" fontSize="12" fontWeight="600">Client: Mary Smith</text>
                  <text x="50" y="46" fill="#64748B" fontSize="10">11:30 AM - 01:30 PM</text>
                  <rect x="180" y="20" width="50" height="22" rx="11" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
                  <text x="205" y="33" fill="#64748B" fontSize="9" fontWeight="600" textAnchor="middle">Pending</text>
                </g>
              </g>

              {/* Little Floating Health Badge */}
              <g transform="translate(60, 320)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.05))">
                <rect x="0" y="0" width="130" height="50" rx="25" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
                <circle cx="25" cy="25" r="15" fill="#D1FAE5" />
                <path d="M25 18v14M18 25h14" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
                <text x="50" y="25" fill="#065F46" fontSize="11" fontWeight="600">On-Duty</text>
                <text x="50" y="38" fill="#1E293B" fontSize="10" fontWeight="500">12 Caregivers</text>
              </g>
            </svg>
          </div>
        </div>
      </main>
    </div>
  );
}
