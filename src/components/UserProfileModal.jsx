// src/components/UserProfileModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { authService } from '../services/authService';
import '../styles/userProfileModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const STANDARD_SKILLS = [
  'Personal Care',
  'Dementia Care',
  'Palliative Care',
  'Meal Preparation',
  'Mobility Support',
  'Medication Support',
  'CPR Certified',
  'Elder Care'
];

export default function UserProfileModal({
  isOpen,
  onClose,
  detailUser,
  isAdmin = false,
  onUpdateSuccess,
  onDeleteSuccess,
  onNotify,
  onRequestConfirmation
}) {
  const [caregiver, setCaregiver] = useState(detailUser);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('Female');
  const [age, setAge] = useState(18);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [town, setTown] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postCode, setPostCode] = useState('');
  const [hasPetAllergy, setHasPetAllergy] = useState(false);
  const [status, setStatus] = useState('active');
  const [skills, setSkills] = useState([]);
  const [availability, setAvailability] = useState([]);

  // Form additions state
  const [newDay, setNewDay] = useState('Monday');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [customSkill, setCustomSkill] = useState('');

  // Form error and saving states
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (detailUser) {
      setCaregiver(detailUser);
      setFullName(detailUser.fullName || '');
      setGender(detailUser.gender || 'Female');
      setAge(detailUser.age || 18);
      setPhoneNumber(detailUser.phoneNumber || '');
      setAddressLine(detailUser.address?.addressLine || '');
      setTown(detailUser.address?.town || '');
      setCity(detailUser.address?.city || '');
      setCounty(detailUser.address?.county || '');
      setPostCode(detailUser.address?.postCode || '');
      setHasPetAllergy(detailUser.hasPetAllergy || false);
      setStatus(detailUser.status || 'active');
      setSkills(detailUser.skills || []);
      setAvailability(detailUser.availability || []);
    }
  }, [detailUser]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setErrors({});
    }
  }, [isOpen]);

  const handleToggleSkill = (skill) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      setSkills([...skills, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleAddSlot = () => {
    if (!newStartTime || !newEndTime) return;
    
    // Check for duplicates
    const duplicate = availability.some(
      slot => slot.day === newDay && slot.startTime === newStartTime && slot.endTime === newEndTime
    );
    if (duplicate) {
      onNotify?.({
        type: 'warning',
        title: 'Duplicate Availability',
        message: 'This availability slot has already been added.'
      });
      return;
    }

    const newSlot = { day: newDay, startTime: newStartTime, endTime: newEndTime };
    setAvailability([...availability, newSlot]);
  };

  const handleRemoveSlot = (indexToRemove) => {
    setAvailability(availability.filter((_, idx) => idx !== indexToRemove));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!age) {
      newErrors.age = 'Age is required';
    } else if (age < 18 || age > 65) {
      newErrors.age = 'Age must be between 18 and 65';
    }
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[0-9]{7,15}$/.test(phoneNumber.trim())) {
      newErrors.phoneNumber = 'Invalid phone format (7-15 digits, optionally starting with +)';
    }
    if (!addressLine.trim()) newErrors.addressLine = 'Address line is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!postCode.trim()) newErrors.postCode = 'Postcode is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    const token = authService.getToken();

    if (!token) {
      setIsSaving(false);
      onNotify?.({
        type: 'error',
        title: 'Session Expired',
        message: 'Please sign in again before updating this caregiver.'
      });
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      gender,
      age: Number(age),
      phoneNumber: phoneNumber.trim(),
      address: {
        addressLine: addressLine.trim(),
        town: town.trim(),
        city: city.trim(),
        county: county.trim(),
        postCode: postCode.trim()
      },
      hasPetAllergy,
      skills,
      availability,
      status
    };

    try {
      const response = await axios.put(
        `${API_URL}/api/caregivers/${caregiver.employeeCode}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        const updated = response.data.data;
        setCaregiver(updated);
        setIsEditing(false);
        if (onUpdateSuccess) {
          onUpdateSuccess(updated);
        }
      } else {
        onNotify?.({
          type: 'error',
          title: 'Update Failed',
          message: response.data?.message || 'Unable to update caregiver.'
        });
      }
    } catch (err) {
      onNotify?.({
        type: 'error',
        title: 'Update Failed',
        message: err.response?.data?.message || err.message || 'Unable to update caregiver.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const performDeleteCaregiver = async () => {
    const token = authService.getToken();

    if (!token) {
      onNotify?.({
        type: 'error',
        title: 'Session Expired',
        message: 'Please sign in again before deleting this caregiver.'
      });
      return;
    }

    if (!caregiver?.employeeCode) {
      onNotify?.({
        type: 'error',
        title: 'Deletion Failed',
        message: 'The caregiver employee code is missing.'
      });
      return;
    }

    setIsDeleting(true);

    try {
      const response = await axios.delete(
        `${API_URL}/api/caregivers/${caregiver.employeeCode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data?.success) {
        onDeleteSuccess?.(caregiver.employeeCode);
        return;
      }

      onNotify?.({
        type: 'error',
        title: 'Deletion Failed',
        message: response.data?.message || 'Unable to delete caregiver.'
      });
    } catch (err) {
      onNotify?.({
        type: 'error',
        title: 'Deletion Failed',
        message: err.response?.data?.message || err.message || 'Unable to delete caregiver.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCaregiver = () => {
    onRequestConfirmation?.({
      title: 'Delete Caregiver',
      message: `Delete ${caregiver?.fullName || caregiver?.employeeCode}? This action cannot be undone.`,
      confirmLabel: 'Delete Caregiver',
      onConfirm: performDeleteCaregiver
    });
  };

  const formatAddress = (addr) => {
    if (!addr) return 'N/A';
    const parts = [addr.addressLine, addr.town, addr.city, addr.county, addr.postCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="modal-content card user-profile-modal">
        <div className="user-profile-modal-header">
          <h2 id="profile-modal-title" className="user-profile-modal-title">
            {isEditing ? `Edit Caregiver: ${caregiver?.employeeCode}` : 'Caregiver Profile'}
          </h2>
          <button 
            type="button" 
            onClick={() => onClose(false)} 
            className="user-profile-modal-close"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="user-profile-form">
            <div className="user-profile-grid user-profile-grid-two">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className={`form-input ${errors.fullName ? 'is-invalid' : ''}`}
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required
                />
                {errors.fullName && <span className="form-error">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Employee Code (Read-Only)</label>
                <input 
                  type="text" 
                  className="form-input user-profile-readonly-input" 
                  value={caregiver?.employeeCode || ''} 
                  disabled 
                />
              </div>
            </div>

            <div className="user-profile-grid user-profile-grid-three">
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select 
                  className="form-input" 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
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
                  className={`form-input ${errors.age ? 'is-invalid' : ''}`}
                  value={age} 
                  onChange={(e) => setAge(parseInt(e.target.value) || '')} 
                  min="18" 
                  max="65"
                  required
                />
                {errors.age && <span className="form-error">{errors.age}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Status *</label>
                <select 
                  className="form-input" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="on-leave">On-Leave</option>
                </select>
              </div>
            </div>

            <div className="user-profile-grid user-profile-grid-two">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input 
                  type="text" 
                  className={`form-input ${errors.phoneNumber ? 'is-invalid' : ''}`}
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                  placeholder="e.g. +353871234567"
                  required
                />
                {errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}
              </div>

              <div className="form-group user-profile-checkbox-group">
                <input 
                  type="checkbox" 
                  id="editHasPetAllergy"
                  checked={hasPetAllergy} 
                  onChange={(e) => setHasPetAllergy(e.target.checked)} 
                  className="user-profile-checkbox"
                />
                <label htmlFor="editHasPetAllergy" className="form-label user-profile-checkbox-label">
                  Has Pet Allergy
                </label>
              </div>
            </div>

            <div className="user-profile-form-section">
              <h4 className="user-profile-section-title">Address Details</h4>
              
              <div className="form-group user-profile-field-spaced">
                <label className="form-label">Address Line 1 *</label>
                <input 
                  type="text" 
                  className={`form-input ${errors.addressLine ? 'is-invalid' : ''}`}
                  value={addressLine} 
                  onChange={(e) => setAddressLine(e.target.value)} 
                  placeholder="e.g. 12 O'Connell Street Upper"
                  required
                />
                {errors.addressLine && <span className="form-error">{errors.addressLine}</span>}
              </div>

              <div className="user-profile-grid user-profile-grid-two user-profile-grid-spaced">
                <div className="form-group">
                  <label className="form-label">Town</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={town} 
                    onChange={(e) => setTown(e.target.value)} 
                    placeholder="e.g. Dublin 1"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input 
                    type="text" 
                    className={`form-input ${errors.city ? 'is-invalid' : ''}`}
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    placeholder="e.g. Dublin"
                    required
                  />
                  {errors.city && <span className="form-error">{errors.city}</span>}
                </div>
              </div>

              <div className="user-profile-grid user-profile-grid-two user-profile-grid-spaced">
                <div className="form-group">
                  <label className="form-label">County</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={county} 
                    onChange={(e) => setCounty(e.target.value)} 
                    placeholder="e.g. Dublin"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Post Code *</label>
                  <input 
                    type="text" 
                    className={`form-input ${errors.postCode ? 'is-invalid' : ''}`}
                    value={postCode} 
                    onChange={(e) => setPostCode(e.target.value)} 
                    placeholder="e.g. D01 ABC2"
                    required
                  />
                  {errors.postCode && <span className="form-error">{errors.postCode}</span>}
                </div>
              </div>

              <div className="card user-profile-geocode-card">
                Latitude and longitude are generated automatically by the backend when the address is updated.
              </div>
            </div>

            <div className="user-profile-form-section">
              <h4 className="user-profile-section-title">Skills & Certifications</h4>
              <div className="user-profile-skills-grid">
                {STANDARD_SKILLS.map((skill) => (
                  <div key={skill} className="user-profile-skill-option">
                    <input 
                      type="checkbox" 
                      id={`skill-${skill}`}
                      checked={skills.includes(skill)}
                      onChange={() => handleToggleSkill(skill)}
                      className="user-profile-skill-checkbox"
                    />
                    <label htmlFor={`skill-${skill}`} className="user-profile-skill-label">{skill}</label>
                  </div>
                ))}
              </div>
              <div className="user-profile-custom-skill-row">
                <input 
                  type="text" 
                  className="form-input user-profile-compact-input"
                  placeholder="Custom skill..." 
                  value={customSkill} 
                  onChange={(e) => setCustomSkill(e.target.value)}
                />
                <button type="button" className="btn btn-outline user-profile-add-skill-button" onClick={handleAddCustomSkill}>Add</button>
              </div>
              <div className="user-profile-selected-skills">
                {skills.map((skill, index) => (
                  <span key={`${skill}-${index}`} className="profile-skill-pill user-profile-edit-skill-pill">
                    {skill}
                    <button type="button" className="user-profile-remove-skill" onClick={() => handleToggleSkill(skill)} aria-label={`Remove ${skill}`}>&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="user-profile-form-section">
              <h4 className="user-profile-section-title">Weekly Availability</h4>
              
              <div className="user-profile-availability-builder">
                <div className="form-group user-profile-availability-field user-profile-availability-day-field">
                  <label className="form-label">Day</label>
                  <select className="form-input user-profile-compact-input" value={newDay} onChange={(e) => setNewDay(e.target.value)}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group user-profile-availability-field user-profile-availability-time-field">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-input user-profile-compact-input" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
                </div>
                <div className="form-group user-profile-availability-field user-profile-availability-time-field">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-input user-profile-compact-input" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
                </div>
                <button type="button" className="btn btn-secondary user-profile-add-slot-button" onClick={handleAddSlot}>
                  Add Slot
                </button>
              </div>

              <div className="user-profile-availability-edit-list">
                {availability.length === 0 ? (
                  <span className="user-profile-empty-text">No availability slots defined. Caregiver will be unavailable.</span>
                ) : (
                  availability.map((slot, index) => (
                    <div key={`${slot.day}-${slot.startTime}-${index}`} className="user-profile-availability-edit-item">
                      <span className="user-profile-availability-edit-day">{slot.day}</span>
                      <span className="user-profile-availability-edit-time">{slot.startTime} - {slot.endTime}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSlot(index)} 
                        className="user-profile-remove-slot"
                        aria-label="Remove slot"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-actions user-profile-actions">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSaving}
              >
                {isSaving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="profile-details-list">
              <div className="profile-detail-row">
                <strong>Full Name:</strong>
                <span>{caregiver?.fullName}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Employee Code:</strong>
                <span>{caregiver?.employeeCode}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Gender:</strong>
                <span>{caregiver?.gender || 'N/A'}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Age:</strong>
                <span>{caregiver?.age || 'N/A'}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Address:</strong>
                <span>{formatAddress(caregiver?.address)}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Phone Number:</strong>
                <span>{caregiver?.phoneNumber || 'N/A'}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Pet Allergy:</strong>
                <span>{caregiver?.hasPetAllergy ? 'Yes (Allergic to Pets)' : 'No Pet Allergy'}</span>
              </div>
              <div className="profile-detail-row">
                <strong>Status:</strong>
                <span className={`badge user-profile-status-badge ${caregiver?.status === 'active' ? 'badge-in' : 'badge-out'}`}>
                  {caregiver?.status || 'active'}
                </span>
              </div>
              <div className="profile-detail-row profile-skills-row">
                <strong>Skills & Certifications:</strong>
                <div className="profile-skills-list">
                  {Array.isArray(caregiver?.skills) && caregiver.skills.length > 0 ? (
                    caregiver.skills.map((skill, index) => (
                      <span key={`${skill}-${index}`} className="profile-skill-pill">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="profile-skill-empty">No skills listed</span>
                  )}
                </div>
              </div>
              <div className="profile-detail-row profile-availability-row">
                <strong>Weekly Availability:</strong>
                <div className="profile-availability-list">
                  {Array.isArray(caregiver?.availability) && caregiver.availability.length > 0 ? (
                    caregiver.availability.map((avail, index) => (
                      <div key={`${avail.day}-${avail.startTime}-${index}`} className="profile-availability-item">
                        <span className="profile-availability-day">{avail.day}</span>
                        <span className="profile-availability-time">{avail.startTime} - {avail.endTime}</span>
                      </div>
                    ))
                  ) : (
                    <span className="profile-availability-empty">No availability specified</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-actions user-profile-actions">
              {isAdmin && (
                <>
                  <button 
                    type="button" 
                    className="btn btn-danger user-profile-delete-button" 
                    onClick={handleDeleteCaregiver}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Caregiver'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                </>
              )}
              <button type="button" className="btn btn-primary" onClick={() => onClose(false)}>
                Close Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}