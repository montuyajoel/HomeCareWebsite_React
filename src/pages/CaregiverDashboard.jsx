// src/pages/CaregiverDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import FiledLeavesModal from '../components/FiledLeavesModal';
import { authService } from '../services/authService';
import UserProfileModal from '../components/UserProfileModal';
import axios from 'axios';

//Icon
import { CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function CaregiverDashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [detailUser, setDetailUser] = useState(user);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(true);
  const [carePlanLoadingShiftId, setCarePlanLoadingShiftId] = useState(null);
  const [clockInSubmittingShiftId, setClockInSubmittingShiftId] = useState(null);
  const [clockOutSubmittingShiftId, setClockOutSubmittingShiftId] = useState(null);

  const [activeShift, setActiveShift] = useState(null);
  const [shiftNotice, setShiftNotice] = useState(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  
  // Leave request form states
  const [leaveType, setLeaveType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  const [leaveSuccessMessage, setLeaveSuccessMessage] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Filed leaves modal state
  const [filedLeavesModalOpen, setFiledLeavesModalOpen] = useState(false);

  // Fetch real shifts if they are available on the backend
  useEffect(() => {
    const fetchRealShifts = async () => {
      setIsLoadingShifts(true);
      const token = authService.getToken();
      if (!token) {
        setIsLoadingShifts(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/visits/today-shifts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.success && response.data.body && response.data.body.length > 0) {
          // Map backend structure to dashboard layout
          const mapped = response.data.body.map((s, idx) => ({
            id: s.scheduleId || `b_shift_${idx}`,
            visitId: s.visitLogId || null,
            clientId: s.client?._id || '',
            clientName: s.client?.fullName || 'Active Client',
            clientCode: s.client?.clientCode || 'CL000',
            address: s.client?.address ? `${s.client.address.addressLine}, ${s.client.address.county} ${s.client.address.city}, ${s.client.address.postCode}` : 'Not Specified',
            time: `${s.startTime} - ${s.endTime}`,
            notes: s.client?.notes || 'No special requirements listed.',
            status: s.hasClockedOut ? 'Completed' : (s.hasClockedIn ? 'Clocked In' : 'Pending'),
            clockInTime: s.hasClockedIn ? 'Already Logged' : null,
            clockOutTime: s.hasClockedOut ? 'Already Logged' : null,
            hasCarePlan: Boolean(s.client?.carePlan?.filePath),
            isClockOutTimeEnabled: Boolean(s.isClockOutTimeEnabled)
          }));
          setShifts(mapped);
        }
      } catch (err) {
        setShifts([]);
      } finally {
        setIsLoadingShifts(false);
      }
    };
    fetchRealShifts();
  }, []);

  // Get Detailed user info on mount
  useEffect(() => {
    const getDetailUserInfo = async () => { 
      setIsLoadingUser(true);
      const token = authService.getToken();
      if (!token) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/caregivers/${user?.employeeCode}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.data.success) {
          setDetailUser(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
      } finally {
        setIsLoadingUser(false);
      }
    };

    getDetailUserInfo();
  }, []);

  const getCurrentPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Location permission denied. Please allow location access and try again.'));
          return;
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error('Unable to determine your location. Please check your GPS and try again.'));
          return;
        }
        if (error.code === error.TIMEOUT) {
          reject(new Error('Location request timed out. Please try again.'));
          return;
        }
        reject(new Error('Unable to get your location. Please try again.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  const getClockInErrorMessage = (error) => {
    if (error?.message && !error.response) {
      return error.message;
    }

    const code = error.response?.data?.code;
    const message = error.response?.data?.message;

    if (code === 'CAREGIVER_NOT_FOUND') return 'Caregiver profile not found for this account.';
    if (code === 'NOT_YOUR_SHIFT') return 'This shift is not assigned to you.';
    if (code === 'SHIFT_MISMATCH') return message || 'The selected client/shift does not match.';
    if (code === 'ALREADY_IN_PROGRESS') return 'This shift is already in progress. Please go to Clock Out.';
    if (code === 'ALREADY_COMPLETED') return 'This shift has already been completed.';
    if (code === 'TOO_EARLY') return message || 'You are trying to clock in too early.';
    if (code === 'ADDRESS_MISSING') return 'Client address coordinates are missing. Please contact office admin.';
    if (code === 'LOCATION_TOO_FAR') return 'Your location is too far from the client address.';
    if (code === 'NOTE_REQUIRED') return message || 'A note is required for late clock-in.';

    return message || 'Clock-in failed. Please try again.';
  };

  const getClockOutErrorMessage = (error) => {
    if (error?.message && !error.response) {
      return error.message;
    }

    const code = error.response?.data?.code;
    const message = error.response?.data?.message;

    if (code === 'CAREGIVER_NOT_FOUND') return 'Caregiver profile not found for this account.';
    if (code === 'NOT_YOUR_VISIT') return 'This visit does not belong to you.';
    if (code === 'ALREADY_COMPLETED') return 'This visit has already been clocked out.';
    if (code === 'ADDRESS_MISSING') return 'Client address coordinates are missing. Please contact office admin.';
    if (code === 'LOCATION_TOO_FAR') return 'Your location is too far from the client address.';
    if (code === 'NOTE_REQUIRED') return message || 'A note is required for this clock-out.';

    return message || 'Clock-out failed. Please try again.';
  };

  const clearShiftNotice = () => {
    setShiftNotice(null);
  };

  const requestShiftComment = (shiftId, action, message) => {
    setShiftNotice({
      shiftId,
      action,
      message,
      comment: ''
    });
  };

  const performClockIn = async (shiftId, note = '') => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      alert('Selected shift was not found.');
      return;
    }

    if (!shift.clientId) {
      alert('Client ID is missing for this shift. Please refresh and try again.');
      return;
    }

    const token = authService.getToken();
    if (!token) {
      alert('Your session has expired. Please sign in again.');
      return;
    }

    setClockInSubmittingShiftId(shiftId);
    try {
      const { latitude, longitude } = await getCurrentPosition();
      const payloadBase = {
        scheduleId: shift.id,
        clientId: shift.clientId,
        latitude,
        longitude
      };

      const response = await axios.post(
        `${API_URL}/api/visits/clock-in`,
        { ...payloadBase, note },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Clock-in failed.');
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setShifts(prev => prev.map((s) => (
        s.id === shiftId ? { ...s, status: 'Clocked In', clockInTime: nowStr } : s
      )));
      setActiveShift(shiftId);
      clearShiftNotice();
    } catch (error) {
      if (error.response?.data?.code === 'NOTE_REQUIRED') {
        requestShiftComment(shiftId, 'clock-in', error.response?.data?.message || 'A note is required for late clock-in.');
        return;
      }

      alert(getClockInErrorMessage(error));
    } finally {
      setClockInSubmittingShiftId(null);
    }
  };

  const performClockOut = async (shiftId, note = '') => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      alert('Selected shift was not found.');
      return;
    }

    if (!shift.visitId) {
      alert('Visit record was not found for this shift. Please refresh and try again.');
      return;
    }

    if (!shift.clientId) {
      alert('Client ID is missing for this shift. Please refresh and try again.');
      return;
    }

    const token = authService.getToken();
    if (!token) {
      alert('Your session has expired. Please sign in again.');
      return;
    }

    setClockOutSubmittingShiftId(shiftId);
    try {
      const { latitude, longitude } = await getCurrentPosition();
      const payloadBase = {
        visitId: shift.visitId,
        scheduleId: shift.id,
        clientId: shift.clientId,
        latitude,
        longitude
      };

      const response = await axios.put(
        `${API_URL}/api/visits/clock-out`,
        { ...payloadBase, note },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Clock-out failed.');
      }

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setShifts(prev => prev.map((s) => (
        s.id === shiftId ? { ...s, status: 'Completed', clockOutTime: nowStr } : s
      )));

      if (activeShift === shiftId) {
        setActiveShift(null);
      }

      clearShiftNotice();
    } catch (error) {
      if (error.response?.data?.code === 'NOTE_REQUIRED') {
        requestShiftComment(shiftId, 'clock-out', error.response?.data?.message || 'A note is required for this clock-out.');
        return;
      }

      alert(getClockOutErrorMessage(error));
    } finally {
      setClockOutSubmittingShiftId(null);
    }
  };

  const handleClockIn = async (shiftId) => {
    // Check if another shift is currently clocked in
    const alreadyClockedIn = shifts.some(s => s.status === 'Clocked In');
    if (alreadyClockedIn) {
      alert("You are already clocked in to another shift. Please clock out of it first.");
      return;
    }

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      alert('Selected shift was not found.');
      return;
    }

    if (!shift.clientId) {
      alert('Client ID is missing for this shift. Please refresh and try again.');
      return;
    }

    const token = authService.getToken();
    if (!token) {
      alert('Your session has expired. Please sign in again.');
      return;
    }

    await performClockIn(shiftId);
  };

  const handleClockOut = async (shiftId) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) {
      alert('Selected shift was not found.');
      return;
    }

    if (!shift.visitId) {
      alert('Visit record was not found for this shift. Please refresh and try again.');
      return;
    }

    if (!shift.clientId) {
      alert('Client ID is missing for this shift. Please refresh and try again.');
      return;
    }

    const token = authService.getToken();
    if (!token) {
      alert('Your session has expired. Please sign in again.');
      return;
    }

    await performClockOut(shiftId);
  };

  const submitShiftNoticeComment = async () => {
    if (!shiftNotice) {
      return;
    }

    const trimmedComment = shiftNotice.comment.trim();
    if (!trimmedComment) {
      return;
    }

    if (shiftNotice.action === 'clock-in') {
      await performClockIn(shiftNotice.shiftId, trimmedComment);
      return;
    }

    await performClockOut(shiftNotice.shiftId, trimmedComment);
  };

  const handleViewCarePlan = async (shift) => {
    if (!shift.hasCarePlan) {
      return;
    }

    const token = authService.getToken();
    if (!token) {
      alert('Your session has expired. Please sign in again.');
      return;
    }

    setCarePlanLoadingShiftId(shift.id);
    const carePlanWindow = window.open('', '_blank');

    try {
      const response = await axios.get(`${API_URL}/api/clients/care-plan/${shift.clientCode}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf'
      });
      const blobUrl = URL.createObjectURL(blob);

      if (carePlanWindow) {
        carePlanWindow.location.href = blobUrl;
        carePlanWindow.focus();
      } else {
        window.location.assign(blobUrl);
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      if (error.response?.status === 404) {
        alert('No care plan file is currently available for this client.');
      } else {
        alert('Unable to open care plan right now. Please try again.');
      }
    } finally {
      setCarePlanLoadingShiftId(null);
    }
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
          setLeaveModalOpen(false);
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

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const currentClockedInShift = shifts.find(s => s.status === 'Clocked In');

  return (
    <div className="app-container">
      <Navbar />
      
      <main className="main-content">
        {/* Welcome Section */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Welcome back, {user?.fullName || 'Caregiver'}</h2>
            <p>Here is your shift schedule and quick daily management items for today.</p>
          </div>
          <button onClick={handleLogout} className="btn btn-outline btn-sm">
            Sign Out
          </button>
        </div>

        <div className="dashboard-grid">
          {/* Main Shift Schedule Section */}
          <div className="schedule-section">
            <h2 className="section-title">Today's Assigned Shifts</h2>
            
            {isLoadingShifts ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                <p>Loading your assigned shifts...</p>
              </div>
            ) : shifts.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                <p>No shifts assigned for today.</p>
              </div>
            ) : (
              <div className="shifts-list">
                {shifts.map((shift) => (
                  <DashboardCard key={shift.id} className="shift-card">
                    <div className="shift-header">
                      <div>
                        <h3>{shift.clientName}</h3>
                      </div>
                      <span className={`status-badge ${shift.status.toLowerCase().replace(' ', '-')}`}>
                        {shift.status}
                      </span>
                    </div>

                    <div className="shift-details">
                      <div className="detail-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{shift.time}</span>
                      </div>

                      <div className="detail-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{shift.address}</span>
                      </div>

                      <div className="detail-item notes">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <span>{shift.notes}</span>
                      </div>
                    </div>

                    {shiftNotice && shiftNotice.shiftId === shift.id && (
                      <div className="shift-notice-card" role="status" aria-live="polite">
                        <div className="shift-notice-header">
                          <div className="shift-notice-title-wrap">
                            <strong>Action required</strong>
                            <p>{shiftNotice.message}</p>
                          </div>
                          <button type="button" className="shift-notice-close" onClick={clearShiftNotice} aria-label="Dismiss notification">
                            ×
                          </button>
                        </div>

                        <label className="form-label shift-notice-label" htmlFor={`shift-comment-${shift.id}`}>
                          Add a comment
                        </label>
                        <textarea
                          id={`shift-comment-${shift.id}`}
                          className="form-input shift-notice-textarea"
                          rows="3"
                          value={shiftNotice.comment}
                          onChange={(e) => setShiftNotice(prev => prev ? { ...prev, comment: e.target.value } : prev)}
                          placeholder="Enter your comment here..."
                        />

                        <div className="shift-notice-actions">
                          <button type="button" className="btn btn-outline btn-sm" onClick={clearShiftNotice}>
                            Close
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={submitShiftNoticeComment}
                            disabled={!shiftNotice.comment.trim()}
                          >
                            Submit Comment
                          </button>
                        </div>
                      </div>
                    )}

                   <div className="shift-actions">
                      <button 
                        className={`btn btn-sm ${shift.hasCarePlan ? 'btn-outline' : 'btn-disabled'}`}
                        onClick={() => handleViewCarePlan(shift)}
                        disabled={!shift.hasCarePlan || carePlanLoadingShiftId === shift.id}
                        title={shift.hasCarePlan ? 'View official Client Care Plan PDF' : 'No care plan file uploaded'}
                      >
                        {carePlanLoadingShiftId === shift.id
                          ? 'Opening Plan...'
                          : shift.hasCarePlan
                            ? 'Care Plan PDF'
                            : 'No Care Plan'}
                      </button>

                      {shift.status === 'Pending' && (
                        <button 
                          onClick={() => handleClockIn(shift.id)} 
                          className="btn btn-primary btn-sm"
                          disabled={clockInSubmittingShiftId === shift.id}
                        >
                          {clockInSubmittingShiftId === shift.id
                            ? 'Clocking In...'
                            : 'Clock In'}
                        </button>
                      )}

                      {(shift.status === 'Clocked In' || shift.isClockOutTimeEnabled) && (
                        <button 
                          onClick={() => handleClockOut(shift.id)} 
                          className="btn btn-danger btn-sm"
                          disabled={clockOutSubmittingShiftId === shift.id}
                        >
                          {clockOutSubmittingShiftId === shift.id
                            ? 'Clocking Out...'
                            : 'Clock Out'}
                        </button>
                      )}

                      {shift.status === 'Completed' && (
                        <span className="completed-label">
                          <CheckCircle2 size={16} strokeWidth={2.5} />
                          Log Verified
                        </span>
                      )}
                    </div>
                  </DashboardCard>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="shortcuts-section">
            <h2 className="section-title">Quick Actions & Shortcuts</h2>
            
            <div className="shortcuts-grid">
              {/* Clock Status Widget */}
              <DashboardCard title="Shift Status" className="widget-card">
                <div className="status-widget-content">
                  {currentClockedInShift ? (
                    <div className="status-indicator active">
                      <span className="pulse-dot"></span>
                      <div>
                        <strong>Active Visit</strong>
                        <p>{currentClockedInShift.clientName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="status-indicator idle">
                      <span className="stable-dot"></span>
                      <div>
                        <strong>Off Duty</strong>
                        <p>No active shift logs</p>
                      </div>
                    </div>
                  )}
                </div>
              </DashboardCard>

              {/* Leave Request Shortcut */}
              <button
                onClick={() => navigate('/caregiver/upcoming-shifts')}
                className="shortcut-button-card card card-hoverable"
              >
                <div className="shortcut-icon-container">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="8" y1="14" x2="8" y2="18" />
                    <line x1="12" y1="14" x2="12" y2="18" />
                    <line x1="16" y1="14" x2="16" y2="18" />
                  </svg>
                </div>
                <h3>2 Weeks Shift Calendar</h3>
                <p>View your upcoming shifts in calendar layout</p>
              </button>

              {/* Leave Request Shortcut */}
              <button 
                onClick={() => setLeaveModalOpen(true)}
                className="shortcut-button-card card card-hoverable"
              >
                <div className="shortcut-icon-container">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3>Request Leave</h3>
                <p>Submit a request for days off</p>
              </button>

              {/* View Filed Leaves Shortcut */}
              <button 
                onClick={() => setFiledLeavesModalOpen(true)}
                className="shortcut-button-card card card-hoverable"
              >
                <div className="shortcut-icon-container">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <h3>My Filed Leaves</h3>
                <p>View status of filed requests</p>
              </button>

              {/* Profile Shortcut */}
              <button 
                onClick={() => setProfileModalOpen(true)}
                className="shortcut-button-card card card-hoverable"
              >
                <div className="shortcut-icon-container">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h3>My Profile</h3>
                <p>Verify registration code details</p>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Leave Request Modal */}
      {leaveModalOpen && (
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
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    disabled={isSubmittingLeave}
                    onClick={() => {
                      setLeaveModalOpen(false);
                      setLeaveError('');
                    }}
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
      )}
      
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        detailUser={detailUser}
      />

      {/* Filed Leaves Modal */}
      <FiledLeavesModal
        isOpen={filedLeavesModalOpen}
        onClose={() => setFiledLeavesModalOpen(false)}
      />
    </div>
  );
}