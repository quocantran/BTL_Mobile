import api from './api';
import { IApiResponse, IUser } from '../types';

export interface IUpdateProfileDto {
  name?: string;
  phone?: string;
  avatar?: string;
  age?: number;
  gender?: string;
  address?: string;
}

export const userService = {
  async getProfile(): Promise<IApiResponse<IUser>> {
    const response = await api.get('/users/profile');
    return response.data;
  },

  async updateProfile(data: IUpdateProfileDto): Promise<IApiResponse<IUser>> {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<IApiResponse<any>> {
    const response = await api.post('/users/change-password', { oldPassword, newPassword });
    return response.data;
  },

  async uploadAvatar(formData: FormData): Promise<IApiResponse<{ url: string }>> {
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data,
      timeout: 60000,
    });
    return response.data;
  },
};
