// src/components/CarePlanPdfModal.jsx
import React from 'react';
import '../styles/carePlanPdfModal.css';

export default function CarePlanPdfModal({
  isOpen,
  title,
  pdfUrl,
  isLoading,
  error,
  onClose
}) {
  if (!isOpen) return null;

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
      aria-labelledby="care-plan-pdf-title"
      onClick={handleOverlayClick}
    >
      <div className="modal-content card care-plan-pdf-modal">
        <div className="care-plan-pdf-modal-header">
          <div className="care-plan-pdf-modal-heading">
            <h2 id="care-plan-pdf-title" className="care-plan-pdf-modal-title">
              Care Plan PDF
            </h2>
            {title ? (
              <span className="care-plan-pdf-modal-subtitle">{title}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="care-plan-pdf-modal-close"
            onClick={onClose}
            aria-label="Close care plan PDF"
          >
            &times;
          </button>
        </div>

        <div className="care-plan-pdf-modal-body">
          {isLoading && (
            <div className="care-plan-pdf-modal-status" role="status">
              Loading care plan…
            </div>
          )}

          {!isLoading && error && (
            <div className="care-plan-pdf-modal-status care-plan-pdf-modal-error" role="alert">
              {error}
            </div>
          )}

          {!isLoading && !error && pdfUrl && (
            <iframe
              className="care-plan-pdf-iframe"
              title="Care Plan PDF"
              src={pdfUrl}
            />
          )}
        </div>

        <div className="modal-actions care-plan-pdf-modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
