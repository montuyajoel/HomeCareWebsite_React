//components/AffectedShiftsModal.jsx
//Its purpose is to show the scheduled shifts that will be affected when an admin approves
//or rejects a caregiver’s leave request.
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/affectedShifts.css';

const formatShiftDate = (value) => {
  if (!value) return 'N/A';

  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

const formatShiftTime = (value) => {
  if (!value) return 'N/A';

  const [hoursValue, minutesValue] = value.split(':');
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

export default function AffectedShiftsModal({
  request,
  status,
  affectedShifts,
  isSubmitting,
  onCancel,
  onConfirm
}) {
  const hasAffectedShifts = affectedShifts.length > 0;
  const actionLabel = status === 'approved' ? 'approve' : 'reject';
  const confirmLabel = status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="affected-shifts-title">
      <div className="modal-content card affected-shifts-modal">
        <div className="affected-shifts-header">
          <div className="affected-shifts-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 id="affected-shifts-title">
              {hasAffectedShifts ? 'Affected Shifts Found' : 'Confirm Leave Decision'}
            </h2>
            <p className="affected-shifts-subtitle">
              {request.fullName} | {request.employeeCode} | {request.leaveType}
            </p>
          </div>
        </div>

        {hasAffectedShifts ? (
          <div className="alert alert-warning affected-shifts-warning" role="alert">
            This leave period overlaps with {affectedShifts.length} scheduled {affectedShifts.length === 1 ? 'shift' : 'shifts'}. Review the records before you {actionLabel} the request.
          </div>
        ) : (
          <div className="affected-shifts-clear-state">
            No scheduled shifts were found within the requested leave period.
          </div>
        )}

        {hasAffectedShifts && (
          <div className="affected-shifts-list">
            {affectedShifts.map((shift) => (
              <div key={shift._id} className="affected-shift-card">
                <div className="affected-shift-client">
                  <strong>{shift.client?.fullName || 'Unknown client'}</strong>
                  <span>{shift.client?.clientCode || 'No client code'}</span>
                </div>
                <div className="affected-shift-schedule">
                  <strong>{formatShiftDate(shift.date)}</strong>
                  <span>{formatShiftTime(shift.startTime)} - {formatShiftTime(shift.endTime)}</span>
                  {shift.client?.clientCode && (
                    <Link
                      to={`/admin/assign-schedule?clientCode=${encodeURIComponent(shift.client.clientCode)}`}
                      className="affected-shift-reassign-link"
                      style={{ display: 'block', marginTop: 6, fontSize: '0.85rem' }}
                    >
                      Reassign this shift →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions affected-shifts-actions">
          <button className="btn btn-outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className={`btn ${status === 'approved' ? 'btn-primary' : 'btn-danger'}`}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting && <span className="spinner" aria-hidden="true" />}
            {isSubmitting ? 'Updating...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}