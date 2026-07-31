// src/components/LoginForm.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function LoginForm({ role, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [recoveryState, setRecoveryState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }
    if (!employeeCode.trim()) {
      newErrors.employeeCode = 'Employee Code is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setRecoveryState(null);
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.login(
        fullName,
        employeeCode,
        role
      );
      if (result.success) {
        onSuccess(result);
      }
    } catch (err) {
      const message = err.message || 'Authentication failed. Please check your credentials.';
      const normalizedMessage = message.toLowerCase();
      const isMissingAccount = normalizedMessage.includes('no registered account') || normalizedMessage.includes('register first');

      if (isMissingAccount) {
        setRecoveryState({
          message,
          registerState: {
            fullName: fullName.trim(),
            employeeCode: employeeCode.trim()
          }
        });
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const otherRolePath = role === 'caregiver' ? '/admin/login' : '/caregiver/login';
  const otherRoleLabel = role === 'caregiver' ? 'Login as Admin' : 'Login as Caregiver';
  const registerPath = role === 'caregiver' ? '/caregiver/register' : '/admin/register';
  const registerCopy = role === 'caregiver'
    ? 'Register this caregiver profile to complete account setup, then return to sign in.'
    : 'Register this admin profile to complete account setup, then return to sign in.';

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <div className="alert alert-danger" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{submitError}</span>
        </div>
      )}

      {recoveryState && (
        <div className="auth-recovery-box" role="status" aria-live="polite">
          <div>
            <p className="auth-recovery-title">{recoveryState.message}</p>
            <p className="auth-recovery-copy">{registerCopy}</p>
          </div>
          <Link
            to={registerPath}
            state={recoveryState.registerState}
            className="btn btn-secondary btn-sm auth-recovery-action"
          >
            Register Now
          </Link>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="fullName">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          className={`form-input ${errors.fullName ? 'is-invalid' : ''}`}
          placeholder="e.g. Jane Smith"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
          }}
          disabled={isLoading}
          autoComplete="name"
          required
        />
        {errors.fullName && (
          <span className="form-error" id="fullName-error">
            {errors.fullName}
          </span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="employeeCode">
          Employee Code
        </label>
        <input
          id="employeeCode"
          type="text"
          className={`form-input ${errors.employeeCode ? 'is-invalid' : ''}`}
          placeholder={role === 'admin' ? 'e.g. EMP999' : 'e.g. EMP001'}
          value={employeeCode}
          onChange={(e) => {
            setEmployeeCode(e.target.value);
            if (errors.employeeCode) setErrors(prev => ({ ...prev, employeeCode: '' }));
          }}
          disabled={isLoading}
          autoComplete="off"
          required
        />
        {errors.employeeCode && (
          <span className="form-error" id="employeeCode-error">
            {errors.employeeCode}
          </span>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary login-submit-btn"
        disabled={isLoading}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {isLoading ? (
          <>
            <span className="spinner" aria-hidden="true"></span>
            <span>Logging in...</span>
          </>
        ) : (
          <span>Login</span>
        )}
      </button>

      <div className="auth-footer-links">
        <Link to={otherRolePath} className="auth-switch-link">
          {otherRoleLabel}
        </Link>
      </div>
    </form>
  );
}
