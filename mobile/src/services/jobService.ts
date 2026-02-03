import api from './api';
import { IApiResponse, IPaginatedResponse, IJob } from '../types';

export interface IJobSearchParams {
  current?: number;
  pageSize?: number;
  name?: string;
  location?: string;
  level?: string;
  salary?: any; // Can be string or object with $gte, $lte, $lt
  skills?: any; // Can be array or object with $in
  companyId?: string;
}

export const jobService = {
  async getJobs(params: IJobSearchParams = {}): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    const queryParams = new URLSearchParams();
    
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.name) queryParams.append('name', `/${params.name}/i`);
    if (params.location) queryParams.append('location', `/${params.location}/i`);
    if (params.level) queryParams.append('level', params.level);
    if (params.companyId) queryParams.append('company', params.companyId);
    
    // Handle skills filter - pass as regex pattern to match any skill
    if (params.skills && Array.isArray(params.skills) && params.skills.length > 0) {
      const skillsPattern = params.skills.join('|');
      queryParams.append('skills', `/${skillsPattern}/i`);
    }
    
    // Build base query string
    let queryString = queryParams.toString();
    
    // Handle salary filter - append manually to avoid URLSearchParams encoding brackets
    if (params.salary && typeof params.salary === 'object') {
      if (params.salary.$lt) {
        queryString += `&salary[lt]=${params.salary.$lt}`;
      }
      if (params.salary.$gte && params.salary.$lte) {
        queryString += `&salary[gte]=${params.salary.$gte}&salary[lte]=${params.salary.$lte}`;
      } else if (params.salary.$gte) {
        queryString += `&salary[gte]=${params.salary.$gte}`;
      }
    }

    const response = await api.get(`/jobs?${queryString}`);
    return response.data;
  },

  async getJobById(id: string): Promise<IApiResponse<IJob>> {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  async getJobsByCompany(companyId: string, params: IJobSearchParams = {}): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    const queryParams = new URLSearchParams();
    queryParams.append('companyId', companyId);
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const response = await api.get(`/jobs?${queryParams.toString()}`);
    return response.data;
  },

  async getTopJobs(limit: number = 10): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    const response = await api.get(`/jobs?pageSize=${limit}&sort=-createdAt`);
    return response.data;
  },

  async getJobsByHr(params: IJobSearchParams = {}): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    const queryParams = new URLSearchParams();
    
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.name) queryParams.append('name', `/${params.name}/i`);
    if (params.location) queryParams.append('location', `/${params.location}/i`);
    if (params.level) queryParams.append('level', params.level);

    const response = await api.get(`/jobs/by-hr/all?${queryParams.toString()}`);
    return response.data;
  },

  async searchJobsByHr(name: string, params: IJobSearchParams = {}): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    const queryParams = new URLSearchParams();
    
    if (name) queryParams.append('name', name);
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const response = await api.get(`/jobs/by-hr/search?${queryParams.toString()}`);
    return response.data;
  },

  async createJob(data: IJob): Promise<IApiResponse<IJob>> {
    const response = await api.post('/jobs', data);
    return response.data;
  },
  async updateJob(id: string, data: Partial<IJob>): Promise<IApiResponse<any>> {
    const response = await api.patch(`/jobs/${id}`, data);
    return response.data;
  },

  async deleteJob(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
};
