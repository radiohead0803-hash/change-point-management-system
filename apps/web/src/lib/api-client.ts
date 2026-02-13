import api from './api';
import { User, ChangeEvent, InspectionTemplate, InspectionResult } from '@/types';

export const auth = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      email,
      password,
    }),

  register: (email: string, password: string, name: string, companyId: string) =>
    api.post<User>('/auth/register', { email, password, name, companyId }),

  refresh: () => api.post<{ access_token: string }>('/auth/refresh'),
};

export const changeEvents = {
  create: (data: Omit<ChangeEvent, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<ChangeEvent>('/change-events', data),

  list: (params?: {
    skip?: number;
    take?: number;
    status?: string;
    companyId?: string;
  }) => api.get<ChangeEvent[]>('/change-events', { params }),

  get: (id: string) => api.get<ChangeEvent>(`/change-events/${id}`),

  update: (id: string, data: Partial<ChangeEvent>) =>
    api.patch<ChangeEvent>(`/change-events/${id}`, data),

  delete: (id: string) => api.delete(`/change-events/${id}`),

  monthly: (year: number, month: number) =>
    api.get<ChangeEvent[]>(`/change-events/monthly/${year}/${month}`),
};

export const inspection = {
  createTemplate: (data: Omit<InspectionTemplate, 'id'>) =>
    api.post<InspectionTemplate>('/inspection/templates', data),

  listTemplates: () => api.get<InspectionTemplate[]>('/inspection/templates'),

  getActiveTemplate: () => api.get<InspectionTemplate>('/inspection/templates/active'),

  updateTemplate: (id: string, data: Partial<InspectionTemplate>) =>
    api.patch<InspectionTemplate>(`/inspection/templates/${id}`, data),

  deleteTemplate: (id: string) => api.delete(`/inspection/templates/${id}`),

  createResult: (data: Omit<InspectionResult, 'id'>) =>
    api.post<InspectionResult>('/inspection/results', data),

  getResultsByEvent: (eventId: string) =>
    api.get<InspectionResult[]>(`/inspection/results/event/${eventId}`),

  updateResult: (id: string, data: Partial<InspectionResult>) =>
    api.patch<InspectionResult>(`/inspection/results/${id}`, data),

  deleteResult: (id: string) => api.delete(`/inspection/results/${id}`),

  saveResults: (eventId: string, results: Array<{ itemId: string; value: string }>) =>
    api.post<InspectionResult[]>(`/inspection/results/bulk/${eventId}`, results),
};

export const excel = {
  downloadMonthly: (year: number, month: number) =>
    api.get(`/excel/monthly/${year}/${month}`, { responseType: 'blob' }),
};
