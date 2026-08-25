// src/pages/AdminClientsDirectory.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CarePlanPdfModal from '../components/CarePlanPdfModal';
import NotificationCard from '../components/NotificationCard';
import { authService } from '../services/authService';
import { clientService } from '../services/clientService';
import '../styles/adminClientsDirectory.css';
import '../styles/adminCaregiverDirectory.css';

import { STANDARD_CARE_SKILLS as STANDARD_CARE_NEEDS } from '../constants/careSkills';

const CLIENT_STATUSES = ['active', 'inactive', 'deceased', 'other'];
const MOBILITY_STATUSES = [
  'Independent',
  'Assisted',
  'Hoisted',
  'Wheelchair-bound',
  'Bedridden',
  'Other'
];
const COGNITIVE_STATUSES = [
  'Normal',
  'Mild Cognitive Impairment',
  'Dementia',
  'Other'
];
const INACTIVE_STATUS_REASONS = [
  'None',
  'hospitalised',
  'temporary-service-paused',
  'termination-of-service',
  'family-request',
  'other'
];
const GENDER_OPTIONS = ['Female', 'Male', 'Other'];
const PREFERRED_CAREGIVER_GENDERS = ['Female', 'Male', 'Other', 'No Preference'];

const EMPTY_CREATE_FORM = {
  clientCode: '',
  fullName: '',
  gender: 'Female',
  age: 70,
  birthDate: '',
  preferredCaregiverGender: 'No Preference',
  mobilityStatus: 'Independent',
  cognitiveStatus: 'Normal',
  addressLine: '',
  town: '',
  city: 'Dublin',
  county: 'Dublin',
  postCode: '',
  phoneNumber: '',
  hasPets: false,
  careNeeds: [],
  emergencyName: '',
  emergencyRelationship: '',
  emergencyPhone: '',
  notes: '',
  status: 'active'
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  return value;
};

const formatBirthDate = (value) => {
  if (!value) return 'N/A';
  const dateOnly = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const date = new Date(`${dateOnly}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatAddress = (address) => {
  if (!address) return 'N/A';
  const parts = [
    address.addressLine,
    address.town,
    address.city,
    address.county,
    address.postCode
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

const isValidPhone = (value) => /^\+?[0-9]{7,15}$/.test(String(value || '').trim());
const isValidBirthDate = (value) => (
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value))
);

const statusClassName = (status) => {
  if (status === 'active') return 'admin-client-status admin-client-status--active';
  if (status === 'inactive') return 'admin-client-status admin-client-status--inactive';
  if (status === 'deceased') return 'admin-client-status admin-client-status--deceased';
  return 'admin-client-status admin-client-status--other';
};

export default function AdminClientsDirectory() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [createErrors, setCreateErrors] = useState({});
  const [customNeedInput, setCustomNeedInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [updateForm, setUpdateForm] = useState({});
  const [updateErrors, setUpdateErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const [isCarePlanModalOpen, setIsCarePlanModalOpen] = useState(false);
  const [carePlanFile, setCarePlanFile] = useState(null);
  const [isCarePlanDragging, setIsCarePlanDragging] = useState(false);
  const [isCarePlanSubmitting, setIsCarePlanSubmitting] = useState(false);
  const [isCarePlanLoading, setIsCarePlanLoading] = useState(false);
  const [carePlanPdfModal, setCarePlanPdfModal] = useState({
    isOpen: false,
    clientName: '',
    pdfUrl: null,
    error: null
  });
  const carePlanRequestIdRef = useRef(0);
  const carePlanFileInputRef = useRef(null);

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

  const closeNotificationCard = () => setNotificationCard(null);

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

  const fetchClients = async () => {
    setIsLoading(true);
    setError('');

    const token = authService.getToken();
    if (!token) {
      setError('Session expired. Please sign in again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await clientService.getClients();
      if (response?.success === false) {
        setError(response.message || 'Failed to fetch clients.');
        setClients([]);
        return;
      }
      setClients(response.list || []);
      setSelectedClient((prev) => {
        if (!prev) return null;
        return (response.list || []).find((client) => client.clientCode === prev.clientCode) || prev;
      });
    } catch (err) {
      setError(err.message || 'Error fetching clients.');
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      result = result.filter((client) => (
        (client.fullName || '').toLowerCase().includes(query)
        || (client.clientCode || '').toLowerCase().includes(query)
        || (client.phoneNumber || '').toLowerCase().includes(query)
        || (client.address?.city || '').toLowerCase().includes(query)
        || (client.careNeeds || []).some((need) => (need || '').toLowerCase().includes(query))
      ));
    }

    if (statusFilter !== 'all') {
      result = result.filter((client) => client.status === statusFilter);
    }

    if (genderFilter !== 'all') {
      result = result.filter((client) => client.gender === genderFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.fullName || '').localeCompare(b.fullName || '');
      if (sortBy === 'name-desc') return (b.fullName || '').localeCompare(a.fullName || '');
      if (sortBy === 'age-asc') return (a.age || 0) - (b.age || 0);
      if (sortBy === 'age-desc') return (b.age || 0) - (a.age || 0);
      if (sortBy === 'code-asc') return (a.clientCode || '').localeCompare(b.clientCode || '');
      if (sortBy === 'code-desc') return (b.clientCode || '').localeCompare(a.clientCode || '');
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return 0;
    });

    return result;
  }, [clients, searchTerm, statusFilter, genderFilter, sortBy]);

  const updateCreateField = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCreateCareNeed = (need) => {
    setCreateForm((prev) => {
      const exists = prev.careNeeds.includes(need);
      return {
        ...prev,
        careNeeds: exists
          ? prev.careNeeds.filter((item) => item !== need)
          : [...prev.careNeeds, need]
      };
    });
  };

  const addCustomCareNeed = () => {
    const need = customNeedInput.trim();
    if (!need) return;
    setCreateForm((prev) => (
      prev.careNeeds.includes(need)
        ? prev
        : { ...prev, careNeeds: [...prev.careNeeds, need] }
    ));
    setCustomNeedInput('');
  };

  const openCreateModal = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateErrors({});
    setCustomNeedInput('');
    setIsCreateModalOpen(true);
  };

  const validateCreateForm = () => {
    const errs = {};

    if (!createForm.clientCode.trim()) errs.clientCode = 'Client code is required.';
    if (!createForm.fullName.trim()) errs.fullName = 'Full name is required.';
    if (createForm.age === '' || Number.isNaN(Number(createForm.age))) {
      errs.age = 'Age is required.';
    } else if (Number(createForm.age) < 0 || Number(createForm.age) > 120) {
      errs.age = 'Age must be between 0 and 120.';
    }
    if (!isValidBirthDate(createForm.birthDate)) {
      errs.birthDate = 'Birth date must be YYYY-MM-DD.';
    }
    if (!createForm.addressLine.trim()) errs.addressLine = 'Address line is required.';
    if (!createForm.city.trim()) errs.city = 'City is required.';
    if (!createForm.postCode.trim()) errs.postCode = 'Post code is required.';
    if (!isValidPhone(createForm.phoneNumber)) {
      errs.phoneNumber = 'Phone must be 7-15 digits (optional +).';
    }
    if (!createForm.emergencyName.trim()) errs.emergencyName = 'Emergency contact name is required.';
    if (!createForm.emergencyRelationship.trim()) {
      errs.emergencyRelationship = 'Emergency contact relationship is required.';
    }
    if (!isValidPhone(createForm.emergencyPhone)) {
      errs.emergencyPhone = 'Emergency phone must be 7-15 digits (optional +).';
    }

    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (!validateCreateForm()) return;

    setIsSubmitting(true);
    const payload = {
      clientCode: createForm.clientCode.trim().toUpperCase(),
      fullName: createForm.fullName.trim(),
      gender: createForm.gender,
      age: Number(createForm.age),
      birthDate: createForm.birthDate,
      preferredCaregiverGender: createForm.preferredCaregiverGender,
      mobilityStatus: createForm.mobilityStatus,
      cognitiveStatus: createForm.cognitiveStatus,
      address: {
        addressLine: createForm.addressLine.trim(),
        town: createForm.town.trim(),
        city: createForm.city.trim(),
        county: createForm.county.trim(),
        postCode: createForm.postCode.trim()
      },
      phoneNumber: createForm.phoneNumber.trim(),
      hasPets: Boolean(createForm.hasPets),
      careNeeds: createForm.careNeeds,
      emergencyContact: {
        name: createForm.emergencyName.trim(),
        relationship: createForm.emergencyRelationship.trim(),
        phoneNumber: createForm.emergencyPhone.trim()
      },
      notes: createForm.notes.trim(),
      status: createForm.status
    };

    try {
      const response = await clientService.createClient(payload);
      if (response?.success === false) {
        showNotificationCard({
          type: 'error',
          title: 'Create Failed',
          message: response.message || 'Failed to create client.'
        });
        return;
      }

      setIsCreateModalOpen(false);
      showNotificationCard({
        type: 'success',
        title: 'Client Added',
        message: response?.message || `${payload.fullName} was created successfully.`
      });
      fetchClients();
    } catch (err) {
      showNotificationCard({
        type: 'error',
        title: 'Create Failed',
        message: err.message || 'Error creating client.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openUpdateModal = (type, client) => {
    setUpdateErrors({});

    if (type === 'address') {
      setUpdateForm({
        addressLine: client.address?.addressLine || '',
        town: client.address?.town || '',
        city: client.address?.city || '',
        county: client.address?.county || '',
        postCode: client.address?.postCode || ''
      });
    } else if (type === 'status') {
      setUpdateForm({
        status: client.status || 'active',
        inactiveReason: client.statusDetails?.inactiveReason || 'None',
        statusNotes: client.statusDetails?.statusNotes || ''
      });
    } else if (type === 'notes') {
      setUpdateForm({ notes: client.notes || '' });
    } else if (type === 'emergency') {
      setUpdateForm({
        name: client.emergencyContact?.name || '',
        relationship: client.emergencyContact?.relationship || '',
        phoneNumber: client.emergencyContact?.phoneNumber || ''
      });
    }

    setUpdateModal({ type, client });
  };

  const closeUpdateModal = () => {
    setUpdateModal(null);
    setUpdateForm({});
    setUpdateErrors({});
  };

  const validateUpdateForm = () => {
    const errs = {};
    if (!updateModal) return false;

    if (updateModal.type === 'address') {
      if (!updateForm.addressLine?.trim()) errs.addressLine = 'Address line is required.';
      if (!updateForm.city?.trim()) errs.city = 'City is required.';
      if (!updateForm.postCode?.trim()) errs.postCode = 'Post code is required.';
    }

    if (updateModal.type === 'status') {
      if (!updateForm.status) errs.status = 'Status is required.';
      if (updateForm.status === 'inactive' && !updateForm.inactiveReason) {
        errs.inactiveReason = 'Inactive reason is required.';
      }
    }

    if (updateModal.type === 'emergency') {
      if (!updateForm.name?.trim()) errs.name = 'Name is required.';
      if (!updateForm.relationship?.trim()) errs.relationship = 'Relationship is required.';
      if (!isValidPhone(updateForm.phoneNumber)) {
        errs.phoneNumber = 'Phone must be 7-15 digits (optional +).';
      }
    }

    setUpdateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const applyClientUpdate = (clientCode, updatedClient) => {
    if (!updatedClient) {
      fetchClients();
      return;
    }

    setClients((prev) => prev.map((client) => (
      client.clientCode === clientCode
        ? { ...client, ...updatedClient }
        : client
    )));

    setSelectedClient((prev) => (
      prev?.clientCode === clientCode
        ? { ...prev, ...updatedClient }
        : prev
    ));
  };

  const openClientDetails = (client) => {
    setSelectedClient(client);
  };

  const closeClientDetails = () => {
    setSelectedClient(null);
  };

  const hasCarePlan = Boolean(selectedClient?.carePlan?.filePath);

  const openCarePlanManager = () => {
    setCarePlanFile(null);
    setIsCarePlanDragging(false);
    setIsCarePlanModalOpen(true);
  };

  const closeCarePlanManager = () => {
    setIsCarePlanModalOpen(false);
    setCarePlanFile(null);
    setIsCarePlanDragging(false);
  };

  const closeCarePlanPdfModal = () => {
    carePlanRequestIdRef.current += 1;
    setIsCarePlanLoading(false);
    setCarePlanPdfModal((prev) => {
      if (prev.pdfUrl) {
        URL.revokeObjectURL(prev.pdfUrl);
      }
      return {
        isOpen: false,
        clientName: '',
        pdfUrl: null,
        error: null
      };
    });
  };

  const mergeCarePlanOntoClient = (clientCode, response, fallbackCarePlan = null) => {
    const carePlan = response?.client?.carePlan
      ?? response?.data?.carePlan
      ?? response?.carePlan
      ?? fallbackCarePlan;

    if (carePlan === undefined) {
      fetchClients();
      return;
    }

    applyClientUpdate(clientCode, { carePlan });
  };

  const handleViewCarePlan = async () => {
    if (!selectedClient?.clientCode || !hasCarePlan) return;

    const requestId = ++carePlanRequestIdRef.current;
    const token = authService.getToken();
    if (!token) {
      setCarePlanPdfModal({
        isOpen: true,
        clientName: selectedClient.fullName || '',
        pdfUrl: null,
        error: 'Your session has expired. Please sign in again.'
      });
      return;
    }

    setIsCarePlanLoading(true);
    setCarePlanPdfModal((prev) => {
      if (prev.pdfUrl) {
        URL.revokeObjectURL(prev.pdfUrl);
      }
      return {
        isOpen: true,
        clientName: selectedClient.fullName || '',
        pdfUrl: null,
        error: null
      };
    });

    try {
      const response = await clientService.downloadCarePlan(selectedClient.clientCode);
      if (requestId !== carePlanRequestIdRef.current) return;

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf'
      });
      const blobUrl = URL.createObjectURL(blob);

      setCarePlanPdfModal({
        isOpen: true,
        clientName: selectedClient.fullName || '',
        pdfUrl: blobUrl,
        error: null
      });
    } catch (error) {
      if (requestId !== carePlanRequestIdRef.current) return;

      setCarePlanPdfModal({
        isOpen: true,
        clientName: selectedClient.fullName || '',
        pdfUrl: null,
        error: error?.message || 'Unable to open care plan right now. Please try again.'
      });
    } finally {
      if (requestId === carePlanRequestIdRef.current) {
        setIsCarePlanLoading(false);
      }
    }
  };

  const acceptCarePlanFile = (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name?.toLowerCase().endsWith('.pdf')) {
      showNotificationCard({
        type: 'warning',
        title: 'Invalid File',
        message: 'Please choose a PDF care plan file.'
      });
      return;
    }
    setCarePlanFile(file);
  };

  const handleCarePlanFileInput = (event) => {
    const file = event.target.files?.[0];
    acceptCarePlanFile(file);
    event.target.value = '';
  };

  const handleCarePlanDrop = (event) => {
    event.preventDefault();
    setIsCarePlanDragging(false);
    const file = event.dataTransfer.files?.[0];
    acceptCarePlanFile(file);
  };

  const handleCarePlanUploadOrUpdate = async () => {
    if (!selectedClient?.clientCode || !carePlanFile) return;

    const clientCode = selectedClient.clientCode;
    const replacingExisting = Boolean(selectedClient?.carePlan?.filePath);

    setIsCarePlanSubmitting(true);
    try {
      let response;
      let didUpdate = replacingExisting;

      if (replacingExisting) {
        try {
          response = await clientService.updateCarePlan(clientCode, carePlanFile);
        } catch (updateError) {
          const shouldFallbackToUpload = /no existing care plan/i.test(updateError?.message || '');
          if (!shouldFallbackToUpload) {
            throw updateError;
          }
          response = await clientService.uploadCarePlan(clientCode, carePlanFile);
          didUpdate = false;
        }
      } else {
        response = await clientService.uploadCarePlan(clientCode, carePlanFile);
      }

      if (response?.success === false) {
        const shouldFallbackToUpload = replacingExisting
          && /no existing care plan/i.test(response.message || '');

        if (shouldFallbackToUpload) {
          response = await clientService.uploadCarePlan(clientCode, carePlanFile);
          didUpdate = false;
        }
      }

      if (response?.success === false) {
        showNotificationCard({
          type: 'error',
          title: 'Care Plan Failed',
          message: response.message || 'Failed to save care plan.'
        });
        return;
      }

      mergeCarePlanOntoClient(clientCode, response);
      fetchClients();
      setCarePlanFile(null);
      showNotificationCard({
        type: 'success',
        title: didUpdate ? 'Care Plan Updated' : 'Care Plan Uploaded',
        message: response?.message
          || (didUpdate
            ? 'The care plan was replaced successfully.'
            : 'The care plan was uploaded successfully.')
      });
    } catch (err) {
      showNotificationCard({
        type: 'error',
        title: 'Care Plan Failed',
        message: err.message || 'Error saving care plan.'
      });
    } finally {
      setIsCarePlanSubmitting(false);
    }
  };

  const handleDeleteCarePlan = () => {
    if (!selectedClient?.clientCode || !hasCarePlan) return;

    requestConfirmationCard({
      title: 'Delete Care Plan',
      message: `Delete the care plan for ${selectedClient.fullName || selectedClient.clientCode}? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setIsCarePlanSubmitting(true);
        try {
          const response = await clientService.deleteCarePlan(selectedClient.clientCode);
          if (response?.success === false) {
            showNotificationCard({
              type: 'error',
              title: 'Delete Failed',
              message: response.message || 'Failed to delete care plan.'
            });
            return;
          }

          applyClientUpdate(selectedClient.clientCode, { carePlan: null });
          fetchClients();
          setCarePlanFile(null);
          showNotificationCard({
            type: 'success',
            title: 'Care Plan Deleted',
            message: response?.message || 'The care plan was deleted successfully.'
          });
        } catch (err) {
          showNotificationCard({
            type: 'error',
            title: 'Delete Failed',
            message: err.message || 'Error deleting care plan.'
          });
        } finally {
          setIsCarePlanSubmitting(false);
        }
      }
    });
  };

  const formatCarePlanDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAvatar = (name, gender) => {
    const initials = name
      ? name.split(' ').map((part) => part[0]).join('').substring(0, 2).toUpperCase()
      : 'CL';

    let genderClass = 'admin-client-avatar--other';
    if (gender === 'Female') {
      genderClass = 'admin-client-avatar--female';
    } else if (gender === 'Male') {
      genderClass = 'admin-client-avatar--male';
    }

    return (
      <div
        className={`admin-client-avatar ${genderClass}`}
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  };

  const handleUpdateSubmit = async (event) => {
    event.preventDefault();
    if (!updateModal || !validateUpdateForm()) return;

    setIsUpdating(true);
    const { type, client } = updateModal;
    const clientCode = client.clientCode;

    try {
      let response;

      if (type === 'address') {
        response = await clientService.updateAddress(clientCode, {
          addressLine: updateForm.addressLine.trim(),
          town: updateForm.town.trim(),
          city: updateForm.city.trim(),
          county: updateForm.county.trim(),
          postCode: updateForm.postCode.trim()
        });
      } else if (type === 'status') {
        const payload = { status: updateForm.status };
        if (updateForm.status === 'inactive') {
          payload.inactiveReason = updateForm.inactiveReason;
          payload.statusNotes = updateForm.statusNotes?.trim() || '';
        }
        response = await clientService.updateStatus(clientCode, payload);
      } else if (type === 'notes') {
        response = await clientService.updateNote(clientCode, updateForm.notes || '');
      } else if (type === 'emergency') {
        response = await clientService.updateEmergencyContact(clientCode, {
          name: updateForm.name.trim(),
          relationship: updateForm.relationship.trim(),
          phoneNumber: updateForm.phoneNumber.trim()
        });
      }

      if (response?.success === false) {
        showNotificationCard({
          type: 'error',
          title: 'Update Failed',
          message: response.message || 'Failed to update client.'
        });
        return;
      }

      applyClientUpdate(clientCode, response?.client);
      closeUpdateModal();
      showNotificationCard({
        type: 'success',
        title: 'Client Updated',
        message: response?.message || `${client.fullName || clientCode} was updated successfully.`
      });

      if (!response?.client) {
        fetchClients();
      }
    } catch (err) {
      showNotificationCard({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Error updating client.'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setGenderFilter('all');
  };

  const updateModalTitle = {
    address: 'Update Address',
    status: 'Update Status',
    notes: 'Update Notes',
    emergency: 'Update Emergency Contact'
  };

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        <div className="admin-clients-header">
          <div>
            <h2 className="admin-clients-title">Client Records</h2>
            <p className="admin-clients-subtitle">
              Browse client records, sort and filter, add clients, and open a profile to update details.
            </p>
          </div>
          <div className="admin-clients-header-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/dashboard')}>
              Dashboard
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              + Add Client
            </button>
          </div>
        </div>

        <div className="card admin-clients-controls">
          <div className="form-group admin-clients-control">
            <label className="form-label" htmlFor="search-clients">Search</label>
            <input
              id="search-clients"
              type="text"
              className="form-input"
              placeholder="Name, code, city, care need..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group admin-clients-control">
            <label className="form-label" htmlFor="filter-client-status">Status</label>
            <select
              id="filter-client-status"
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {CLIENT_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="form-group admin-clients-control">
            <label className="form-label" htmlFor="filter-client-gender">Gender</label>
            <select
              id="filter-client-gender"
              className="form-input"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <option value="all">All Genders</option>
              {GENDER_OPTIONS.map((gender) => (
                <option key={gender} value={gender}>{gender}</option>
              ))}
            </select>
          </div>

          <div className="form-group admin-clients-control">
            <label className="form-label" htmlFor="sort-clients">Sort By</label>
            <select
              id="sort-clients"
              className="form-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="age-asc">Age (Youngest)</option>
              <option value="age-desc">Age (Oldest)</option>
              <option value="code-asc">Client Code (Asc)</option>
              <option value="code-desc">Client Code (Desc)</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="card admin-clients-state-card">
            <p className="admin-clients-muted-text">Loading client records...</p>
          </div>
        ) : error ? (
          <div className="card admin-clients-error-card">
            <p>{error}</p>
          </div>
        ) : filteredAndSortedClients.length === 0 ? (
          <div className="card admin-clients-empty-card">
            <h3 className="admin-clients-empty-title">No Clients Found</h3>
            <p className="admin-clients-empty-text">No profiles match your search criteria.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="admin-clients-grid">
            {filteredAndSortedClients.map((client) => (
              <button
                key={client.clientCode}
                type="button"
                className="card admin-client-card"
                onClick={() => openClientDetails(client)}
              >
                {renderAvatar(client.fullName, client.gender)}
                <h3 className="admin-client-card-name">{displayValue(client.fullName)}</h3>
                <code className="admin-client-card-code">{displayValue(client.clientCode)}</code>
                <span className={statusClassName(client.status)}>{displayValue(client.status)}</span>
              </button>
            ))}
          </div>
        )}
      </main>

      {selectedClient && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-details-popup-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeClientDetails();
          }}
        >
          <div className="modal-content card admin-client-details-modal">
            <div className="admin-client-modal-header">
              <div className="admin-client-details-heading">
                {renderAvatar(selectedClient.fullName, selectedClient.gender)}
                <div>
                  <h2 id="client-details-popup-title" className="admin-client-modal-title">
                    {displayValue(selectedClient.fullName)}
                  </h2>
                  <code className="admin-client-card-code">{displayValue(selectedClient.clientCode)}</code>
                </div>
              </div>
              <button
                type="button"
                className="admin-client-modal-close"
                onClick={closeClientDetails}
                aria-label="Close client details"
              >
                &times;
              </button>
            </div>

            <div className="admin-client-details-status-row">
              <span className={statusClassName(selectedClient.status)}>
                {displayValue(selectedClient.status)}
              </span>
            </div>

            <section className="admin-client-section" aria-label="Identity">
              <h4 className="admin-client-section-title">Identity</h4>
              <div className="admin-client-detail-row">
                <strong>Gender</strong>
                <span>{displayValue(selectedClient.gender)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Age</strong>
                <span>{displayValue(selectedClient.age)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Birth Date</strong>
                <span>{formatBirthDate(selectedClient.birthDate)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Phone</strong>
                <span>{displayValue(selectedClient.phoneNumber)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Preferred Caregiver</strong>
                <span>{displayValue(selectedClient.preferredCaregiverGender)}</span>
              </div>
            </section>

            <section className="admin-client-section" aria-label="Health context">
              <h4 className="admin-client-section-title">Health Context</h4>
              <div className="admin-client-detail-row">
                <strong>Mobility</strong>
                <span>{displayValue(selectedClient.mobilityStatus)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Cognitive</strong>
                <span>{displayValue(selectedClient.cognitiveStatus)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Has Pets</strong>
                <span>
                  {typeof selectedClient.hasPets === 'boolean'
                    ? (selectedClient.hasPets ? 'Yes' : 'No')
                    : 'N/A'}
                </span>
              </div>
            </section>

            <section className="admin-client-section" aria-label="Address">
              <h4 className="admin-client-section-title">Address</h4>
              <div className="admin-client-detail-row">
                <strong>Location</strong>
                <span>{formatAddress(selectedClient.address)}</span>
              </div>
            </section>

            <section className="admin-client-section" aria-label="Care needs">
              <h4 className="admin-client-section-title">Care Needs</h4>
              <div className="admin-client-pills">
                {(Array.isArray(selectedClient.careNeeds) && selectedClient.careNeeds.length > 0) ? (
                  selectedClient.careNeeds.map((need, index) => (
                    <span key={`${need}-${index}`} className="admin-client-pill">{need}</span>
                  ))
                ) : (
                  <span className="admin-clients-muted-text">No care needs listed</span>
                )}
              </div>
            </section>

            <section className="admin-client-section" aria-label="Emergency contact">
              <h4 className="admin-client-section-title">Emergency Contact</h4>
              <div className="admin-client-detail-row">
                <strong>Name</strong>
                <span>{displayValue(selectedClient.emergencyContact?.name)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Relationship</strong>
                <span>{displayValue(selectedClient.emergencyContact?.relationship)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Phone</strong>
                <span>{displayValue(selectedClient.emergencyContact?.phoneNumber)}</span>
              </div>
            </section>

            <section className="admin-client-section" aria-label="Status details">
              <h4 className="admin-client-section-title">Status Details</h4>
              <div className="admin-client-detail-row">
                <strong>Inactive Reason</strong>
                <span>{displayValue(selectedClient.statusDetails?.inactiveReason)}</span>
              </div>
              <div className="admin-client-detail-row">
                <strong>Status Notes</strong>
                <span>{displayValue(selectedClient.statusDetails?.statusNotes)}</span>
              </div>
            </section>

            <section className="admin-client-section" aria-label="Notes">
              <h4 className="admin-client-section-title">Notes</h4>
              <p className="admin-client-notes">
                {selectedClient.notes?.trim() ? selectedClient.notes : 'No notes'}
              </p>
            </section>

            <section className="admin-client-section" aria-label="Care plan">
              <h4 className="admin-client-section-title">Care Plan</h4>
              <div className="admin-client-detail-row">
                <strong>Status</strong>
                <span>
                  {selectedClient.carePlan?.filePath
                    ? 'On file'
                    : 'Not uploaded'}
                </span>
              </div>
            </section>

            <div className="admin-client-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openUpdateModal('address', selectedClient)}
              >
                Update Address
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openUpdateModal('status', selectedClient)}
              >
                Update Status
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openUpdateModal('notes', selectedClient)}
              >
                Update Notes
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openUpdateModal('emergency', selectedClient)}
              >
                Update Emergency
              </button>
              <button
                type="button"
                className="btn btn-sm admin-client-careplan-button"
                onClick={openCarePlanManager}
              >
                Manage Care Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {isCarePlanModalOpen && selectedClient && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="care-plan-manage-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCarePlanManager();
          }}
        >
          <div className="modal-content card admin-client-careplan-modal">
            <div className="admin-client-modal-header">
              <div>
                <h2 id="care-plan-manage-title" className="admin-client-modal-title">
                  Manage Care Plan
                </h2>
                <p className="admin-client-careplan-subtitle">
                  {selectedClient.fullName} · {selectedClient.clientCode}
                </p>
              </div>
              <button
                type="button"
                className="admin-client-modal-close"
                onClick={closeCarePlanManager}
                aria-label="Close care plan manager"
              >
                &times;
              </button>
            </div>

            <section className="admin-client-careplan-block" aria-label="Current care plan">
              <h4 className="admin-client-section-title">Current File</h4>
              {hasCarePlan ? (
                <div className="admin-client-careplan-meta">
                  <div className="admin-client-careplan-meta-item">
                    <span className="admin-client-careplan-meta-label">File</span>
                    <span
                      className="admin-client-careplan-meta-value"
                      title={selectedClient.carePlan?.storedFilename || undefined}
                    >
                      {displayValue(selectedClient.carePlan?.storedFilename)}
                    </span>
                  </div>
                  <div className="admin-client-careplan-meta-item">
                    <span className="admin-client-careplan-meta-label">Uploaded</span>
                    <span className="admin-client-careplan-meta-value">
                      {formatCarePlanDate(selectedClient.carePlan?.uploadedAt)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="admin-clients-muted-text">No care plan uploaded for this client yet.</p>
              )}

              <div className="admin-client-careplan-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleViewCarePlan}
                  disabled={!hasCarePlan || isCarePlanLoading || isCarePlanSubmitting}
                >
                  {isCarePlanLoading ? 'Opening...' : 'View Care Plan'}
                </button>
                {hasCarePlan && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteCarePlan}
                    disabled={isCarePlanSubmitting}
                  >
                    Delete Care Plan
                  </button>
                )}
              </div>
            </section>

            <section className="admin-client-careplan-block" aria-label="Upload or update care plan">
              <h4 className="admin-client-section-title">
                {hasCarePlan ? 'Update Care Plan' : 'Add Care Plan'}
              </h4>
              <div
                className={`admin-client-dropzone ${isCarePlanDragging ? 'admin-client-dropzone--active' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsCarePlanDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsCarePlanDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsCarePlanDragging(false);
                }}
                onDrop={handleCarePlanDrop}
              >
                <p className="admin-client-dropzone-title">
                  Drag and drop a PDF here
                </p>
                <p className="admin-client-dropzone-text">or</p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => carePlanFileInputRef.current?.click()}
                  disabled={isCarePlanSubmitting}
                >
                  Browse Files
                </button>
                <input
                  ref={carePlanFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="admin-client-file-input"
                  onChange={handleCarePlanFileInput}
                />
              </div>

              {carePlanFile && (
                <div className="admin-client-selected-file">
                  <span className="admin-client-selected-file-name" title={carePlanFile.name}>
                    {carePlanFile.name}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setCarePlanFile(null)}
                    disabled={isCarePlanSubmitting}
                  >
                    Clear
                  </button>
                </div>
              )}
            </section>

            <div className="modal-actions admin-client-careplan-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeCarePlanManager}
                disabled={isCarePlanSubmitting}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCarePlanUploadOrUpdate}
                disabled={!carePlanFile || isCarePlanSubmitting}
              >
                {isCarePlanSubmitting
                  ? 'Saving...'
                  : (hasCarePlan ? 'Update Care Plan' : 'Upload Care Plan')}
              </button>
            </div>
          </div>
        </div>
      )}

      <CarePlanPdfModal
        isOpen={carePlanPdfModal.isOpen}
        title={carePlanPdfModal.clientName}
        pdfUrl={carePlanPdfModal.pdfUrl}
        isLoading={isCarePlanLoading}
        error={carePlanPdfModal.error}
        onClose={closeCarePlanPdfModal}
      />

      {isCreateModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-client-title">
          <div className="modal-content card admin-client-create-modal">
            <div className="admin-client-modal-header">
              <h2 id="create-client-title" className="admin-client-modal-title">Add New Client</h2>
              <button
                type="button"
                className="admin-client-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close create client modal"
              >
                &times;
              </button>
            </div>

            <form className="admin-client-form" onSubmit={handleCreateSubmit}>
              <div className="admin-client-form-grid admin-client-form-grid--2">
                <div className="form-group">
                  <label className="form-label" htmlFor="create-client-code">Client Code *</label>
                  <input
                    id="create-client-code"
                    type="text"
                    className={`form-input ${createErrors.clientCode ? 'is-invalid' : ''}`}
                    placeholder="e.g. CLT004"
                    value={createForm.clientCode}
                    onChange={(e) => updateCreateField('clientCode', e.target.value)}
                    required
                  />
                  {createErrors.clientCode && <span className="form-error">{createErrors.clientCode}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="create-full-name">Full Name *</label>
                  <input
                    id="create-full-name"
                    type="text"
                    className={`form-input ${createErrors.fullName ? 'is-invalid' : ''}`}
                    placeholder="e.g. John Snow"
                    value={createForm.fullName}
                    onChange={(e) => updateCreateField('fullName', e.target.value)}
                    required
                  />
                  {createErrors.fullName && <span className="form-error">{createErrors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="create-gender">Gender *</label>
                  <select
                    id="create-gender"
                    className="form-input"
                    value={createForm.gender}
                    onChange={(e) => updateCreateField('gender', e.target.value)}
                  >
                    {GENDER_OPTIONS.map((gender) => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="create-age">Age *</label>
                  <input
                    id="create-age"
                    type="number"
                    min="0"
                    max="120"
                    className={`form-input ${createErrors.age ? 'is-invalid' : ''}`}
                    value={createForm.age}
                    onChange={(e) => updateCreateField('age', e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                  {createErrors.age && <span className="form-error">{createErrors.age}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="create-birth-date">Birth Date *</label>
                  <input
                    id="create-birth-date"
                    type="date"
                    className={`form-input ${createErrors.birthDate ? 'is-invalid' : ''}`}
                    value={createForm.birthDate}
                    onChange={(e) => updateCreateField('birthDate', e.target.value)}
                    required
                  />
                  {createErrors.birthDate && <span className="form-error">{createErrors.birthDate}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="create-preferred-gender">Preferred Caregiver</label>
                  <select
                    id="create-preferred-gender"
                    className="form-input"
                    value={createForm.preferredCaregiverGender}
                    onChange={(e) => updateCreateField('preferredCaregiverGender', e.target.value)}
                  >
                    {PREFERRED_CAREGIVER_GENDERS.map((gender) => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="create-mobility">Mobility</label>
                  <select
                    id="create-mobility"
                    className="form-input"
                    value={createForm.mobilityStatus}
                    onChange={(e) => updateCreateField('mobilityStatus', e.target.value)}
                  >
                    {MOBILITY_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="create-cognitive">Cognitive</label>
                  <select
                    id="create-cognitive"
                    className="form-input"
                    value={createForm.cognitiveStatus}
                    onChange={(e) => updateCreateField('cognitiveStatus', e.target.value)}
                  >
                    {COGNITIVE_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="create-phone">Phone Number *</label>
                  <input
                    id="create-phone"
                    type="text"
                    className={`form-input ${createErrors.phoneNumber ? 'is-invalid' : ''}`}
                    placeholder="e.g. +353838119159"
                    value={createForm.phoneNumber}
                    onChange={(e) => updateCreateField('phoneNumber', e.target.value)}
                    required
                  />
                  {createErrors.phoneNumber && <span className="form-error">{createErrors.phoneNumber}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="create-status">Status</label>
                  <select
                    id="create-status"
                    className="form-input"
                    value={createForm.status}
                    onChange={(e) => updateCreateField('status', e.target.value)}
                  >
                    {CLIENT_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-client-checkbox-row admin-client-form-span-2">
                  <input
                    id="create-has-pets"
                    type="checkbox"
                    className="admin-client-checkbox"
                    checked={createForm.hasPets}
                    onChange={(e) => updateCreateField('hasPets', e.target.checked)}
                  />
                  <label htmlFor="create-has-pets" className="form-label admin-client-checkbox-label">
                    Has Pets
                  </label>
                </div>
              </div>

              <div className="admin-client-form-section">
                <h4 className="admin-client-section-heading">Address</h4>
                <div className="admin-client-form-grid admin-client-form-grid--2">
                  <div className="form-group admin-client-form-span-2">
                    <label className="form-label" htmlFor="create-address-line">Address Line *</label>
                    <input
                      id="create-address-line"
                      type="text"
                      className={`form-input ${createErrors.addressLine ? 'is-invalid' : ''}`}
                      value={createForm.addressLine}
                      onChange={(e) => updateCreateField('addressLine', e.target.value)}
                      required
                    />
                    {createErrors.addressLine && <span className="form-error">{createErrors.addressLine}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="create-town">Town</label>
                    <input
                      id="create-town"
                      type="text"
                      className="form-input"
                      value={createForm.town}
                      onChange={(e) => updateCreateField('town', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="create-city">City *</label>
                    <input
                      id="create-city"
                      type="text"
                      className={`form-input ${createErrors.city ? 'is-invalid' : ''}`}
                      value={createForm.city}
                      onChange={(e) => updateCreateField('city', e.target.value)}
                      required
                    />
                    {createErrors.city && <span className="form-error">{createErrors.city}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="create-county">County</label>
                    <input
                      id="create-county"
                      type="text"
                      className="form-input"
                      value={createForm.county}
                      onChange={(e) => updateCreateField('county', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="create-postcode">Post Code *</label>
                    <input
                      id="create-postcode"
                      type="text"
                      className={`form-input ${createErrors.postCode ? 'is-invalid' : ''}`}
                      value={createForm.postCode}
                      onChange={(e) => updateCreateField('postCode', e.target.value)}
                      required
                    />
                    {createErrors.postCode && <span className="form-error">{createErrors.postCode}</span>}
                  </div>
                </div>
              </div>

              <div className="admin-client-form-section">
                <h4 className="admin-client-section-heading">Emergency Contact</h4>
                <div className="admin-client-form-grid admin-client-form-grid--2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="create-emergency-name">Name *</label>
                    <input
                      id="create-emergency-name"
                      type="text"
                      className={`form-input ${createErrors.emergencyName ? 'is-invalid' : ''}`}
                      value={createForm.emergencyName}
                      onChange={(e) => updateCreateField('emergencyName', e.target.value)}
                      required
                    />
                    {createErrors.emergencyName && <span className="form-error">{createErrors.emergencyName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="create-emergency-relationship">Relationship *</label>
                    <input
                      id="create-emergency-relationship"
                      type="text"
                      className={`form-input ${createErrors.emergencyRelationship ? 'is-invalid' : ''}`}
                      value={createForm.emergencyRelationship}
                      onChange={(e) => updateCreateField('emergencyRelationship', e.target.value)}
                      required
                    />
                    {createErrors.emergencyRelationship && (
                      <span className="form-error">{createErrors.emergencyRelationship}</span>
                    )}
                  </div>
                  <div className="form-group admin-client-form-span-2">
                    <label className="form-label" htmlFor="create-emergency-phone">Phone *</label>
                    <input
                      id="create-emergency-phone"
                      type="text"
                      className={`form-input ${createErrors.emergencyPhone ? 'is-invalid' : ''}`}
                      value={createForm.emergencyPhone}
                      onChange={(e) => updateCreateField('emergencyPhone', e.target.value)}
                      required
                    />
                    {createErrors.emergencyPhone && <span className="form-error">{createErrors.emergencyPhone}</span>}
                  </div>
                </div>
              </div>

              <div className="admin-client-form-section">
                <h4 className="admin-client-section-heading">Care Needs</h4>
                <div className="admin-client-needs-grid">
                  {STANDARD_CARE_NEEDS.map((need) => (
                    <div key={need} className="admin-client-need-option">
                      <input
                        id={`create-need-${need}`}
                        type="checkbox"
                        checked={createForm.careNeeds.includes(need)}
                        onChange={() => toggleCreateCareNeed(need)}
                      />
                      <label htmlFor={`create-need-${need}`}>{need}</label>
                    </div>
                  ))}
                </div>
                <div className="admin-client-custom-need-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Custom care need..."
                    value={customNeedInput}
                    onChange={(e) => setCustomNeedInput(e.target.value)}
                  />
                  <button type="button" className="btn btn-outline" onClick={addCustomCareNeed}>
                    Add
                  </button>
                </div>
                <div className="admin-client-selected-needs">
                  {createForm.careNeeds.map((need) => (
                    <span key={need} className="admin-client-selected-need">
                      {need}
                      <button
                        type="button"
                        className="admin-client-selected-need-remove"
                        onClick={() => toggleCreateCareNeed(need)}
                        aria-label={`Remove ${need}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="admin-client-form-section">
                <h4 className="admin-client-section-heading">Notes</h4>
                <div className="form-group">
                  <label className="form-label" htmlFor="create-notes">Care Notes</label>
                  <textarea
                    id="create-notes"
                    className="form-input"
                    rows="4"
                    value={createForm.notes}
                    onChange={(e) => updateCreateField('notes', e.target.value)}
                    placeholder="e.g. Mild dementia. Needs morning medication reminder."
                  />
                </div>
              </div>

              <div className="modal-actions admin-client-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {updateModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="update-client-title">
          <div className="modal-content card admin-client-update-modal">
            <div className="admin-client-modal-header">
              <h2 id="update-client-title" className="admin-client-modal-title">
                {updateModalTitle[updateModal.type]} — {updateModal.client.clientCode}
              </h2>
              <button
                type="button"
                className="admin-client-modal-close"
                onClick={closeUpdateModal}
                aria-label="Close update modal"
              >
                &times;
              </button>
            </div>

            <form className="admin-client-form" onSubmit={handleUpdateSubmit}>
              {updateModal.type === 'address' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="update-address-line">Address Line *</label>
                    <input
                      id="update-address-line"
                      type="text"
                      className={`form-input ${updateErrors.addressLine ? 'is-invalid' : ''}`}
                      value={updateForm.addressLine || ''}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, addressLine: e.target.value }))}
                      required
                    />
                    {updateErrors.addressLine && <span className="form-error">{updateErrors.addressLine}</span>}
                  </div>
                  <div className="admin-client-form-grid admin-client-form-grid--2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="update-town">Town</label>
                      <input
                        id="update-town"
                        type="text"
                        className="form-input"
                        value={updateForm.town || ''}
                        onChange={(e) => setUpdateForm((prev) => ({ ...prev, town: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="update-city">City *</label>
                      <input
                        id="update-city"
                        type="text"
                        className={`form-input ${updateErrors.city ? 'is-invalid' : ''}`}
                        value={updateForm.city || ''}
                        onChange={(e) => setUpdateForm((prev) => ({ ...prev, city: e.target.value }))}
                        required
                      />
                      {updateErrors.city && <span className="form-error">{updateErrors.city}</span>}
                    </div>
                  </div>
                  <div className="admin-client-form-grid admin-client-form-grid--2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="update-county">County</label>
                      <input
                        id="update-county"
                        type="text"
                        className="form-input"
                        value={updateForm.county || ''}
                        onChange={(e) => setUpdateForm((prev) => ({ ...prev, county: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="update-postcode">Post Code *</label>
                      <input
                        id="update-postcode"
                        type="text"
                        className={`form-input ${updateErrors.postCode ? 'is-invalid' : ''}`}
                        value={updateForm.postCode || ''}
                        onChange={(e) => setUpdateForm((prev) => ({ ...prev, postCode: e.target.value }))}
                        required
                      />
                      {updateErrors.postCode && <span className="form-error">{updateErrors.postCode}</span>}
                    </div>
                  </div>
                </>
              )}

              {updateModal.type === 'status' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="update-status">Status *</label>
                    <select
                      id="update-status"
                      className={`form-input ${updateErrors.status ? 'is-invalid' : ''}`}
                      value={updateForm.status || 'active'}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      {CLIENT_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    {updateErrors.status && <span className="form-error">{updateErrors.status}</span>}
                  </div>
                  {updateForm.status === 'inactive' && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor="update-inactive-reason">Inactive Reason *</label>
                        <select
                          id="update-inactive-reason"
                          className={`form-input ${updateErrors.inactiveReason ? 'is-invalid' : ''}`}
                          value={updateForm.inactiveReason || 'None'}
                          onChange={(e) => setUpdateForm((prev) => ({ ...prev, inactiveReason: e.target.value }))}
                        >
                          {INACTIVE_STATUS_REASONS.map((reason) => (
                            <option key={reason} value={reason}>{reason}</option>
                          ))}
                        </select>
                        {updateErrors.inactiveReason && (
                          <span className="form-error">{updateErrors.inactiveReason}</span>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="update-status-notes">Status Notes</label>
                        <textarea
                          id="update-status-notes"
                          className="form-input"
                          rows="3"
                          value={updateForm.statusNotes || ''}
                          onChange={(e) => setUpdateForm((prev) => ({ ...prev, statusNotes: e.target.value }))}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {updateModal.type === 'notes' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="update-notes">Notes</label>
                  <textarea
                    id="update-notes"
                    className="form-input"
                    rows="6"
                    value={updateForm.notes || ''}
                    onChange={(e) => setUpdateForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              )}

              {updateModal.type === 'emergency' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="update-emergency-name">Name *</label>
                    <input
                      id="update-emergency-name"
                      type="text"
                      className={`form-input ${updateErrors.name ? 'is-invalid' : ''}`}
                      value={updateForm.name || ''}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                    {updateErrors.name && <span className="form-error">{updateErrors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="update-emergency-relationship">Relationship *</label>
                    <input
                      id="update-emergency-relationship"
                      type="text"
                      className={`form-input ${updateErrors.relationship ? 'is-invalid' : ''}`}
                      value={updateForm.relationship || ''}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, relationship: e.target.value }))}
                      required
                    />
                    {updateErrors.relationship && <span className="form-error">{updateErrors.relationship}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="update-emergency-phone">Phone *</label>
                    <input
                      id="update-emergency-phone"
                      type="text"
                      className={`form-input ${updateErrors.phoneNumber ? 'is-invalid' : ''}`}
                      value={updateForm.phoneNumber || ''}
                      onChange={(e) => setUpdateForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                      required
                    />
                    {updateErrors.phoneNumber && <span className="form-error">{updateErrors.phoneNumber}</span>}
                  </div>
                </>
              )}

              <div className="modal-actions admin-client-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeUpdateModal}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
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
          titleId="client-notification-title"
        />
      )}
    </div>
  );
}
