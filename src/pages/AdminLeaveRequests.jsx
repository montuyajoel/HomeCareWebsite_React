import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import AffectedShiftsModal from '../components/AffectedShiftsModal';
import { authService } from '../services/authService';
import { API_URL } from '../config/api';

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' }
];

const SORT_OPTIONS = [
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Newest first', value: 'newest' },
  { label: 'Start date soonest', value: 'start-asc' },
  { label: 'Start date latest', value: 'start-desc' }
];

const normalizeLeaveRequest = (item) => ({
  id: item._id,
  employeeCode: item.employeeCode || 'N/A',
  fullName: item.fullName || item.employeeName || 'N/A',
  leaveType: item.leaveType || 'leave',
  startDate: item.startDate || '',
  endDate: item.endDate || '',
  reason: item.reason || '',
  status: (item.status || 'pending').toLowerCase(),
  adminNotes: item.adminNotes || '',
  createdAt: item.createdAt || item.startDate || '',
  updatedAt: item.updatedAt || item.createdAt || ''
});

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function AdminLeaveRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState('oldest');
  const [commentRequest, setCommentRequest] = useState(null);
  const [draftComment, setDraftComment] = useState('');
  const [isCheckingAffectedShifts, setIsCheckingAffectedShifts] = useState(false);
  const [checkingRequestId, setCheckingRequestId] = useState(null);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [affectedShifts, setAffectedShifts] = useState([]);
  const [isConfirmingDecision, setIsConfirmingDecision] = useState(false);
  const [commentAction, setCommentAction] = useState('comment');

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      const token = authService.getToken();
      if (!token) {
        setError('Session expired. Please sign in again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const responses = await Promise.all([
          axios.get(`${API_URL}/api/leave-requests/get`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const merged = responses.flatMap((response) => {
          if (response.data?.success) {
            return (response.data.data || []).map(normalizeLeaveRequest);
          }

          return [];
        });

        const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
        setRequests(unique);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load leave requests.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaveRequests();
  }, []);

  const visibleRequests = useMemo(() => {
    const filtered = requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const searchText = appliedSearch.trim().toLowerCase();
      const matchesSearch = !searchText || [
        request.fullName,
        request.employeeCode,
        request.leaveType,
        request.reason,
        request.adminNotes,
        request.status
      ].some((value) => String(value || '').toLowerCase().includes(searchText));

      return matchesStatus && matchesSearch;
    });

    return filtered.sort((a, b) => {
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      const aStart = new Date(a.startDate).getTime();
      const bStart = new Date(b.startDate).getTime();

      if (sortBy === 'newest') return bCreated - aCreated;
      if (sortBy === 'start-asc') return aStart - bStart;
      if (sortBy === 'start-desc') return bStart - aStart;
      return aCreated - bCreated;
    });
  }, [appliedSearch, requests, sortBy, statusFilter]);

  const openComment = (request) => {
    setCommentRequest(request);
    setDraftComment(request.adminNotes || '');
    setCommentAction('comment');
  };

  const openRejectComment = (request) => {
    setCommentRequest(request);
    setDraftComment(request.adminNotes || '');
    setCommentAction('reject');
  };

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

      setRequests(prev => (
        statusFilter === 'pending'
          ? prev.filter(item => item.id !== request.id)
          : prev.map(item => (
            item.id === request.id
              ? {
                ...item,
                status,
                adminNotes,
                updatedAt: new Date().toISOString()
              }
              : item
          ))
      ));

      setPendingDecision(null);
      setAffectedShifts([]);
      alert(`Leave request ${status} successfully.`);
    } finally {
      setIsConfirmingDecision(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content admin-leave-page">
        <div className="admin-page-header">
          <div>
            <h2>Leave Requests</h2>
            <p>Filter, search, and review all leave requests in a compact row layout.</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        <div className="admin-leave-controls card">
          <div className="form-group admin-control-group">
            <label className="form-label" htmlFor="leave-status-filter">Status</label>
            <select
              id="leave-status-filter"
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group admin-control-group admin-search-group">
            <label className="form-label" htmlFor="leave-search">Search</label>
            <div className="admin-search-row">
              <input
                id="leave-search"
                type="text"
                className="form-input"
                placeholder="Search by employee code, reason, or type"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={() => setAppliedSearch(searchInput)}>
                Search
              </button>
            </div>
          </div>

          <div className="form-group admin-control-group">
            <label className="form-label" htmlFor="leave-sort">Sort</label>
            <select
              id="leave-sort"
              className="form-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="card admin-leave-state">Loading leave requests...</div>
        ) : error ? (
          <div className="card admin-leave-state error">{error}</div>
        ) : (
          <div className="admin-leave-list card">
            <div className="admin-leave-table-head">
              <span>Date</span>
              <span>Employee</span>
              <span>Type</span>
              <span>Status</span>
              <span>Reason</span>
              <span>Admin Note</span>
              <span>Action</span>
            </div>

            {visibleRequests.length === 0 ? (
              <div className="no-data-placeholder">
                <p>No leave requests match the current filters.</p>
              </div>
            ) : (
              visibleRequests.map((request) => (
                <div key={request.id} className="admin-leave-row">
                  <div className="admin-leave-cell">
                    <strong>{formatDate(request.createdAt)}</strong>
                    <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                  </div>
                  <div className="admin-leave-cell">
                    <strong>{request.fullName}</strong>
                    <span>{request.updatedAt ? formatDate(request.updatedAt) : 'No update yet'}</span>
                  </div>
                  <div className="admin-leave-cell">
                    <span className="leave-type-pill">{request.leaveType}</span>
                  </div>
                  <div className="admin-leave-cell">
                    <span className={`leave-status-pill ${request.status}`}>{request.status}</span>
                  </div>
                  <div className="admin-leave-cell admin-leave-reason">
                    <span>{request.reason}</span>
                  </div>
                  <div className="admin-leave-cell admin-leave-comment-preview">
                    <span>{request.adminNotes || 'No comment yet'}</span>
                  </div>
                  <div className="admin-leave-cell admin-leave-action-cell">
                    {request.status === 'pending' && (
                      <div className="admin-leave-action-stack">
                        {/* <button className="btn btn-outline btn-sm" onClick={() => openComment(request)}>
                          Add Comment
                        </button> */}
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApproveLeave(request)}
                          disabled={checkingRequestId === request.id}
                        >
                          {checkingRequestId === request.id ? 'Checking...' : 'Approve'}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => openRejectComment(request)}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {commentRequest && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="comment-modal-title">
          <div className="modal-content card admin-comment-modal">
            <h2 id="comment-modal-title">{commentAction === 'reject' ? 'Reject Leave Request' : 'Add Comment'}</h2>
            <p className="admin-comment-meta">Employee {commentRequest.employeeCode} | {commentRequest.leaveType}</p>
            {commentAction === 'reject' && (
              <div className="alert alert-danger admin-comment-required" role="alert">
                A comment is required to reject this leave request.
              </div>
            )}

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