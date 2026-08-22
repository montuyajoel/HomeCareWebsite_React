// src/services/scheduleService.js
import axios from 'axios';
import { authService } from './authService';
import { API_URL } from '../config/api';

const authHeader = () => ({
  headers: { Authorization: `Bearer ${authService.getToken()}` }
});

const toServiceError = (error) => {
  if (error.response?.data) {
    throw error.response.data;
  }
  throw { success: false, message: error.message || 'Request failed.' };
};

export const scheduleService = {
  assignSchedule: async (payload) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/schedules/assign`,
        payload,
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  validateAssignment: async (payload) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/schedules/validate`,
        payload,
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  getAvailableCaregivers: async ({ clientCode, date, startTime, endTime }) => {
    try {
      const params = new URLSearchParams({ clientCode, date, startTime, endTime });
      const response = await axios.get(
        `${API_URL}/api/schedules/available-caregivers?${params}`,
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  getSchedulesByDate: async (date) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/schedules/by-date?date=${encodeURIComponent(date)}`,
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  getSchedulesInRange: async (start, end) => {
    try {
      const params = new URLSearchParams({ start, end });
      const response = await axios.get(
        `${API_URL}/api/schedules/by-date?${params}`,
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  updateSchedule: async (scheduleId, payload) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/schedules/update/${scheduleId}`,
        payload,
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  reassignSchedule: async (scheduleId, employeeCode) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/schedules/${scheduleId}/reassign`,
        { employeeCode },
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  cancelSchedule: async (scheduleId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/schedules/${scheduleId}/cancel`,
        {},
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  getAvailableCaregiversBatch: async ({ clientCode, slots }) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/schedules/available-caregivers-batch`,
        { clientCode, slots },
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  validateAssignmentBatch: async ({ clientCode, employeeCode, slots }) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/schedules/validate-batch`,
        { clientCode, employeeCode, slots },
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  },

  assignScheduleBatch: async ({ clientCode, employeeCode, slots, notes }) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/schedules/assign-batch`,
        { clientCode, employeeCode, slots, notes },
        authHeader()
      );
      return response.data;
    } catch (error) {
      toServiceError(error);
    }
  }
};
