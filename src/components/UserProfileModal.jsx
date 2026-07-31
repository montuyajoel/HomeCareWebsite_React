// src/components/UserProfileModal.jsx
import React from 'react';

export default function UserProfileModal({ isOpen, onClose, user }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="modal-content card">
        <h2 id="profile-modal-title">Employee Profile</h2>
        <div className="profile-details-list">
          <div className="profile-detail-row">
            <strong>Full Name:</strong>
            <span>{user?.fullName}</span>
          </div>
          <div className="profile-detail-row">
            <strong>Employee Code:</strong>
            <span>{user?.employeeCode}</span>
          </div>
          <div className="profile-detail-row">
            <strong>Assigned Role:</strong>
            <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
          <div className="profile-detail-row">
            <strong>Base Office:</strong>
            <span>Dublin HQ Office</span>
          </div>
          <div className="profile-detail-row">
            <strong>System ID:</strong>
            <code style={{ fontSize: '0.8rem', background: '#F1F5F9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
              {user?.id || 'MOCK_USER_ID_992'}
            </code>
          </div>
        </div>
        <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
