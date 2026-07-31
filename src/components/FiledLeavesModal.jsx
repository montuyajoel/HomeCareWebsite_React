// src/components/FiledLeavesModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { authService } from '../services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function FiledLeavesModal({ isOpen, onClose }) {
  const [filedLeaves, setFiledLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFiledLeaves = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const token = authService.getToken();
    if (!token) {
      setError('Session expired. Please sign in again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/leave-requests/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        setFiledLeaves(response.data.data || []);
      } else {
        setError(response.data?.message || 'Failed to fetch leave requests.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load filed leave requests.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFiledLeaves();
    }
  }, [isOpen, fetchFiledLeaves]);

  if (!isOpen) return null;

  const formatLeaveDate = (isoStr) => {
    if (!isoStr) return '';
    return isoStr.split('T')[0];
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') {
      return { backgroundColor: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' };
    }
    if (s === 'rejected' || s === 'denied') {
      return { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' };
    }
    return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="filed-leaves-modal-title">
      <div className="modal-content card" style={{ maxWidth: '600px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 id="filed-leaves-modal-title" style={{ margin: 0 }}>My Filed Leave Requests</h2>
          <button 
            type="button" 
            className="btn btn-outline btn-sm"
            onClick={fetchFiledLeaves}
            disabled={isLoading}
            title="Refresh leave requests"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            Loading filed leave requests...
          </div>
        ) : error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : filedLeaves.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            <p>No filed leave requests found.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingRight: '4px' }}>
            {filedLeaves.map((item) => {
              const startStr = formatLeaveDate(item.startDate);
              const endStr = formatLeaveDate(item.endDate);
              const dateDisplay = startStr === endStr ? startStr : `${startStr} to ${endStr}`;
              const badgeStyle = getStatusBadgeStyle(item.status);

              return (
                <div 
                  key={item._id || item.id} 
                  style={{ 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '1rem',
                    backgroundColor: '#fafafa',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '1rem', textTransform: 'capitalize', color: 'var(--color-text-main)' }}>
                      {item.leaveType} Leave
                    </span>
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        padding: '0.25rem 0.65rem', 
                        borderRadius: '12px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        ...badgeStyle
                      }}
                    >
                      {item.status || 'pending'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.5rem' }}>
                    📅 <strong>Dates:</strong> {dateDisplay}
                  </div>

                  {item.reason && (
                    <div style={{ fontSize: '0.875rem', color: '#334155' }}>
                      <strong>Reason:</strong> "{item.reason}"
                    </div>
                  )}

                  {/* Only show adminNotes if there is any */}
                  {item.adminNotes && item.adminNotes.trim() !== '' && (
                    <div 
                      style={{ 
                        marginTop: '0.65rem', 
                        padding: '0.5rem 0.75rem', 
                        backgroundColor: '#f1f5f9', 
                        borderRadius: '6px', 
                        fontSize: '0.825rem',
                        color: '#334155',
                        borderLeft: '3px solid #3b82f6'
                      }}
                    >
                      <strong>Admin Note:</strong> {item.adminNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
