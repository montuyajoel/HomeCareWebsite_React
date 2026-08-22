// src/components/ClientDetailsModal.jsx
import React from 'react';
import '../styles/clientDetailsModal.css';

function formatAddress(addr) {
  if (!addr) return 'N/A';
  const parts = [addr.addressLine, addr.town, addr.city, addr.county, addr.postCode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'N/A';
}

function formatBirthDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  return value;
}

export default function ClientDetailsModal({ isOpen, client, onClose }) {
  if (!isOpen || !client) return null;

  const careNeeds = Array.isArray(client.careNeeds) ? client.careNeeds : [];
  const emergency = client.emergencyContact || null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-details-title"
      onClick={handleOverlayClick}
    >
      <div className="modal-content card client-details-modal">
        <div className="client-details-modal-header">
          <div className="client-details-modal-heading">
            <h2 id="client-details-title" className="client-details-modal-title">
              {displayValue(client.fullName)}
            </h2>
            <span className="client-details-modal-code">
              {displayValue(client.clientCode)}
            </span>
          </div>
          <button
            type="button"
            className="client-details-modal-close"
            onClick={onClose}
            aria-label="Close client details"
          >
            &times;
          </button>
        </div>

        <section className="client-details-section" aria-label="Identity">
          <h3 className="client-details-section-title">Identity</h3>
          <div className="profile-details-list">
            <div className="profile-detail-row">
              <strong>Gender</strong>
              <span>{displayValue(client.gender)}</span>
            </div>
            <div className="profile-detail-row">
              <strong>Age</strong>
              <span>{displayValue(client.age)}</span>
            </div>
            <div className="profile-detail-row">
              <strong>Birth Date</strong>
              <span>{formatBirthDate(client.birthDate)}</span>
            </div>
            <div className="profile-detail-row">
              <strong>Preferred Caregiver</strong>
              <span>{displayValue(client.preferredCaregiverGender)}</span>
            </div>
          </div>
        </section>

        <section className="client-details-section" aria-label="Health context">
          <h3 className="client-details-section-title">Health Context</h3>
          <div className="profile-details-list">
            <div className="profile-detail-row">
              <strong>Mobility</strong>
              <span>{displayValue(client.mobilityStatus)}</span>
            </div>
            <div className="profile-detail-row">
              <strong>Cognitive Status</strong>
              <span>{displayValue(client.cognitiveStatus)}</span>
            </div>
            <div className="profile-detail-row">
              <strong>Has Pets</strong>
              <span>
                {typeof client.hasPets === 'boolean'
                  ? (client.hasPets ? 'Yes' : 'No')
                  : 'N/A'}
              </span>
            </div>
          </div>
        </section>

        <section className="client-details-section" aria-label="Care needs">
          <h3 className="client-details-section-title">Care Needs</h3>
          <div className="profile-details-list">
            <div className="profile-detail-row profile-care-needs-row">
              <div className="client-details-care-needs">
                {careNeeds.length > 0 ? (
                  careNeeds.map((need, index) => (
                    <span key={`${need}-${index}`} className="client-details-care-need-pill">
                      {need}
                    </span>
                  ))
                ) : (
                  <span className="client-details-care-need-empty">No care needs listed</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="modal-actions client-details-modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
