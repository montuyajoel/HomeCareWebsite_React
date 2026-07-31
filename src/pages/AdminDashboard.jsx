// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import { authService } from '../services/authService';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  // Metrics
  const [stats, setStats] = useState({
    totalVisits: 28,
    completedVisits: 16,
    pendingVisits: 12,
    onDutyCount: 8,
    pendingLeaves: 2
  });

  // Caregivers currently on duty
  const [onDutyCaregivers, setOnDutyCaregivers] = useState([
    { id: 'c1', name: 'Sarah Brown', code: 'EMP2002', client: 'John Doe', clockIn: '08:05 AM', location: 'Dublin 4' },
    { id: 'c2', name: 'James Miller', code: 'EMP1045', client: 'Margaret O\'Connor', clockIn: '08:12 AM', location: 'Dublin 2' },
    { id: 'c3', name: 'Emily Watson', code: 'EMP0912', client: 'Edward Kennedy', clockIn: '12:34 PM', location: 'Dublin 12' },
    { id: 'c4', name: 'David Lee', code: 'EMP1108', client: 'Alice Jenkins', clockIn: '02:15 PM', location: 'Dublin 6' }
  ]);

  // Leave Requests state (interactive)
  const [leaveRequests, setLeaveRequests] = useState([
    { id: 'l1', caregiverName: 'Sarah Brown', employeeCode: 'EMP2002', date: '2026-08-04', reason: 'Family gathering event', status: 'Pending' },
    { id: 'l2', caregiverName: 'Michael Corleone', employeeCode: 'EMP1003', date: '2026-08-11', reason: 'Annual medical appointment', status: 'Pending' }
  ]);

  // Active Management Drawer placeholder toggles
  const [activeDrawer, setActiveDrawer] = useState(null); // 'schedule', 'client', 'caregiver' or null
  const [drawerSuccess, setDrawerSuccess] = useState('');

  // Fetch real details from API if server is up
  useEffect(() => {
    const fetchAdminStats = async () => {
      const token = authService.getToken();
      if (!token) return;

      try {
        // Fetch caregivers
        const caregiversRes = await axios.get(`${API_URL}/api/caregivers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Fetch clients
        const clientsRes = await axios.get(`${API_URL}/api/clients`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (caregiversRes.data && caregiversRes.data.success && clientsRes.data && clientsRes.data.success) {
          const caregiverList = caregiversRes.data.body || [];
          const activeCaregivers = caregiverList.filter(c => c.status === 'active');
          const clientList = clientsRes.data.body || [];
          
          setStats(prev => ({
            ...prev,
            onDutyCount: activeCaregivers.length > 0 ? activeCaregivers.length : prev.onDutyCount
          }));
        }
      } catch (err) {
        console.warn("Using local state metrics (backend server might be offline or empty).");
      }
    };
    fetchAdminStats();
  }, []);

  const handleApproveLeave = (id) => {
    setLeaveRequests(prev => prev.filter(req => req.id !== id));
    setStats(prev => ({
      ...prev,
      pendingLeaves: Math.max(0, prev.pendingLeaves - 1)
    }));
    alert("Leave request approved successfully.");
  };

  const handleRejectLeave = (id) => {
    setLeaveRequests(prev => prev.filter(req => req.id !== id));
    setStats(prev => ({
      ...prev,
      pendingLeaves: Math.max(0, prev.pendingLeaves - 1)
    }));
    alert("Leave request rejected.");
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
            <button className="shortcut-action-card card" onClick={() => openManagementDrawer('schedule')}>
              <div className="action-card-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div>
                <h4>Schedule Editor</h4>
                <p>Assign caregiver shifts and route plans</p>
              </div>
            </button>

            <button className="shortcut-action-card card" onClick={() => openManagementDrawer('client')}>
              <div className="action-card-icon green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h4>Client Records</h4>
                <p>Register new clients, edit care plans and needs</p>
              </div>
            </button>

            <button className="shortcut-action-card card" onClick={() => openManagementDrawer('caregiver')}>
              <div className="action-card-icon orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
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
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Caregiver</th>
                      <th>Client Visit</th>
                      <th>Clock-In</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onDutyCaregivers.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="td-caregiver-info">
                            <strong>{c.name}</strong>
                            <span>{c.code}</span>
                          </div>
                        </td>
                        <td>{c.client}</td>
                        <td><span className="badge badge-in">{c.clockIn}</span></td>
                        <td>{c.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>

          {/* Pending Leave Requests */}
          <div className="admin-list-section">
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
              {leaveRequests.length === 0 ? (
                <div className="no-data-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <p>All leave requests processed.</p>
                </div>
              ) : (
                <div className="leave-requests-list">
                  {leaveRequests.map((req) => (
                    <div key={req.id} className="leave-request-card">
                      <div className="leave-request-header">
                        <div>
                          <strong>{req.caregiverName}</strong> ({req.employeeCode})
                        </div>
                        <span className="leave-date-badge">{req.date}</span>
                      </div>
                      <p className="leave-reason-text">"{req.reason}"</p>
                      <div className="leave-actions">
                        <button 
                          onClick={() => handleRejectLeave(req.id)} 
                          className="btn btn-outline btn-sm"
                        >
                          Deny
                        </button>
                        <button 
                          onClick={() => handleApproveLeave(req.id)} 
                          className="btn btn-primary btn-sm"
                        >
                          Approve
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
                {activeDrawer === 'schedule' && (
                  <div className="mock-drawer-form">
                    <div className="form-group">
                      <label className="form-label">Caregiver Employee Code</label>
                      <input type="text" className="form-input" placeholder="e.g. EMP2002" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Client Code</label>
                      <input type="text" className="form-input" placeholder="e.g. CL001" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Shift Timing</label>
                      <input type="text" className="form-input" placeholder="e.g. 09:00 AM - 12:00 PM" />
                    </div>
                  </div>
                )}

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
    </div>
  );
}
