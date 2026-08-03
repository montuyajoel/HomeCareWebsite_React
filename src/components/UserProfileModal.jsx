// src/components/UserProfileModal.jsx
import React from 'react';

export default function UserProfileModal({ isOpen, onClose, detailUser }) {
  if (!isOpen) return null;

  return (
     <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
          <div className="modal-content card">
            <h2 id="profile-modal-title">Employee Profile</h2>
            <div className="profile-details-list">
              <div className="profile-detail-row">
                <strong>Full Name:</strong>
                <span>{detailUser?.fullName}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Employee Code:</strong>
                <span>{detailUser?.employeeCode}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Location:</strong>
                <span>{detailUser?.locationCode}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Phone Number:</strong>
                <span>{detailUser?.phoneNumber || 'N/A'}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Status:</strong>
                <code style={{ fontSize: '0.8rem', background: '#F1F5F9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                  {detailUser?.status || 'MOCK_USER_ID_992'}
                </code>
              </div>
              <div className="profile-detail-row profile-skills-row">
              <strong>Skills:</strong>

              <div className="profile-skills-list">
                {Array.isArray(detailUser?.skills) && detailUser.skills.length > 0 ? (
                  detailUser.skills.map((skill, index) => (
                    <span key={`${skill}-${index}`} className="profile-skill-pill">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="profile-skill-empty">No skills available</span>
                )}
              </div>
            </div>
            <div className="profile-detail-row profile-availability-row">
              <strong>Availability:</strong>

              <div className="profile-availability-list">
                {Array.isArray(detailUser?.availability) &&
                detailUser.availability.length > 0 ? (
                  detailUser.availability.map((availability) => (
                    <div
                      key={availability._id}
                      className="profile-availability-item"
                    >
                      <span className="profile-availability-day">
                        {availability.day}
                      </span>

                      <span className="profile-availability-time">
                        {availability.startTime} - {availability.endTime}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="profile-availability-empty">
                    No availability available
                  </span>
                )}
              </div>
            </div>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-primary" onClick={() => onClose(false)}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
  );
}
