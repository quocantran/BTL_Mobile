import api from './api';
import { IApiResponse, INotification, IPaginatedResponse } from '../types';

// Service for notification API calls from mobile
export const notificationService = {
  // Get paginated list of notifications
  async getNotifications(page: number = 1, limit: number = 20): Promise<IApiResponse<IPaginatedResponse<INotification> & { unreadCount: number }>> {
    const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Mark a single notification as read
  async markAsRead(id: string): Promise<IApiResponse<any>> {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<IApiResponse<any>> {
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  },

  // Get unread notification count
  async getUnreadCount(): Promise<IApiResponse<number>> {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // Delete a notification by ID
  async deleteNotification(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};
