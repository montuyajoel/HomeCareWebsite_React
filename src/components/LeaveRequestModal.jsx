// src/components/LeaveRequestModal.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { authService } from '../services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function LeaveRequestModal({ isOpen, onClose, onOpenFiledLeaves, user }) {
  const [leaveType, setLeaveType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  const [leaveSuccessMessage, setLeaveSuccessMessage] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setLeaveError('');
    onClose();
  };

  const submitLeaveRequest = async (e) => {
    e.preventDefault();
    setLeaveError('');
    setLeaveSuccess(false);

    if (!leaveType) {
      setLeaveError('Please select a type of leave.');
      return;
    }
    if (!startDate) {
      setLeaveError('Please select a start date.');
      return;
    }
    if (!endDate) {
      setLeaveError('Please select an end date.');
      return;
    }

    // Validate that startDate is before endDate
    if (new Date(startDate) > new Date(endDate)) {
      setLeaveError('Start date must be before end date.');
      return;
    }

    // If vacation leave, apply 2 weeks notice rule
    if (leaveType === 'vacation') {
      const currentDate = new Date();
      const noticePeriod = 14; // 2 weeks in days
      const noticeDate = new Date(currentDate.getTime() + noticePeriod * 24 * 60 * 60 * 1000);
      
      if (new Date(startDate) < noticeDate) {
        setLeaveError('Vacation leave requests must be submitted at least 2 weeks in advance. You can ask for emergency leave if needed.');
        return;
      }
    }

    // If sick or emergency, the caregiver must provide a reason
    if ((leaveType === 'sick' || leaveType === 'emergency') && (!leaveReason || leaveReason.trim() === '')) {
      setLeaveError('Kindly provide a reason for sick or emergency leave types.');
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const token = authService.getToken();
      const payload = {
        employeeCode: user?.employeeCode || 'EMP003',
        leaveType,
        startDate,
        endDate,
        reason: leaveReason.trim()
      };

      const response = await axios.post(`${API_URL}/api/leave-requests/create`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        setLeaveSuccess(true);
        setLeaveSuccessMessage(response.data.message || 'Leave request created successfully.');
        setLeaveType('vacation');
        setStartDate('');
        setEndDate('');
        setLeaveReason('');
        setTimeout(() => {
          handleClose();
          setLeaveSuccess(false);
          setLeaveSuccessMessage('');
        }, 2000);
      } else {
        setLeaveError(response.data?.message || 'Failed to create leave request.');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create leave request.';
      setLeaveError(errorMsg);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-modal-title">
      <div className="modal-content card">
        <h2 id="leave-modal-title">Submit Leave Request</h2>
        
        {leaveSuccess ? (
          <div className="alert alert-success" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{leaveSuccessMessage || 'Leave request created successfully. Waiting for admin approval.'}</span>
          </div>
        ) : (
          <form onSubmit={submitLeaveRequest}>
            {leaveError && <div className="alert alert-danger" role="alert">{leaveError}</div>}
            
            <div className="form-group">
              <label className="form-label" htmlFor="leaveType">
                Type of Leave <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                id="leaveType"
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
              >
                <option value="vacation">Vacation</option>
                <option value="sick">Sick</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="startDate">
                Start Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="startDate"
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="endDate">
                End Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="endDate"
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="leaveReason">
                Reason for Absence{' '}
                {leaveType === 'sick' || leaveType === 'emergency' ? (
                  <span style={{ color: '#ef4444' }}>* (Required)</span>
                ) : (
                  <span style={{ color: '#64748b', fontWeight: 'normal' }}>(Optional)</span>
                )}
              </label>
              <textarea
                id="leaveReason"
                className="form-input"
                rows="3"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder={
                  leaveType === 'sick' || leaveType === 'emergency'
                    ? `Please state the reason for your ${leaveType} leave (required)...`
                    : 'Optional reason for vacation leave...'
                }
                required={leaveType === 'sick' || leaveType === 'emergency'}
              ></textarea>
            </div>

            <div className="modal-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              {onOpenFiledLeaves && (
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ marginRight: 'auto' }}
                  onClick={() => {
                    handleClose();
                    onOpenFiledLeaves();
                  }}
                >
                  View Filed Leaves
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-outline" 
                disabled={isSubmittingLeave}
                onClick={handleClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingLeave}>
                {isSubmittingLeave ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
