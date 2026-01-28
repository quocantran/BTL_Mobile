import api from './api';
import { ILoginRequest, IRegisterRequest, IAuthResponse, IApiResponse, IRegisterByHrRequest } from '../types';

export const authService = {
  async login(data: ILoginRequest): Promise<IApiResponse<IAuthResponse>> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async register(data: IRegisterRequest): Promise<IApiResponse<any>> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refreshToken(refreshToken: string): Promise<IApiResponse<IAuthResponse>> {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  async getProfile(): Promise<IApiResponse<any>> {
    const response = await api.get('/auth/account');
    return response.data;
  },

  async forgotPassword(email: string): Promise<IApiResponse<any>> {
    const response = await api.post('/otps', { email });
    return response.data;
  },

  async verifyOtp(email: string, otp: string): Promise<IApiResponse<any>> {
    const response = await api.post('/otps/verify-otp', { email, otp });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<IApiResponse<any>> {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  async googleLogin(token: string): Promise<IApiResponse<IAuthResponse>> {
    const response = await api.post('/auth/google', { token });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<IApiResponse<any>> {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  async registerByHr(data: IRegisterByHrRequest): Promise<IApiResponse<any>> {
    const response = await api.post('/auth/hr/register', data);
    return response.data;
  }
};
