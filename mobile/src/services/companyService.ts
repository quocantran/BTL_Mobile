import api from './api';
import { IApiResponse, IPaginatedResponse, ICompany } from '../types';

export interface ICompanySearchParams {
  current?: number;
  pageSize?: number;
  name?: string;
  address?: string;
  userId?: string;
  isActive?: boolean;
}

export const companyService = {
  async getCompanies(params: ICompanySearchParams = {}): Promise<IApiResponse<IPaginatedResponse<ICompany>>> {
    const queryParams = new URLSearchParams();
    
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.name) queryParams.append('name', `/${params.name}/i`);
    if (params.address) queryParams.append('address', `/${params.address}/i`);
    if (params.userId) queryParams.append('userId', params.userId);

    const response = await api.get(`/companies?${queryParams.toString()}`);
    return response.data;
  },

  async getCompanyById(id: string): Promise<IApiResponse<ICompany>> {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },

  async followCompany(companyId: string): Promise<IApiResponse<any>> {
    const response = await api.post('/companies/follow', { companyId });
    return response.data;
  },

  async unfollowCompany(companyId: string): Promise<IApiResponse<any>> {
    const response = await api.post('/companies/unfollow', { companyId });
    return response.data;
  },

  async getFollowedCompanies(): Promise<IApiResponse<ICompany[]>> {
    const response = await api.get('/users/followed-companies');
    return response.data;
  },

  async getTopCompanies(limit: number = 10): Promise<IApiResponse<IPaginatedResponse<ICompany>>> {
    const response = await api.get(`/companies?pageSize=${limit}`);
    return response.data;
  },

  async createCompany(data: { name: string; description?: string; address?: string; logo?: string }): Promise<IApiResponse<any>> {
    const response = await api.post('/companies', data);
    return response.data;
  },

  async verifyCompany(id: string): Promise<IApiResponse<any>> {
    const response = await api.post(`/companies/verify/${id}`);
    return response.data;
  },

  async getAllCompaniesByAdmin(params: ICompanySearchParams = {}): Promise<IApiResponse<IPaginatedResponse<ICompany>>> {
    const queryParams = new URLSearchParams();
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.name) queryParams.append('name', `/${params.name}/i`);
    if (params.address) queryParams.append('address', `/${params.address}/i`);
    if (params.userId) queryParams.append('userId', params.userId);
    if (typeof params.isActive === 'boolean') queryParams.append('isActive', params.isActive.toString());

    const response = await api.get(`/companies/by-admin/all?${queryParams.toString()}`);
    return response.data;
  },

  async updateCompanyByHr(companyId: string, data: { name?: string; description?: string; address?: string; logo?: string }): Promise<IApiResponse<any>> {
    const response = await api.patch(`/companies/${companyId}`, data);
    return response.data;
  }

};
