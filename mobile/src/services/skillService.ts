import api from './api';
import { IApiResponse, IPaginatedResponse, ISkill } from '../types';

// Service for fetching skills for the job subscription screen
export const skillService = {
  // Get all available skills from the system
  async getSkills(): Promise<IApiResponse<IPaginatedResponse<ISkill>>> {
    const response = await api.get('/skills');
    return response.data;
  },

  // Get skill details by ID
  async getSkillById(id: string): Promise<IApiResponse<ISkill>> {
    const response = await api.get(`/skills/${id}`);
    return response.data;
  },

  // Create a new skill if it doesn't exist
  async createSkill(name: string): Promise<IApiResponse<ISkill>> {
    const response = await api.post('/skills', { name });
    return response.data;
  },
};
