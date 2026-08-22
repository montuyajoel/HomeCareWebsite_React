// src/services/clientService.js
import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${authService.getToken()}`,
    'Content-Type': 'application/json'
  }
});

const authMultipartHeader = () => ({
  headers: {
    Authorization: `Bearer ${authService.getToken()}`
  }
});

const unwrapList = (responseData) => {
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.body)) return responseData.body;
  if (Array.isArray(responseData)) return responseData;
  return [];
};

const unwrapEntity = (responseData) => (
  responseData?.data || responseData?.body || responseData?.client || null
);

const toServiceError = (error) => {
  if (error.response?.data) {
    throw error.response.data;
  }
  throw { success: false, message: error.message || 'Request failed.' };
};

export const clientService = {
  getClients: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/clients`, authHeader());
      return {
        ...response.data,
        list: unwrapList(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  },

  createClient: async (payload) => {
    try {
      const response = await axios.post(`${API_URL}/api/clients`, payload, authHeader());
      return {
        ...response.data,
        client: unwrapEntity(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  },

  updateAddress: async (clientCode, address) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/clients/address/${encodeURIComponent(clientCode)}`,
        address,
        authHeader()
      );
      return {
        ...response.data,
        client: unwrapEntity(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  },

  updateStatus: async (clientCode, payload) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/clients/status/${encodeURIComponent(clientCode)}`,
        payload,
        authHeader()
      );
      return {
        ...response.data,
        client: unwrapEntity(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  },

  updateNote: async (clientCode, notes) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/clients/note/${encodeURIComponent(clientCode)}`,
        { notes },
        authHeader()
      );
      return {
        ...response.data,
        client: unwrapEntity(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  },

  updateEmergencyContact: async (clientCode, contact) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/clients/emergency-contact/${encodeURIComponent(clientCode)}`,
        contact,
        authHeader()
      );
      return {
        ...response.data,
        client: unwrapEntity(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  },

  downloadCarePlan: async (clientCode) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/clients/careplan/download/${encodeURIComponent(clientCode)}`,
        {
          ...authMultipartHeader(),
          responseType: 'blob'
        }
      );
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          success: false,
          status: error.response.status,
          message: error.response.status === 404
            ? 'No care plan file is currently available for this client.'
            : 'Unable to open care plan right now. Please try again.'
        };
      }
      toServiceError(error);
    }
  },

  uploadCarePlan: async (clientCode, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(
        `${API_URL}/api/clients/careplan/upload/${encodeURIComponent(clientCode)}`,
        formData,
        authMultipartHeader()
      );
      return {
        ...response.data,
        carePlan: response.data?.data?.carePlan || response.data?.carePlan || null,
        client: unwrapEntity(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  },

  updateCarePlan: async (clientCode, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.put(
        `${API_URL}/api/clients/careplan/${encodeURIComponent(clientCode)}`,
        formData,
        authMultipartHeader()
      );
      return {
        ...response.data,
        carePlan: response.data?.data?.carePlan || response.data?.carePlan || null,
        client: unwrapEntity(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  },

  deleteCarePlan: async (clientCode) => {
    try {
      const response = await axios.delete(
        `${API_URL}/api/clients/careplan/${encodeURIComponent(clientCode)}`,
        authMultipartHeader()
      );
      return {
        ...response.data,
        carePlan: null,
        client: unwrapEntity(response.data)
      };
    } catch (error) {
      toServiceError(error);
    }
  }
};
