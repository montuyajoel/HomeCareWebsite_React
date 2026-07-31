// src/pages/CaregiverRegister.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { authService } from '../services/authService';

const DEFAULT_NAME = 'Maria Santos';
const DEFAULT_EMPLOYEE_CODE = 'EMM-XXX';
const DEFAULT_EMAIL = 'example@homecare.ie';
const DEFAULT_OTP = '';

function OtpModal({ code, setCode, isLoading, onSubmit, onClose }) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-content auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="caregiver-otp-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="auth-modal-header">
          <div>
            <p className="auth-modal-kicker">Verification required</p>
            <h2 id="caregiver-otp-modal-title">Enter the 6-digit code</h2>
          </div>
          <button type="button" className="auth-modal-close" onClick={onClose} aria-label="Close verification modal">
            ×
          </button>
        </div>

        <p className="auth-modal-copy">
          We sent a verification code to the caregiver email address. Enter it below to complete account setup.
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="caregiverOtpCode">
            Verification code
          </label>
          <input
            id="caregiverOtpCode"
            type="text"
            inputMode="numeric"
            maxLength="6"
            className="form-input auth-otp-input"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6 digits"
            autoComplete="one-time-code"
            disabled={isLoading}
          />
        </div>

        <div className="auth-modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={isLoading || code.trim().length !== 6}>
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CaregiverRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedState = location.state || {};

  const [fullName, setFullName] = useState(passedState.fullName || DEFAULT_NAME);
  const [employeeCode, setEmployeeCode] = useState(passedState.employeeCode || DEFAULT_EMPLOYEE_CODE);
  const [email, setEmail] = useState(passedState.email || DEFAULT_EMAIL);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [otpCode, setOtpCode] = useState(DEFAULT_OTP);
  const [otpOpen, setOtpOpen] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState('');

  useEffect(() => {
    setFullName(passedState.fullName || DEFAULT_NAME);
    setEmployeeCode(passedState.employeeCode || DEFAULT_EMPLOYEE_CODE);
    setEmail(passedState.email || DEFAULT_EMAIL);
  }, [passedState.fullName, passedState.employeeCode, passedState.email]);

  useEffect(() => {
    if (!otpOpen) {
      setOtpCode(DEFAULT_OTP);
    }
  }, [otpOpen]);

  useEffect(() => {
    if (!verificationSuccess) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      navigate('/caregiver/login', {
        replace: true,
        state: { message: verificationSuccess }
      });
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [navigate, verificationSuccess]);

  const handleSendCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setVerificationSuccess('');
    setIsLoading(true);

    try {
      const response = await authService.registerSendCode(fullName, employeeCode, email, 'caregiver');
      setMessage(response.message || 'Verification code sent.');
      setOtpOpen(true);
    } catch (sendError) {
      setError(sendError.message || 'Unable to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await authService.registerVerify(email, otpCode);
      setVerificationSuccess(response.message || 'Caregiver account verified successfully.');
      setOtpOpen(false);
    } catch (verifyError) {
      setError(verifyError.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Caregiver Registration"
      subtitle="Register a caregiver profile, receive a verification code, and complete setup in one flow."
    >
      <form className="register-form" onSubmit={handleSendCode} noValidate>
        {message && (
          <div className="alert alert-success" role="status" aria-live="polite">
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            <span>{error}</span>
          </div>
        )}

        {verificationSuccess && (
          <div className="alert alert-success" role="status" aria-live="polite">
            <span>{verificationSuccess} Redirecting to caregiver login...</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="caregiverRegisterFullName">Name</label>
          <input
            id="caregiverRegisterFullName"
            type="text"
            className="form-input"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={isLoading || otpOpen}
            autoComplete="name"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="caregiverRegisterEmployeeCode">Employee Code</label>
          <input
            id="caregiverRegisterEmployeeCode"
            type="text"
            className="form-input"
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value)}
            disabled={isLoading || otpOpen}
            autoComplete="off"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="caregiverRegisterEmail">Email</label>
          <input
            id="caregiverRegisterEmail"
            type="email"
            className="form-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading || otpOpen}
            autoComplete="email"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary login-submit-btn" disabled={isLoading || otpOpen} style={{ width: '100%', marginTop: '1rem' }}>
          {isLoading ? 'Sending Code...' : 'Send Code'}
        </button>
      </form>

      {otpOpen && (
        <OtpModal
          code={otpCode}
          setCode={setOtpCode}
          isLoading={isLoading}
          onSubmit={handleVerify}
          onClose={() => setOtpOpen(false)}
        />
      )}
    </AuthLayout>
  );
}