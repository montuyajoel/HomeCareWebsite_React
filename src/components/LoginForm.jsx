{/* src/components/LoginForm.jsx
This is a React component file that defines a reusable "login form" (LoginForm),
which supports two roles (caregiver and admin).
Main features: form validation, calling the login API, handling the "account not registered" case, showing a loading state,
and providing navigation links to switch roles or register a new account. 

This component uses one built-in Hook (useState) called 6 times, managing 6 pieces of data:
fullName, employeeCode, errors, submitError, recoveryState, and isLoading.*/}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
{/*authServicewraps the actual login request logic. (calling the backend API and returning the result) */}

export default function LoginForm({ role, onSuccess }) {
  {/*hook call 1, useState manages the value of the "full name" input field, initialized to an empty string*/}
  const [fullName, setFullName] = useState('');
 {/*hook call 2, useState manages the value of the "employee code" input field, initialized to an empty string*/}
  const [employeeCode, setEmployeeCode] = useState('');
  {/*hook call 3, useState manages field-level validation errors(an object keyed by field names), initialized to an empty object*/}
  const [errors, setErrors] = useState({});
  {/*hook call 4, useState manages the "submit error" state (for general errors), initialized to an empty string*/}
  const [submitError, setSubmitError] = useState('');
  {/*hook call 5,useState manages the "account not registered" state, initialized to null*/}
  const [recoveryState, setRecoveryState] = useState(null);
  {/*hook call 6, useState manages whether a request is submitting (used to disable the button, show a spinner), initialized to false*/}
  const [isLoading, setIsLoading] = useState(false);

  {/*----------Form validation function--------------------
  Check if the required fields are empty(after trimming whitespace)
  and set error messages accordingly into one object.*/}
  const validateForm = () => {
    {/*fullName/employeeCode read here are the state values stored by the Hooks above.*/}
    const newErrors = {};
    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }
    if (!employeeCode.trim()) {
      newErrors.employeeCode = 'Employee Code is required.';
    }
    setErrors(newErrors);
    {/*Calling setErrors, the updater function returned by Hook #3, triggers a re-render.*/}
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');{/*calling setSubmitError, the updater function returned by Hook #4, triggers a re-render.*/}
    setRecoveryState(null); {/*calling setRecoveryState, the updater function returned by Hook #5, triggers a re-render.*/}
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);{/*calling setIsLoading, the updater function returned by Hook #6, enter loading state*/}

    try {
      const result = await authService.login(
        fullName,
        employeeCode,
        role
      );  {/*// authService.login is an async function that calls the backend API and returns a result object with success status and data or error message.*/}
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

    {/*reads hook 4's state value (submitError) to decide whether to render.
    reads hook 5's state value (recoveryState) to decide whether to render.
    */}
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

      {/**reads hook 6's state value (isLoading) to decide whether to disable the button. */}
      <button
        type="submit"
        className="btn btn-primary login-submit-btn"
        disabled={isLoading}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {/*reads hook 6's state value (isLoading) again to switch the button content. */}
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
