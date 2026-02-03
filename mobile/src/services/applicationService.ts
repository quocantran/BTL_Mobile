import api from './api';
import { IApiResponse, IApplication, IPaginatedResponse, IAIRankingResponse } from '../types';

export interface ICreateApplicationDto {
  cvId: string;
  jobId: string;
  companyId: string;
  coverLetter?: string;
}

export const applicationService = {
  async apply(data: ICreateApplicationDto): Promise<IApiResponse<IApplication>> {
    const response = await api.post('/applications', data);
    return response.data;
  },

  async getMyApplications(): Promise<IApiResponse<IApplication[]>> {
    const response = await api.get('/applications/my-applications');
    return response.data;
  },

  async getApplicationById(id: string): Promise<IApiResponse<IApplication>> {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },

  async withdrawApplication(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/applications/${id}`);
    return response.data;
  },

  // HR/Admin functions
  async getAllApplications(params: any = {}): Promise<IApiResponse<IPaginatedResponse<IApplication>>> {
    const queryParams = new URLSearchParams();
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.status) queryParams.append('status', params.status);

    const response = await api.get(`/applications?${queryParams.toString()}`);
    return response.data;
  },

  async getApplicationsByJob(jobId: string, params: any = {}): Promise<IApiResponse<IPaginatedResponse<IApplication>>> {
    const queryParams = new URLSearchParams();
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.status) queryParams.append('status', params.status);

    const response = await api.get(`/applications/by-job/${jobId}?${queryParams.toString()}`);
    return response.data;
  },

  async updateApplicationStatus(id: string, status: string): Promise<IApiResponse<IApplication>> {
    const response = await api.patch(`/applications/${id}/status`, { status });
    return response.data;
  },

  // AI Ranking - Get top candidates ranked by AI matching
  async getAIRankedCandidates(jobId: string, topN: number = 10): Promise<IApiResponse<IAIRankingResponse>> {
    const response = await api.get(`/applications/by-job/${jobId}/ai-rank?topN=${topN}`);
    return response.data;
  },
};
