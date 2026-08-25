// src/pages/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function LandingPage() {
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
            <Link to="/caregiver/login" className="btn btn-primary btn-lg landing-cta-primary">
              Caregiver Login
            </Link>
            <Link to="/admin/login" className="btn btn-lg landing-cta-secondary">
              Admin Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
