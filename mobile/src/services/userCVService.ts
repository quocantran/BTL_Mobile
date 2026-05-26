import api from './api';
import { IApiResponse, IUserCV } from '../types';

// Service for CV management API calls from mobile
export const userCVService = {
  // Get current user's CV list
  async getMyCVs(): Promise<IApiResponse<IUserCV[]>> {
    const response = await api.get('/user-cvs');
    return response.data;
  },

  // Get CVs for application form (primary CV first)
  async getCVsForApplication(): Promise<IApiResponse<IUserCV[]>> {
    const response = await api.get('/user-cvs/for-application');
    return response.data;
  },

  // Get a single CV by ID
  async getCVById(id: string): Promise<IApiResponse<IUserCV>> {
    const response = await api.get(`/user-cvs/${id}`);
    return response.data;
  },

  // Upload CV via multipart/form-data
  async uploadCV(formData: FormData): Promise<IApiResponse<IUserCV>> {
    const response = await api.post('/user-cvs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Create a new CV record (after uploading to Cloudinary)
  async createCV(data: { url: string; title?: string; description?: string; isPrimary?: boolean }): Promise<IApiResponse<IUserCV>> {
    const response = await api.post('/user-cvs', data);
    return response.data;
  },

  // Update CV info (title, description)
  async updateCV(id: string, data: { title?: string; description?: string; isPrimary?: boolean }): Promise<IApiResponse<IUserCV>> {
    const response = await api.patch(`/user-cvs/${id}`, data);
    return response.data;
  },

  // Set a CV as primary (unsets the previous primary)
  async setPrimaryCv(id: string): Promise<IApiResponse<any>> {
    const response = await api.patch(`/user-cvs/${id}/set-primary`);
    return response.data;
  },

  // Delete a CV (soft delete)
  async deleteCV(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/user-cvs/${id}`);
    return response.data;
  },
};
