import api from './api';
import { IApiResponse, IPaginatedResponse, IUser } from '../types';

export const usersService = {
  async getUsers(): Promise<IApiResponse<IPaginatedResponse<IUser>>> {
    const response = await api.get('/users');
    return response.data;
  },

  async getUserById(id: string): Promise<IApiResponse<IUser>> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async createUser(data: Partial<IUser>): Promise<IApiResponse<IUser>> {
    const response = await api.post('/users', data);
    return response.data;
  },

  async updateUser(id: string, data: Partial<IUser>): Promise<IApiResponse<IUser>> {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export default usersService;
