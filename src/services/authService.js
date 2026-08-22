// src/services/authService.js
import axios from 'axios';
import { API_URL, getApiErrorMessage } from '../config/api';

export const authService = {
  /**
   * Authenticate a user (caregiver or admin)
   * @param {string} fullName - User's full name
   * @param {string} employeeCode - User's unique employee code
   * @param {string} role - 'caregiver' or 'admin'
   */
  login: async (fullName, employeeCode, role) => {
    const cleanName = fullName.trim();
    const cleanCode = employeeCode.trim();

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        fullName: cleanName,
        employeeCode: cleanCode,
        role
      });

      if (response.data && response.data.success) {
        const { token, role: returnedRole, message } = response.data;
        const user = {
          fullName: cleanName,
          employeeCode: cleanCode,
          role: returnedRole
        };
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return {
          success: true,
          token,
          role: returnedRole,
          message: message || "Login successful."
        };
      } else {
        throw new Error(response.data?.message || "Authentication failed.");
      }
    } catch (error) {
      console.error('API login failed:', error);
      throw new Error(getApiErrorMessage(error, 'Connection refused by the auth server.'));
    }
  },

  /**
   * Request a registration verification code for a new admin account.
   * @param {string} fullName
   * @param {string} employeeCode
   * @param {string} email
   * @param {string} role
   */
  registerSendCode: async (fullName, employeeCode, email, role) => {
    const cleanName = fullName.trim();
    const cleanCode = employeeCode.trim();
    const cleanEmail = email.trim();

    try {
      const response = await axios.post(`${API_URL}/api/auth/register/send-code`, {
        fullName: cleanName,
        employeeCode: cleanCode,
        email: cleanEmail,
        role
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Verification code sent successfully.'
        };
      }

      throw new Error(response.data?.message || 'Failed to send verification code.');
    } catch (error) {
      console.error('API registration send-code failed:', error);
      throw new Error(getApiErrorMessage(error, 'Connection refused by the auth server.'));
    }
  },

  /**
   * Verify a registration code for the supplied email address.
   * @param {string} email
   * @param {string} code
   */
  registerVerify: async (email, code) => {
    const cleanEmail = email.trim();
    const cleanCode = code.trim();

    try {
      const response = await axios.post(`${API_URL}/api/auth/register/verify`, {
        email: cleanEmail,
        code: cleanCode
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Registration verified successfully.'
        };
      }

      throw new Error(response.data?.message || 'Failed to verify registration code.');
    } catch (error) {
      console.error('API registration verify failed:', error);
      throw new Error(getApiErrorMessage(error, 'Connection refused by the auth server.'));
    }
  },

  /**
   * Log the current user out, clearing cached auth credentials.
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Retrieve cached user details.
   * @returns {object|null}
   */
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get JWT auth token.
   * @returns {string|null}
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Checks if user session exists.
   * @returns {boolean}
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};
