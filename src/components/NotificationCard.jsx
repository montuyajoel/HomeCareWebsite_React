import React from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';

function NotificationIcon({ type }) {
  if (type === 'success') {
    return (
      <CircleCheck
        size={28}
        strokeWidth={2.25}
        className="admin-notification-icon admin-notification-icon--success"
      />
    );
  }

  return (
    <CircleAlert
      size={28}
      strokeWidth={2.25}
      className={`admin-notification-icon admin-notification-icon--${type || 'info'}`}
    />
  );
}

/**
 * Modal notification / confirmation card.
 * Used for success, error, warning, info feedback and confirm dialogs.
 */
export default function NotificationCard({
  type = 'info',
  title,
  message,
  confirmLabel = '',
  onConfirm = null,
  onClose,
  titleId = 'notification-card-title'
}) {
  if (!title && !message) return null;

  return (
    <div
      className="modal-overlay admin-notification-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className={`card admin-notification-card admin-notification-card--${type}`}>
        <div className="admin-notification-content">
          <div className="admin-notification-icon-wrapper">
            <NotificationIcon type={type} />
          </div>

          <div className="admin-notification-body">
            <div className="admin-notification-header">
              <div>
                <h3 id={titleId} className="admin-notification-title">
                  {title}
                </h3>
                {message && <p className="admin-notification-message">{message}</p>}
              </div>

              {!onConfirm && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close notification"
                  className="admin-notification-close"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="modal-actions admin-notification-actions">
              {onConfirm ? (
                <>
                  <button type="button" className="btn btn-outline" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={onConfirm}>
                    {confirmLabel || 'Confirm'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={onClose}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
