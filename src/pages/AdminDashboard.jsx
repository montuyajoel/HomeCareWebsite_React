// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import AffectedShiftsModal from '../components/AffectedShiftsModal';
import { authService } from '../services/authService';
import axios from 'axios';
import { API_URL } from '../config/api';

const formatShiftTime = (time) => {
  if (!time) return '—';
  return String(time).slice(0, 5);
};

const formatClientLocation = (address) => {
  if (!address) return '—';
  const parts = [address.addressLine, address.town, address.city, address.postCode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
};

const formatVisitStatusLabel = (visitStatus, scheduleStatus) => {
  if (visitStatus) {
    return String(visitStatus)
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  if (scheduleStatus) {
    return String(scheduleStatus)
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Not started';
};

const getVisitStatusClass = (visitStatus, scheduleStatus) =>
  String(visitStatus || scheduleStatus || 'pending')
    .toLowerCase()
    .replace(/\s+/g, '-');

const pickRelevantShift = (schedules = {}) => {
  const current = schedules.current || [];
  const upcoming = schedules.upcoming || [];
  const done = schedules.done || [];

  if (current.length > 0) {
    return { schedule: current[0], phase: 'current', label: 'Current' };
  }
  if (upcoming.length > 0) {
    return { schedule: upcoming[0], phase: 'upcoming', label: 'Upcoming' };
  }
  if (done.length > 0) {
    return { schedule: done[done.length - 1], phase: 'done', label: 'Last' };
  }
  return null;
};

const getSchedulePhaseCounts = (item) => {
  const counts = item.counts || {};
  const schedules = item.schedules || {};
  const fromArrays = {
    current: Array.isArray(schedules.current) ? schedules.current.length : 0,
    upcoming: Array.isArray(schedules.upcoming) ? schedules.upcoming.length : 0,
    done: Array.isArray(schedules.done) ? schedules.done.length : 0
  };

  return {
    current: Math.max(fromArrays.current, Number(counts.current) || 0),
    upcoming: Math.max(fromArrays.upcoming, Number(counts.upcoming) || 0),
    done: Math.max(fromArrays.done, Number(counts.done) || 0)
  };
};

const currentUpcomingDoneTotal = ({ current = 0, upcoming = 0, done = 0 } = {}) =>
  current + upcoming + done;

const normalizeOnDutyCaregiver = (item) => {
  const caregiver = item.caregiver || item;
  const relevant = pickRelevantShift(item.schedules);
  const schedule = relevant?.schedule;
  const client = schedule?.client;
  const phaseCounts = getSchedulePhaseCounts(item);
  const scheduleCount = currentUpcomingDoneTotal(phaseCounts) || Number(item.scheduleCount) || 0;

  return {
    id: caregiver._id || caregiver.employeeCode,
    name: caregiver.fullName || 'N/A',
    code: caregiver.employeeCode || 'N/A',
    onDuty: Boolean(item.onDuty),
    phase: relevant?.phase || null,
    phaseLabel: relevant?.label || '—',
    clientName: client?.fullName || '—',
    shiftWindow: schedule
      ? `${formatShiftTime(schedule.startTime)}–${formatShiftTime(schedule.endTime)}`
      : '—',
    visitStatus: schedule?.visitStatus || null,
    visitStatusLabel: formatVisitStatusLabel(schedule?.visitStatus, schedule?.scheduleStatus),
    visitStatusClass: getVisitStatusClass(schedule?.visitStatus, schedule?.scheduleStatus),
    location: formatClientLocation(client?.address),
    currentCount: phaseCounts.current,
    upcomingCount: phaseCounts.upcoming,
    doneCount: phaseCounts.done,
    scheduleCount
  };
};

const calculateTodayVisitStats = (caregiverRows = [], summary = {}) => {
  const totals = caregiverRows.reduce(
    (acc, row) => {
      const current = Number(row.currentCount) || 0;
      const upcoming = Number(row.upcomingCount) || 0;
      const done = Number(row.doneCount) || 0;
      let rowTotal = current + upcoming + done;

      if (rowTotal === 0 && Number(row.scheduleCount) > 0) {
        rowTotal = Number(row.scheduleCount);
        acc.pending += rowTotal;
      } else {
        acc.completed += done;
        acc.pending += current + upcoming;
      }

      acc.total += rowTotal;
      return acc;
    },
    { total: 0, completed: 0, pending: 0 }
  );

  const summaryTotal = Number(summary.totalSchedules);
  const totalVisits = Number.isFinite(summaryTotal)
    ? Math.max(summaryTotal, totals.total)
    : totals.total;

  return {
    totalVisits,
    completedVisits: totals.completed,
    pendingVisits: totals.pending > 0 ? totals.pending : Math.max(0, totalVisits - totals.completed)
  };
};

const normalizeLeaveRequest = (item) => ({
  id: item._id,
  employeeCode: item.employeeCode || 'N/A',
  fullName: item.fullName || item.employeeName || item.employeeCode || 'N/A',
  leaveType: item.leaveType || 'leave',
  startDate: item.startDate || '',
  endDate: item.endDate || '',
  reason: item.reason || '',
  status: (item.status || 'pending').toLowerCase(),
  adminNotes: item.adminNotes || '',
  createdAt: item.createdAt || item.startDate || '',
  updatedAt: item.updatedAt || item.createdAt || ''
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  // Metrics
  const [stats, setStats] = useState({
    totalVisits: 0,
    completedVisits: 0,
    pendingVisits: 0,
    onDutyCount: 0,
    pendingLeaves: 0
  });

  // Caregivers currently on duty
  const [onDutyCaregivers, setOnDutyCaregivers] = useState([]);
  const [onDutyLoading, setOnDutyLoading] = useState(true);
  const [onDutyError, setOnDutyError] = useState('');

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(true);
  const [leaveRequestsError, setLeaveRequestsError] = useState('');
  const [commentRequest, setCommentRequest] = useState(null);
  const [draftComment, setDraftComment] = useState('');
  const [isCheckingAffectedShifts, setIsCheckingAffectedShifts] = useState(false);
  const [checkingRequestId, setCheckingRequestId] = useState(null);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [affectedShifts, setAffectedShifts] = useState([]);
  const [isConfirmingDecision, setIsConfirmingDecision] = useState(false);
  const [commentAction, setCommentAction] = useState('comment');

  // Active Management Drawer placeholder toggles
  const [activeDrawer, setActiveDrawer] = useState(null); // 'schedule', 'client', 'caregiver' or null
  const [drawerSuccess, setDrawerSuccess] = useState('');

  useEffect(() => {
    const fetchOnDutyCaregivers = async () => {
      const token = authService.getToken();
      if (!token) {
        setOnDutyLoading(false);
        return;
      }

      setOnDutyLoading(true);
      setOnDutyError('');

      try {
        const response = await axios.get(`${API_URL}/api/visits/caregivers-with-shift-today`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Failed to load caregivers on duty.');
        }

        const caregiverData = response.data.data || response.data.body || [];
        const normalized = caregiverData.map(normalizeOnDutyCaregiver);
        const summary = response.data.summary || {};
        const visitStats = calculateTodayVisitStats(normalized, summary);

        setOnDutyCaregivers(normalized);
        setStats((prev) => ({
          ...prev,
          ...visitStats,
          onDutyCount: typeof summary.onDutyCount === 'number'
            ? summary.onDutyCount
            : normalized.filter((c) => c.onDuty).length
        }));
      } catch (err) {
        setOnDutyError(err.response?.data?.message || err.message || 'Failed to load caregivers on duty.');
        setOnDutyCaregivers([]);
        setStats((prev) => ({
          ...prev,
          totalVisits: 0,
          completedVisits: 0,
          pendingVisits: 0,
          onDutyCount: 0
        }));
      } finally {
        setOnDutyLoading(false);
      }
    };

    fetchOnDutyCaregivers();
  }, []);

  useEffect(() => {
    const fetchPendingLeaveRequests = async () => {
      const token = authService.getToken();
      if (!token) {
        setLeaveRequestsLoading(false);
        return;
      }

      setLeaveRequestsLoading(true);
      setLeaveRequestsError('');

      try {
        const response = await axios.get(`${API_URL}/api/leave-requests/get?status=pending`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Failed to load leave requests.');
        }

        const leaveRequestData = response.data.data || response.data.body || [];
        const pendingRequests = leaveRequestData
          .map(normalizeLeaveRequest)
          .filter(request => request.status === 'pending')
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        setLeaveRequests(pendingRequests);
        setStats(prev => ({
          ...prev,
          pendingLeaves: pendingRequests.length
        }));
      } catch (err) {
        setLeaveRequestsError(err.response?.data?.message || err.message || 'Failed to load leave requests.');
      } finally {
        setLeaveRequestsLoading(false);
      }
    };

    fetchPendingLeaveRequests();
  }, []);

  const oldestPendingLeaveRequests = leaveRequests.slice(0, 5);

  const updateLeaveRequest = async (leaveRequestId, status, adminNotes = '') => {
    const token = authService.getToken();
    if (!token) {
      alert('Your session has expired. Please sign in again.');
      return false;
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/leave-requests/update/admin`,
        { leaveRequestId, status, adminNotes },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to update leave request.');
      }

      return true;
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to update leave request.');
      return false;
    }
  };

  // Check for affected shifts before approving or rejecting a leave request
  const checkAffectedShifts = async (request, status, adminNotes = '') => {
    const token = authService.getToken();
    if (!token) {
      alert('Your session has expired. Please sign in again.');
      return false;
    }

    setIsCheckingAffectedShifts(true);
    setCheckingRequestId(request.id);

    try {
      const response = await axios.get(
        `${API_URL}/api/leave-requests/check-affected-shifts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            employeeCode: request.employeeCode,
            startDate: request.startDate,
            endDate: request.endDate
          }
        }
      );

      const shifts = Array.isArray(response.data?.data) ? response.data.data : [];

      setAffectedShifts(shifts);
      setPendingDecision({ request, status, adminNotes });
      return true;
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to check affected shifts.');
      return false;
    } finally {
      setIsCheckingAffectedShifts(false);
      setCheckingRequestId(null);
    }
  };

  const handleApproveLeave = async (request) => {
    await checkAffectedShifts(request, 'approved', request.adminNotes || '');
  };

  const openRejectComment = (request) => {
    setCommentRequest(request);
    setDraftComment(request.adminNotes || '');
    setCommentAction('reject');
  };

  const closeCommentModal = () => {
    if (isCheckingAffectedShifts) return;

    setCommentRequest(null);
    setDraftComment('');
    setCommentAction('comment');
  };

  const handleReviewReject = async () => {
    if (!commentRequest) return;

    if (!draftComment.trim()) {
      alert('A comment is required when rejecting a leave request.');
      return;
    }

    const checked = await checkAffectedShifts(
      commentRequest,
      'rejected',
      draftComment.trim()
    );

    if (!checked) return;

    setCommentRequest(null);
    setDraftComment('');
    setCommentAction('comment');
  };

  const closeAffectedShiftsModal = () => {
    if (isConfirmingDecision) return;

    setPendingDecision(null);
    setAffectedShifts([]);
  };

  const confirmLeaveDecision = async () => {
    if (!pendingDecision) return;

    const { request, status, adminNotes } = pendingDecision;
    setIsConfirmingDecision(true);

    try {
      const updated = await updateLeaveRequest(request.id, status, adminNotes);
      if (!updated) return;

      setLeaveRequests(prev => prev.filter(item => item.id !== request.id));
      setStats(prev => ({
        ...prev,
        pendingLeaves: Math.max(0, prev.pendingLeaves - 1)
      }));

      setPendingDecision(null);
      setAffectedShifts([]);
      alert(`Leave request ${status} successfully.`);
    } finally {
      setIsConfirmingDecision(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const openManagementDrawer = (type) => {
    setActiveDrawer(type);
    setDrawerSuccess('');
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        {/* Welcome Row */}
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>Admin Control Center</h2>
            <p>Welcome back, Administrator. Real-time overview of schedules, check-ins, and leave requests.</p>
          </div>
          <button onClick={handleLogout} className="btn btn-outline btn-sm logout-shortcut">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>

        {/* 1. Summary Cards Row */}
        <div className="summary-cards-grid">
          <div className="metric-card card">
            <div className="metric-icon-box blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="metric-details">
              <span className="metric-num">{stats.totalVisits}</span>
              <span className="metric-label">Visits Scheduled Today</span>
            </div>
          </div>

          <div className="metric-card card">
            <div className="metric-icon-box green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="metric-details">
              <span className="metric-num text-success">{stats.completedVisits}</span>
              <span className="metric-label">Completed Visits</span>
            </div>
          </div>

          <div className="metric-card card">
            <div className="metric-icon-box orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="metric-details">
              <span className="metric-num text-warning">{stats.pendingVisits}</span>
              <span className="metric-label">Pending Shifts</span>
            </div>
          </div>

          <div className="metric-card card">
            <div className="metric-icon-box blue-tint">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="metric-details">
              <span className="metric-num">{stats.onDutyCount}</span>
              <span className="metric-label">Caregivers On Duty</span>
            </div>
          </div>

          <div className="metric-card card">
            <div className="metric-icon-box red-tint">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M21 9H3M21 15H3M12 3v18" />
              </svg>
            </div>
            <div className="metric-details">
              <span className="metric-num text-danger">{stats.pendingLeaves}</span>
              <span className="metric-label">Leave Requests</span>
            </div>
          </div>
        </div>

        {/* 2. Management Shortcuts Row */}
        <div className="management-shortcuts-section">
          <h3 className="section-title-sub">Quick Administration Actions</h3>
          <div className="admin-shortcuts-grid">
            {/* <button className="shortcut-action-card card" onClick={() => openManagementDrawer('schedule')}>*/}
            <button className="shortcut-action-card card" onClick={() => { navigate('/admin/assign-schedule')} }>
              <div className="action-card-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div className="shortcut-action-copy">
                <h4>Assign Schedule</h4>
                <p>Pick a client, build multi-day slots, assign caregiver</p>
              </div>
            </button>

            <button className="shortcut-action-card card" onClick={() => navigate('/admin/schedule')}>
              <div className="action-card-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="shortcut-action-copy">
                <h4>Schedule Board</h4>
                <p>View daily shifts, reassign or cancel assignments</p>
              </div>
            </button>

            <button className="shortcut-action-card card" onClick={() => navigate('/admin/clients')}>
              <div className="action-card-icon green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="shortcut-action-copy">
                <h4>Client Records</h4>
                <p>Register new clients, edit care plans and needs</p>
              </div>
            </button>

            <button className="shortcut-action-card card" onClick={() => navigate('/admin/caregivers')}>
              <div className="action-card-icon orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="shortcut-action-copy">
                <h4>Caregivers Directory</h4>
                <p>Onboard staff, add skills, and set availability</p>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Main Lists Grid */}
        <div className="admin-grid">
          {/* Active Caregivers Listing */}
          <div className="admin-list-section">
            <DashboardCard 
              title="Caregivers Currently On Duty"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              }
            >
              <div className="table-responsive">
                {onDutyLoading ? (
                  <p className="admin-section-helper">Loading caregivers on duty…</p>
                ) : onDutyError ? (
                  <p className="admin-section-helper text-danger">{onDutyError}</p>
                ) : onDutyCaregivers.length === 0 ? (
                  <p className="admin-section-helper">No caregivers scheduled for a shift today.</p>
                ) : (
                  <table className="admin-table admin-table--on-duty">
                    <thead>
                      <tr>
                        <th>Caregiver</th>
                        <th>Visit Status</th>
                        <th>Today's Shift</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onDutyCaregivers.map((c) => (
                        <tr key={c.id}>
                          <td data-label="Caregiver">
                            <div className="td-caregiver-info">
                              <strong>{c.name}</strong>
                              <span>{c.code}</span>
                            </div>
                          </td>
                          <td data-label="Visit Status">
                            <span className={`status-badge ${c.visitStatusClass}`}>
                              {c.visitStatusLabel}
                            </span>
                          </td>
                          <td data-label="Today's Shift">
                            <div className="td-caregiver-info">
                              <strong>{c.clientName}</strong>
                              <span>{c.shiftWindow}</span>
                            </div>
                          </td>
                          <td data-label="Location" className="admin-table-location">
                            {c.location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </DashboardCard>
          </div>

          {/* Pending Leave Requests */}
          <div className="admin-list-section">
            <div className="admin-section-toolbar">
              <div>
                <h3 className="section-title-sub">Leave Approval</h3>
                <p className="admin-section-helper">Showing 5 pending requests that require approval.</p>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/admin/leave-requests')}
              >
                View All Leave Requests
              </button>
            </div>

            <DashboardCard 
              title="Pending Leave Requests"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
            >
              {leaveRequestsLoading ? (
                <div className="no-data-placeholder">
                  <p>Loading pending leave requests...</p>
                </div>
              ) : leaveRequestsError ? (
                <div className="no-data-placeholder">
                  <p>{leaveRequestsError}</p>
                </div>
              ) : oldestPendingLeaveRequests.length === 0 ? (
                <div className="no-data-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <p>All leave requests processed.</p>
                </div>
              ) : (
                <div className="leave-requests-list">
                  {oldestPendingLeaveRequests.map((req) => (
                    <div key={req.id} className="leave-request-card">
                      <div className="leave-request-header">
                        <div className="leave-request-name-stack">
                          <strong className="leave-request-name">{req.fullName}</strong>
                          <span className={`leave-type-pill ${req.leaveType.toLowerCase()}`}>{req.leaveType}</span>
                        </div>
                        <div className="leave-request-date-stack">
                          <span className="leave-date-badge">{new Date(req.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          <span className={`leave-status-pill ${req.status}`}>{req.status}</span>
                        </div>
                      </div>
                      <div className="leave-request-meta">
                        <span>{new Date(req.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} - {new Date(req.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <p className="leave-reason-text">"{req.reason}"</p>
                      <div className="leave-actions">
                        <button 
                          onClick={() => openRejectComment(req)} 
                          className="btn btn-outline btn-sm"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => handleApproveLeave(req)} 
                          className="btn btn-primary btn-sm"
                          disabled={checkingRequestId === req.id}
                        >
                          {checkingRequestId === req.id ? 'Checking...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>
          </div>
        </div>
      </main>

      {/* Admin Action Drawer / Modal Dialog */}
      {activeDrawer && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
          <div className="modal-content card" style={{ maxWidth: '600px' }}>
            <h2 id="drawer-title" style={{ textTransform: 'capitalize' }}>
              {activeDrawer} Management Portal
            </h2>
            
            {drawerSuccess ? (
              <div className="alert alert-success" role="alert" style={{ marginTop: '1rem' }}>
                {drawerSuccess}
              </div>
            ) : (
              <div className="drawer-placeholder-body" style={{ margin: '1.5rem 0' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  This interface provides full access to database controllers for editing {activeDrawer} records.
                </p>
                
                {/* Simplified Mock Adding/Editing form to feel high-fidelity */}
                {/*{activeDrawer === 'schedule' && (
                  <div className="mock-drawer-form">
                    <div className="form-group">
                      <label className="form-label">Caregiver Employee Code</label>
                      <input type="text" className="form-input" placeholder="e.g. EMP002" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Client Code</label>
                      <input type="text" className="form-input" placeholder="e.g. CLT001" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Shift Timing</label>*/}
                      {/*<input type="text" className="form-input" placeholder="e.g. 09:00 AM - 12:00 PM" />
                      <input type="text" className="form-input" placeholder="e.g. 09:00 - 14:00 " />
                    </div>
                  </div>
                )} */}

                {activeDrawer === 'client' && (
                  <div className="mock-drawer-form">
                    <div className="form-group">
                      <label className="form-label">Client Full Name</label>
                      <input type="text" className="form-input" placeholder="e.g. John Doe" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Client Status</label>
                      <select className="form-input">
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Special Care Notes</label>
                      <input type="text" className="form-input" placeholder="e.g. Needs wheelchair support" />
                    </div>
                  </div>
                )}

                {activeDrawer === 'caregiver' && (
                  <div className="mock-drawer-form">
                    <div className="form-group">
                      <label className="form-label">Caregiver Full Name</label>
                      <input type="text" className="form-input" placeholder="e.g. Sarah Brown" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Skills & Certifications</label>
                      <input type="text" className="form-input" placeholder="e.g. Dementia Care, CPR" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input type="text" className="form-input" placeholder="e.g. 0871234567" />
                    </div>
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setActiveDrawer(null)}>
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => {
                      setDrawerSuccess(`Record successfully created in database (/api/${activeDrawer}s)`);
                      setTimeout(() => setActiveDrawer(null), 2000);
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {commentRequest && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="comment-modal-title">
          <div className="modal-content card admin-comment-modal">
            <h2 id="comment-modal-title">Reject Leave Request</h2>
            <p className="admin-comment-meta">Employee {commentRequest.employeeCode} | {commentRequest.leaveType}</p>
            <div className="alert alert-danger admin-comment-required" role="alert">
              A comment is required to reject this leave request.
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-comment-box">Comment</label>
              <textarea
                id="admin-comment-box"
                className="form-input admin-comment-textarea"
                rows="5"
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                placeholder="Add your comment here..."
                disabled={isCheckingAffectedShifts}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={closeCommentModal} disabled={isCheckingAffectedShifts}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handleReviewReject} disabled={isCheckingAffectedShifts}>
                {isCheckingAffectedShifts ? 'Checking...' : 'Review Affected Shifts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDecision && (
        <AffectedShiftsModal
          request={pendingDecision.request}
          status={pendingDecision.status}
          affectedShifts={affectedShifts}
          isSubmitting={isConfirmingDecision}
          onCancel={closeAffectedShiftsModal}
          onConfirm={confirmLeaveDecision}
        />
      )}

    </div>
  );
}