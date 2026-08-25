// src/pages/AdminCaregiversDirectory.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import UserProfileModal from '../components/UserProfileModal';
import NotificationCard from '../components/NotificationCard';
import { authService } from '../services/authService';
import '../styles/adminCaregiverDirectory.css';
import { API_URL } from '../config/api';

import { STANDARD_CARE_SKILLS as STANDARD_SKILLS } from '../constants/careSkills';





export default function AdminCaregiversDirectory() {
  const navigate = useNavigate();

  // Caregivers list
  const [caregivers, setCaregivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [allergyFilter, setAllergyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');

  // Onboarding Form state
  const [createUserId, setCreateUserId] = useState('');
  const [createEmployeeCode, setCreateEmployeeCode] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createGender, setCreateGender] = useState('Female');
  const [createAge, setCreateAge] = useState(30);
  const [createPhoneNumber, setCreatePhoneNumber] = useState('');
  const [createAddressLine, setCreateAddressLine] = useState('');
  const [createTown, setCreateTown] = useState('');
  const [createCity, setCreateCity] = useState('Dublin');
  const [createCounty, setCreateCounty] = useState('Dublin');
  const [createPostCode, setCreatePostCode] = useState('');
  const [createHasPetAllergy, setCreateHasPetAllergy] = useState(false);
  const [createSkills, setCreateSkills] = useState([]);
  const [createAvailability, setCreateAvailability] = useState([]);
  const [createStatus, setCreateStatus] = useState('active');

  // Availability slot inline inputs
  const [availDay, setAvailDay] = useState('Monday');
  const [availStart, setAvailStart] = useState('09:00');
  const [availEnd, setAvailEnd] = useState('17:00');
  const [customSkillInput, setCustomSkillInput] = useState('');

  const [createErrors, setCreateErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification and confirmation card state
  const [notificationCard, setNotificationCard] = useState(null);

  const showNotificationCard = ({
    type = 'info',
    title,
    message,
    confirmLabel = '',
    onConfirm = null
  }) => {
    setNotificationCard({
      type,
      title,
      message,
      confirmLabel,
      onConfirm
    });
  };

  const closeNotificationCard = () => {
    setNotificationCard(null);
  };

  const handleNotificationConfirm = async () => {
    const confirmAction = notificationCard?.onConfirm;
    setNotificationCard(null);

    if (confirmAction) {
      await confirmAction();
    }
  };

  const requestConfirmationCard = ({
    title,
    message,
    confirmLabel = 'Confirm',
    onConfirm
  }) => {
    showNotificationCard({
      type: 'danger',
      title,
      message,
      confirmLabel,
      onConfirm
    });
  };

  // Auto-generate MongoDB ObjectId (24-character hex)
  const generateMongoId = () => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  };

  const resetCreateForm = () => {
    setCreateUserId(generateMongoId());
    setCreateEmployeeCode('');
    setCreateFullName('');
    setCreateGender('Female');
    setCreateAge(30);
    setCreatePhoneNumber('');
    setCreateAddressLine('');
    setCreateTown('');
    setCreateCity('Dublin');
    setCreateCounty('Dublin');
    setCreatePostCode('');
    setCreateHasPetAllergy(false);
    setCreateSkills([]);
    setCreateAvailability([]);
    setCreateStatus('active');
    setCreateErrors({});
  };

  // Fetch Caregivers
  const fetchCaregivers = async () => {
    setIsLoading(true);
    setError('');
    const token = authService.getToken();
    if (!token) {
      setError('Session expired. Please sign in again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/caregivers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        setCaregivers(response.data.data || []);
      } else {
        setError(response.data?.message || 'Failed to fetch caregivers.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error fetching caregivers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaregivers();
  }, []);

  // Filter & Sort caregivers
  const filteredAndSortedCaregivers = useMemo(() => {
    let result = [...caregivers];

    // Filter by search term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter(cg => 
        (cg.fullName || '').toLowerCase().includes(query) ||
        (cg.employeeCode || '').toLowerCase().includes(query) ||
        (cg.phoneNumber || '').toLowerCase().includes(query) ||
        (cg.skills || []).some(skill => (skill || '').toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(cg => cg.status === statusFilter);
    }

    // Filter by gender
    if (genderFilter !== 'all') {
      result = result.filter(cg => cg.gender === genderFilter);
    }

    // Filter by skill
    if (skillFilter !== 'all') {
      result = result.filter(cg => (cg.skills || []).includes(skillFilter));
    }

    // Filter by allergy
    if (allergyFilter !== 'all') {
      const allergyBool = allergyFilter === 'yes';
      result = result.filter(cg => cg.hasPetAllergy === allergyBool);
    }

    // Sort caregivers
    result.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      if (sortBy === 'name-desc') {
        return (b.fullName || '').localeCompare(a.fullName || '');
      }
      if (sortBy === 'age-asc') {
        return (a.age || 0) - (b.age || 0);
      }
      if (sortBy === 'age-desc') {
        return (b.age || 0) - (a.age || 0);
      }
      if (sortBy === 'code-asc') {
        return (a.employeeCode || '').localeCompare(b.employeeCode || '');
      }
      if (sortBy === 'code-desc') {
        return (b.employeeCode || '').localeCompare(a.employeeCode || '');
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      return 0;
    });

    return result;
  }, [caregivers, searchTerm, statusFilter, genderFilter, skillFilter, allergyFilter, sortBy]);

  // Add Availability slot in create form
  const handleAddCreateAvail = () => {
    if (!availStart || !availEnd) return;
    
    const duplicate = createAvailability.some(
      slot => slot.day === availDay && slot.startTime === availStart && slot.endTime === availEnd
    );
    if (duplicate) {
      showNotificationCard({
        type: 'warning',
        title: 'Duplicate Availability',
        message: 'This availability slot has already been added.'
      });
      return;
    }

    const slot = { day: availDay, startTime: availStart, endTime: availEnd };
    setCreateAvailability([...createAvailability, slot]);
  };

  // Remove Availability slot in create form
  const handleRemoveCreateAvail = (idx) => {
    setCreateAvailability(createAvailability.filter((_, i) => i !== idx));
  };

  // Toggle skills in create form
  const handleToggleCreateSkill = (skill) => {
    if (createSkills.includes(skill)) {
      setCreateSkills(createSkills.filter(s => s !== skill));
    } else {
      setCreateSkills([...createSkills, skill]);
    }
  };

  // Add custom skill in create form
  const handleAddCreateCustomSkill = () => {
    if (customSkillInput.trim() && !createSkills.includes(customSkillInput.trim())) {
      setCreateSkills([...createSkills, customSkillInput.trim()]);
      setCustomSkillInput('');
    }
  };

  // Open Create modal
  const openCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  // Validate onboarding form
  const validateCreateForm = () => {
    const errs = {};
    if (!createUserId.trim() || createUserId.trim().length !== 24) {
      errs.userId = 'Valid 24-character hexadecimal User Account ID is required.';
    }
    if (!createEmployeeCode.trim()) {
      errs.employeeCode = 'Employee Code is required.';
    }
    if (!createFullName.trim()) {
      errs.fullName = 'Full Name is required.';
    }
    if (!createAge) {
      errs.age = 'Age is required.';
    } else if (createAge < 18 || createAge > 65) {
      errs.age = 'Age must be between 18 and 65.';
    }
    if (!createPhoneNumber.trim()) {
      errs.phoneNumber = 'Phone Number is required.';
    } else if (!/^\+?[0-9]{7,15}$/.test(createPhoneNumber.trim())) {
      errs.phoneNumber = 'Phone Number must be 7-15 digits (optionally starting with +).';
    }
    if (!createAddressLine.trim()) {
      errs.addressLine = 'Address Line 1 is required.';
    }
    if (!createCity.trim()) {
      errs.city = 'City is required.';
    }
    if (!createPostCode.trim()) {
      errs.postCode = 'Post Code is required.';
    }

    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Onboarding form submit
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setIsSubmitting(true);
    const token = authService.getToken();

    if (!token) {
      setIsSubmitting(false);
      showNotificationCard({
        type: 'error',
        title: 'Session Expired',
        message: 'Please sign in again before onboarding a caregiver.'
      });
      return;
    }

    const payload = {
      userId: createUserId.trim(),
      employeeCode: createEmployeeCode.trim().toUpperCase(),
      fullName: createFullName.trim(),
      gender: createGender,
      age: Number(createAge),
      phoneNumber: createPhoneNumber.trim(),
      address: {
        addressLine: createAddressLine.trim(),
        town: createTown.trim(),
        city: createCity.trim(),
        county: createCounty.trim(),
        postCode: createPostCode.trim()
      },
      hasPetAllergy: createHasPetAllergy,
      skills: createSkills,
      availability: createAvailability,
      status: createStatus
    };

    try {
      const response = await axios.post(
        `${API_URL}/api/caregivers`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        setIsCreateModalOpen(false);
        showNotificationCard({
          type: 'success',
          title: 'Caregiver Onboarded',
          message: response.data?.message || 'The caregiver profile was created successfully.'
        });
        fetchCaregivers(); // reload directory list
      } else {
        showNotificationCard({
          type: 'error',
          title: 'Onboarding Failed',
          message: response.data?.message || 'Failed to onboard caregiver.'
        });
      }
    } catch (err) {
      showNotificationCard({
        type: 'error',
        title: 'Onboarding Failed',
        message: err.response?.data?.message || err.message || 'Error onboarding caregiver.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update success callback from profile modal
  const handleUpdateSuccess = (updatedCaregiver) => {
    setCaregivers(prev => prev.map(cg => 
      cg.employeeCode === updatedCaregiver.employeeCode ? updatedCaregiver : cg
    ));

    if (selectedCaregiver && selectedCaregiver.employeeCode === updatedCaregiver.employeeCode) {
      setSelectedCaregiver(updatedCaregiver);
    }

    showNotificationCard({
      type: 'success',
      title: 'Caregiver Updated',
      message: `${updatedCaregiver.fullName || updatedCaregiver.employeeCode} was updated successfully.`
    });
  };

  // Delete success callback from profile modal
  const handleDeleteSuccess = (deletedCode) => {
    const deletedCaregiverName = selectedCaregiver?.fullName || deletedCode;

    setCaregivers(prev => prev.filter(cg => cg.employeeCode !== deletedCode));
    setProfileModalOpen(false);
    setSelectedCaregiver(null);

    showNotificationCard({
      type: 'success',
      title: 'Caregiver Deleted',
      message: `${deletedCaregiverName} was deleted successfully.`
    });
  };

  // Click card handler
  const handleCardClick = (cg) => {
    setSelectedCaregiver(cg);
    setProfileModalOpen(true);
  };

  // Circular profile photo render
  const renderAvatar = (name) => {
    const initials = name
      ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'CG';

    const charCodeSum = name
      ? name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
      : 0;
    const gradientIndex = charCodeSum % 6;

    return (
      <div className={`admin-caregiver-avatar admin-caregiver-avatar--${gradientIndex}`}>
        {initials}
      </div>
    );
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        <div className="admin-caregivers-header">
          <div>
            <h2 className="admin-caregivers-title">Caregivers Directory</h2>
            <p className="admin-caregivers-subtitle">View, search, filter and edit caregiver profiles, or onboard new staff members.</p>
          </div>
          <div className="admin-caregivers-header-actions">
            <button className="btn btn-outline" onClick={() => navigate('/admin/dashboard')}>
              Dashboard
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Onboard Caregiver
            </button>
          </div>
        </div>

        {/* Directory Controls Block */}
        <div className="card admin-caregivers-controls">
          <div className="form-group admin-caregivers-control">
            <label className="form-label" htmlFor="search-directory">Search</label>
            <input 
              id="search-directory"
              type="text" 
              className="form-input" 
              placeholder="Name, code, skill..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group admin-caregivers-control">
            <label className="form-label" htmlFor="filter-status">Status</label>
            <select id="filter-status" className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="on-leave">On-Leave</option>
            </select>
          </div>

          <div className="form-group admin-caregivers-control">
            <label className="form-label" htmlFor="filter-gender">Gender</label>
            <select id="filter-gender" className="form-input" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
              <option value="all">All Genders</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group admin-caregivers-control">
            <label className="form-label" htmlFor="filter-skill">Skill</label>
            <select id="filter-skill" className="form-input" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
              <option value="all">All Skills</option>
              {STANDARD_SKILLS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group admin-caregivers-control">
            <label className="form-label" htmlFor="filter-allergy">Pet Allergy</label>
            <select id="filter-allergy" className="form-input" value={allergyFilter} onChange={(e) => setAllergyFilter(e.target.value)}>
              <option value="all">All Allergies</option>
              <option value="yes">Has Allergy</option>
              <option value="no">No Allergy</option>
            </select>
          </div>

          <div className="form-group admin-caregivers-control">
            <label className="form-label" htmlFor="sort-directory">Sort By</label>
            <select id="sort-directory" className="form-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="age-asc">Age (Youngest)</option>
              <option value="age-desc">Age (Oldest)</option>
              <option value="code-asc">Employee Code (Asc)</option>
              <option value="code-desc">Employee Code (Desc)</option>
              <option value="newest">Newly Onboarded</option>
            </select>
          </div>
        </div>

        {/* Directory Grid */}
        {isLoading ? (
          <div className="card admin-caregivers-state-card">
            <p className="admin-caregivers-muted-text">Loading caregivers directory...</p>
          </div>
        ) : error ? (
          <div className="card admin-caregivers-error-card">
            <p>{error}</p>
          </div>
        ) : filteredAndSortedCaregivers.length === 0 ? (
          <div className="card admin-caregivers-empty-card">
            <svg className="admin-caregivers-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01" />
            </svg>
            <h3 className="admin-caregivers-empty-title">No Caregivers Found</h3>
            <p className="admin-caregivers-empty-text">No profiles match your search criteria.</p>
            <button className="btn btn-outline btn-sm" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setGenderFilter('all'); setSkillFilter('all'); setAllergyFilter('all'); }}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="admin-caregivers-grid">
            {filteredAndSortedCaregivers.map((cg) => (
              <div
                key={cg.employeeCode}
                className="card admin-caregiver-card"
                onClick={() => handleCardClick(cg)}
              >
                {renderAvatar(cg.fullName)}
                
                <h4 className="admin-caregiver-name">{cg.fullName}</h4>
                <code className="admin-caregiver-code">
                  {cg.employeeCode}
                </code>

                <div className="admin-caregiver-status-wrap">
                  <span
                    className={`badge admin-caregiver-status ${cg.status === 'active' ? 'admin-caregiver-status--active' : 'admin-caregiver-status--inactive'}`}
                  >
                    {cg.status}
                  </span>
                </div>

                <div className="admin-caregiver-skills">
                  {cg.skills && cg.skills.length > 0 ? (
                    <>
                      {cg.skills.slice(0, 2).map((skill, idx) => (
                        <span key={idx} className="admin-caregiver-skill">
                          {skill}
                        </span>
                      ))}
                      {cg.skills.length > 2 && (
                        <span className="admin-caregiver-skill-more">
                          +{cg.skills.length - 2}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="admin-caregiver-no-skills">No skills listed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Profile detail modal (with edit & delete controls) */}
      <UserProfileModal 
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        detailUser={selectedCaregiver}
        isAdmin={true}
        onUpdateSuccess={handleUpdateSuccess}
        onDeleteSuccess={handleDeleteSuccess}
        onNotify={showNotificationCard}
        onRequestConfirmation={requestConfirmationCard}
      />

      {/* Onboard Caregiver Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
          <div className="modal-content card admin-caregiver-create-modal">
            <div className="admin-caregiver-modal-header">
              <h2 id="create-modal-title" className="admin-caregiver-modal-title">Onboard New Caregiver</h2>
              <button 
                type="button" 
                onClick={() => setIsCreateModalOpen(false)} 
                className="admin-caregiver-modal-close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="admin-caregiver-form">
              
              <div className="admin-caregiver-form-grid admin-caregiver-form-grid--2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    className={`form-input ${createErrors.fullName ? 'is-invalid' : ''}`}
                    placeholder="e.g. Maria Santos"
                    value={createFullName} 
                    onChange={(e) => setCreateFullName(e.target.value)} 
                    required
                  />
                  {createErrors.fullName && <span className="form-error">{createErrors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Employee Code * (Unique)</label>
                  <input 
                    type="text" 
                    className={`form-input ${createErrors.employeeCode ? 'is-invalid' : ''}`}
                    placeholder="e.g. EMP008"
                    value={createEmployeeCode} 
                    onChange={(e) => setCreateEmployeeCode(e.target.value)} 
                    required
                  />
                  {createErrors.employeeCode && <span className="form-error">{createErrors.employeeCode}</span>}
                </div>
              </div>

              <div className="admin-caregiver-form-grid admin-caregiver-form-grid--3">
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select 
                    className="form-input" 
                    value={createGender} 
                    onChange={(e) => setCreateGender(e.target.value)}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Age * (18-65)</label>
                  <input 
                    type="number" 
                    className={`form-input ${createErrors.age ? 'is-invalid' : ''}`}
                    value={createAge} 
                    onChange={(e) => setCreateAge(parseInt(e.target.value) || '')} 
                    min="18" 
                    max="65"
                    required
                  />
                  {createErrors.age && <span className="form-error">{createErrors.age}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input" 
                    value={createStatus} 
                    onChange={(e) => setCreateStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="on-leave">On-Leave</option>
                  </select>
                </div>
              </div>

              <div className="admin-caregiver-form-grid admin-caregiver-form-grid--phone">
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input 
                    type="text" 
                    className={`form-input ${createErrors.phoneNumber ? 'is-invalid' : ''}`}
                    placeholder="e.g. +353871234567"
                    value={createPhoneNumber} 
                    onChange={(e) => setCreatePhoneNumber(e.target.value)} 
                    required
                  />
                  {createErrors.phoneNumber && <span className="form-error">{createErrors.phoneNumber}</span>}
                </div>

                <div className="form-group admin-caregiver-allergy-row">
                  <input 
                    type="checkbox" 
                    id="createHasPetAllergy"
                    checked={createHasPetAllergy} 
                    onChange={(e) => setCreateHasPetAllergy(e.target.checked)} 
                    className="admin-caregiver-checkbox"
                  />
                  <label htmlFor="createHasPetAllergy" className="form-label admin-caregiver-checkbox-label">
                    Has Pet Allergy
                  </label>
                </div>
              </div>

              <div className="admin-caregiver-form-section">
                <h4 className="admin-caregiver-section-title">Address Details</h4>
                
                <div className="form-group admin-caregiver-form-group-spaced">
                  <label className="form-label">Address Line 1 *</label>
                  <input 
                    type="text" 
                    className={`form-input ${createErrors.addressLine ? 'is-invalid' : ''}`}
                    placeholder="e.g. 12 O'Connell Street Upper"
                    value={createAddressLine} 
                    onChange={(e) => setCreateAddressLine(e.target.value)} 
                    required
                  />
                  {createErrors.addressLine && <span className="form-error">{createErrors.addressLine}</span>}
                </div>

                <div className="admin-caregiver-form-grid admin-caregiver-form-grid--2 admin-caregiver-form-grid--spaced">
                  <div className="form-group">
                    <label className="form-label">Town</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. Dublin 1"
                      value={createTown} 
                      onChange={(e) => setCreateTown(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input 
                      type="text" 
                      className={`form-input ${createErrors.city ? 'is-invalid' : ''}`}
                      placeholder="e.g. Dublin"
                      value={createCity} 
                      onChange={(e) => setCreateCity(e.target.value)} 
                      required
                    />
                    {createErrors.city && <span className="form-error">{createErrors.city}</span>}
                  </div>
                </div>

                <div className="admin-caregiver-form-grid admin-caregiver-form-grid--2 admin-caregiver-form-grid--spaced">
                  <div className="form-group">
                    <label className="form-label">County</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="e.g. Dublin"
                      value={createCounty} 
                      onChange={(e) => setCreateCounty(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Post Code *</label>
                    <input 
                      type="text" 
                      className={`form-input ${createErrors.postCode ? 'is-invalid' : ''}`}
                      placeholder="e.g. D01 ABC2"
                      value={createPostCode} 
                      onChange={(e) => setCreatePostCode(e.target.value)} 
                      required
                    />
                    {createErrors.postCode && <span className="form-error">{createErrors.postCode}</span>}
                  </div>
                </div>

                <div className="card admin-caregiver-geocode-card">
                  Latitude and longitude are generated automatically by the backend from the submitted address.
                </div>
              </div>

              <div className="admin-caregiver-form-section">
                <h4 className="admin-caregiver-section-title">Skills & Certifications</h4>
                <div className="admin-caregiver-skills-grid">
                  {STANDARD_SKILLS.map((skill) => (
                    <div key={skill} className="admin-caregiver-skill-option">
                      <input 
                        type="checkbox" 
                        id={`create-skill-${skill}`}
                        checked={createSkills.includes(skill)}
                        onChange={() => handleToggleCreateSkill(skill)}
                        className="admin-caregiver-skill-checkbox"
                      />
                      <label htmlFor={`create-skill-${skill}`} className="admin-caregiver-skill-label">{skill}</label>
                    </div>
                  ))}
                </div>
                <div className="admin-caregiver-custom-skill-row">
                  <input 
                    type="text" 
                    className="form-input admin-caregiver-compact-input"
                    placeholder="Custom skill..."
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                  />
                  <button type="button" className="btn btn-outline admin-caregiver-add-skill-button" onClick={handleAddCreateCustomSkill}>Add</button>
                </div>
                <div className="admin-caregiver-selected-skills">
                  {createSkills.map((skill, index) => (
                    <span key={`${skill}-${index}`} className="profile-skill-pill admin-caregiver-selected-skill">
                      {skill}
                      <button type="button" onClick={() => handleToggleCreateSkill(skill)} className="admin-caregiver-selected-skill-remove">&times;</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="admin-caregiver-form-section">
                <h4 className="admin-caregiver-section-title">Weekly Availability</h4>
                
                <div className="admin-caregiver-availability-editor">
                  <div className="form-group admin-caregiver-availability-field admin-caregiver-availability-field--day">
                    <label className="form-label">Day</label>
                    <select className="form-input admin-caregiver-compact-input" value={availDay} onChange={(e) => setAvailDay(e.target.value)}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group admin-caregiver-availability-field admin-caregiver-availability-field--time">
                    <label className="form-label">Start Time</label>
                    <input type="time" className="form-input admin-caregiver-compact-input" value={availStart} onChange={(e) => setAvailStart(e.target.value)} />
                  </div>
                  <div className="form-group admin-caregiver-availability-field admin-caregiver-availability-field--time">
                    <label className="form-label">End Time</label>
                    <input type="time" className="form-input admin-caregiver-compact-input" value={availEnd} onChange={(e) => setAvailEnd(e.target.value)} />
                  </div>
                  <button type="button" className="btn btn-secondary admin-caregiver-add-slot-button" onClick={handleAddCreateAvail}>
                    Add Slot
                  </button>
                </div>

                <div className="admin-caregiver-availability-list">
                  {createAvailability.length === 0 ? (
                    <span className="admin-caregiver-availability-empty">No availability slots defined yet.</span>
                  ) : (
                    createAvailability.map((slot, index) => (
                      <div key={`${slot.day}-${slot.startTime}-${index}`} className="admin-caregiver-availability-item">
                        <span className="admin-caregiver-availability-day">{slot.day}</span>
                        <span className="admin-caregiver-availability-time">{slot.startTime} - {slot.endTime}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveCreateAvail(index)} 
                          className="admin-caregiver-remove-slot-button"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-actions admin-caregiver-modal-actions">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Onboarding...' : 'Onboard Caregiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notificationCard && (
        <NotificationCard
          type={notificationCard.type}
          title={notificationCard.title}
          message={notificationCard.message}
          confirmLabel={notificationCard.confirmLabel}
          onConfirm={notificationCard.onConfirm ? handleNotificationConfirm : null}
          onClose={closeNotificationCard}
          titleId="notification-card-title"
        />
      )}
    </div>
  );
}