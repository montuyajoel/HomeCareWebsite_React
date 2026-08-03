// src/components/FiledLeavesModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { authService } from '../services/authService';
import '../styles/filedLeaves.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function FiledLeavesModal({ isOpen, onClose }) {
  const user = authService.getCurrentUser();

  const [filedLeaves, setFiledLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [editingLeave, setEditingLeave] = useState(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editError, setEditError] = useState('');
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);

  const [cancellingLeave, setCancellingLeave] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [isCancellingLeave, setIsCancellingLeave] = useState(false);

  const fetchFiledLeaves = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

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

    if (s === 'cancelled') {
      return { backgroundColor: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1' };
    }

    return { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
  };

  const updateFiledLeaveState = (updatedLeave) => {
    const updatedLeaveId = updatedLeave?._id || updatedLeave?.id;
    if (!updatedLeaveId) return;

    setFiledLeaves((prev) => prev.map((item) => {
      const itemId = item._id || item.id;

      return itemId === updatedLeaveId
        ? { ...item, ...updatedLeave }
        : item;
    }));
  };

  const openEditLeave = (item) => {
    if ((item.status || '').toLowerCase() !== 'pending') return;

    setEditingLeave(item);
    setEditStartDate(formatLeaveDate(item.startDate));
    setEditEndDate(formatLeaveDate(item.endDate));
    setEditError('');
    setSuccessMessage('');
  };

  const closeEditLeave = () => {
    if (isUpdatingDates) return;

    setEditingLeave(null);
    setEditStartDate('');
    setEditEndDate('');
    setEditError('');
  };

  const submitLeaveDateChange = async (e) => {
    e.preventDefault();
    if (!editingLeave) return;

    setEditError('');

    if (!editStartDate || !editEndDate) {
      setEditError('Start date and end date are required.');
      return;
    }

    if (new Date(editStartDate) > new Date(editEndDate)) {
      setEditError('Start date must be before or equal to end date.');
      return;
    }

    if ((editingLeave.status || '').toLowerCase() !== 'pending') {
      setEditError('Only pending leave requests can be edited.');
      return;
    }

    const leaveId = editingLeave._id || editingLeave.id;
    const caregiverCode = editingLeave.employeeCode || user?.employeeCode;
    const token = authService.getToken();

    if (!leaveId) {
      setEditError('Leave request ID is missing.');
      return;
    }

    if (!caregiverCode) {
      setEditError('Caregiver employee code is missing.');
      return;
    }

    if (!token) {
      setEditError('Session expired. Please sign in again.');
      return;
    }

    setIsUpdatingDates(true);

    try {
      const response = await axios.put(
        `${API_URL}/api/leave-requests/update/caregiver/${leaveId}?type=change_date`,
        {
          caregiverCode,
          startDate: `${editStartDate}T00:00:00.000Z`,
          endDate: `${editEndDate}T00:00:00.000Z`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to update leave request dates.');
      }

      updateFiledLeaveState(response.data.data);
      setSuccessMessage(response.data?.message || 'Leave request dates updated successfully.');
      closeEditLeave();
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Failed to update leave request dates.');
    } finally {
      setIsUpdatingDates(false);
    }
  };

  const openCancelLeave = (item) => {
    if ((item.status || '').toLowerCase() !== 'pending') return;

    setCancellingLeave(item);
    setCancelError('');
    setSuccessMessage('');
  };

  const closeCancelLeave = () => {
    if (isCancellingLeave) return;

    setCancellingLeave(null);
    setCancelError('');
  };

  const confirmCancelLeave = async () => {
    if (!cancellingLeave) return;

    if ((cancellingLeave.status || '').toLowerCase() !== 'pending') {
      setCancelError('Only pending leave requests can be cancelled.');
      return;
    }

    const leaveId = cancellingLeave._id || cancellingLeave.id;
    const token = authService.getToken();

    if (!leaveId) {
      setCancelError('Leave request ID is missing.');
      return;
    }

    if (!token) {
      setCancelError('Session expired. Please sign in again.');
      return;
    }

    setIsCancellingLeave(true);
    setCancelError('');

    try {
      const response = await axios.put(
        `${API_URL}/api/leave-requests/update/caregiver/${leaveId}?type=cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to cancel leave request.');
      }

      updateFiledLeaveState(response.data.data);
      setSuccessMessage(response.data?.message || 'Leave request cancelled successfully.');
      closeCancelLeave();
    } catch (err) {
      setCancelError(err.response?.data?.message || err.message || 'Failed to cancel leave request.');
    } finally {
      setIsCancellingLeave(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="filed-leaves-modal-title">
        <div className="modal-content card filed-leaves-modal">
          <div className="filed-leaves-header">
            <h2 id="filed-leaves-modal-title">My Filed Leave Requests</h2>
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

          {successMessage && (
            <div className="alert alert-success" role="alert">
              {successMessage}
            </div>
          )}

          {isLoading ? (
            <div className="filed-leaves-state">
              Loading filed leave requests...
            </div>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : filedLeaves.length === 0 ? (
            <div className="filed-leaves-state">
              <p>No filed leave requests found.</p>
            </div>
          ) : (
            <div className="filed-leaves-list">
              {filedLeaves.map((item) => {
                const startStr = formatLeaveDate(item.startDate);
                const endStr = formatLeaveDate(item.endDate);
                const dateDisplay = startStr === endStr ? startStr : `${startStr} to ${endStr}`;
                const badgeStyle = getStatusBadgeStyle(item.status);
                const isPending = (item.status || '').toLowerCase() === 'pending';

                return (
                  <div key={item._id || item.id} className="filed-leave-card">
                    <div className="filed-leave-card-header">
                      <span className="filed-leave-type">
                        {item.leaveType} Leave
                      </span>
                      <span className="filed-leave-status" style={badgeStyle}>
                        {item.status || 'pending'}
                      </span>
                    </div>

                    <div className="filed-leave-dates">
                      <strong>Dates:</strong> {dateDisplay}
                    </div>

                    {item.reason && (
                      <div className="filed-leave-reason">
                        <strong>Reason:</strong> "{item.reason}"
                      </div>
                    )}

                    {item.adminNotes && item.adminNotes.trim() !== '' && (
                      <div className="filed-leave-admin-note">
                        <strong>Admin Note:</strong> {item.adminNotes}
                      </div>
                    )}

                    {isPending && (
                      <div className="filed-leave-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openEditLeave(item)}
                        >
                          Edit Dates
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => openCancelLeave(item)}
                        >
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="modal-actions filed-leaves-footer">
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

      {editingLeave && (
        <div className="modal-overlay filed-leave-action-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-leave-dates-title">
          <div className="modal-content card filed-leave-action-modal">
            <div className="filed-leave-action-header">
              <div>
                <h2 id="edit-leave-dates-title">Edit Leave Dates</h2>
                <p>Change the requested start and end dates while the request is pending.</p>
              </div>
            </div>

            {editError && (
              <div className="alert alert-danger" role="alert">
                {editError}
              </div>
            )}

            <form onSubmit={submitLeaveDateChange}>
              <div className="filed-leave-date-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="editLeaveStartDate">Start Date</label>
                  <input
                    id="editLeaveStartDate"
                    type="date"
                    className="form-input"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    disabled={isUpdatingDates}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="editLeaveEndDate">End Date</label>
                  <input
                    id="editLeaveEndDate"
                    type="date"
                    className="form-input"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    disabled={isUpdatingDates}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions filed-leave-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeEditLeave}
                  disabled={isUpdatingDates}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdatingDates}
                >
                  {isUpdatingDates ? 'Updating...' : 'Save Dates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancellingLeave && (
        <div className="modal-overlay filed-leave-action-overlay" role="dialog" aria-modal="true" aria-labelledby="cancel-leave-title">
          <div className="modal-content card filed-leave-action-modal filed-leave-cancel-modal">
            <div className="filed-leave-cancel-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h2 id="cancel-leave-title">Cancel Leave Request</h2>
            <p className="filed-leave-cancel-copy">
              Cancel the <strong>{cancellingLeave.leaveType} leave</strong> scheduled from{' '}
              <strong>{formatLeaveDate(cancellingLeave.startDate)}</strong> to{' '}
              <strong>{formatLeaveDate(cancellingLeave.endDate)}</strong>?
            </p>

            {cancelError && (
              <div className="alert alert-danger" role="alert">
                {cancelError}
              </div>
            )}

            <div className="modal-actions filed-leave-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeCancelLeave}
                disabled={isCancellingLeave}
              >
                Keep Request
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmCancelLeave}
                disabled={isCancellingLeave}
              >
                {isCancellingLeave ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}