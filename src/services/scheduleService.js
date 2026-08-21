// src/services/scheduleService.js
import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Builds the Authorization header using the token saved by authService at login.
// Every protected endpoint (protect + adminOnly) requires this header.
const authHeader = () => ({
  headers: { Authorization: `Bearer ${authService.getToken()}` }
});

export const scheduleService = {
/*Submit a new schedule assignment request.
Backend runs all 8 validation rules and returns which rule failed,
if any.@param {object} payload - { clientCode, employeeCode, date, startTime, endTime, notes }
*/
  assignSchedule: async (payload) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/schedules/assign`,
        payload,
        authHeader()
      );
      return response.data;
    } catch (error) {
      //Backend returns { success: false, rule: N, message: "..." } on validation failure.
      //Surface that structured error instead of a generic Axios error.
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw { success: false, message: error.message || 'Request failed.' };
    }
  }
};