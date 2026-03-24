import api from './api';
import { User, ChangeEvent, InspectionTemplate, InspectionResult, ChangeClass, ChangeCategory, ChangeItem, PolicySetting } from '@/types';

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
  create: (data: any) =>
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

  // Attachments
  addAttachment: (eventId: string, data: { filename: string; mimetype: string; size: number; data: string }) =>
    api.post(`/change-events/${eventId}/attachments`, data),
  getAttachments: (eventId: string) =>
    api.get<any[]>(`/change-events/${eventId}/attachments`),
  removeAttachment: (attachmentId: string) =>
    api.delete(`/change-events/attachments/${attachmentId}`),
  getAttachmentData: (attachmentId: string) =>
    api.get<any>(`/change-events/attachment-data/${attachmentId}`),
  seedTestData: () => api.post('/change-events/seed-test-data'),
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
  downloadInspection: (year: number, month: number, companyId?: string) =>
    api.get(`/excel/inspection/${year}/${month}`, { responseType: 'blob', params: companyId ? { companyId } : {} }),
};

export const codeMasters = {
  findClasses: () => api.get<ChangeClass[]>('/change-events/codes/classes'),
  findCategories: (classCode?: string) =>
    api.get<ChangeCategory[]>('/change-events/codes/categories', { params: { classCode } }),
  findItems: (categoryId?: string) =>
    api.get<ChangeItem[]>('/change-events/codes/items', { params: { categoryId } }),
  // CRUD
  createClass: (data: { code: string; name: string; description?: string }) =>
    api.post<ChangeClass>('/change-events/codes/classes', data),
  updateClass: (id: string, data: { name?: string; description?: string }) =>
    api.patch<ChangeClass>(`/change-events/codes/classes/${id}`, data),
  deleteClass: (id: string) => api.delete(`/change-events/codes/classes/${id}`),
  createCategory: (data: { classId: string; code: string; name: string; parentId?: string; depth?: number }) =>
    api.post<ChangeCategory>('/change-events/codes/categories', data),
  updateCategory: (id: string, data: { name?: string; description?: string }) =>
    api.patch<ChangeCategory>(`/change-events/codes/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/change-events/codes/categories/${id}`),
  createItem: (data: { categoryId: string; code: string; name: string; description?: string }) =>
    api.post<any>('/change-events/codes/items', data),
  updateItem: (id: string, data: { name?: string; description?: string }) =>
    api.patch<any>(`/change-events/codes/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/change-events/codes/items/${id}`),
};

export const users = {
  list: () => api.get<User[]>('/users'),
  get: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: { email: string; password: string; name: string; role: string; companyId?: string; team?: string; position?: string; phone?: string }) =>
    api.post<User>('/users', data),
  update: (id: string, data: { name?: string; role?: string; companyId?: string; password?: string; team?: string; position?: string; phone?: string }) =>
    api.patch<User>(`/users/${id}`, data),
  remove: (id: string) => api.delete(`/users/${id}`),
  companies: () => api.get<any[]>('/users/companies'),
  // 내 프로필
  getMyProfile: () => api.get<User>('/users/me'),
  updateMyProfile: (data: { name?: string; password?: string; team?: string; position?: string; phone?: string }) =>
    api.patch<User>('/users/me', data),
};

export const settings = {
  create: (data: {
    key: string;
    value: unknown;
    scopeType: string;
    scopeId?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
  }) => api.post<PolicySetting>('/settings', data),

  findAll: () => api.get<PolicySetting[]>('/settings'),

  findOne: (id: string) => api.get<PolicySetting>(`/settings/${id}`),

  update: (id: string, data: {
    value?: unknown;
    scopeType?: string;
    scopeId?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
  }) => api.patch<PolicySetting>(`/settings/${id}`, data),

  remove: (id: string) => api.delete(`/settings/${id}`),
};

// 공통코드 (DB 기반)
export const commonCodes = {
  getAll: () => api.get<Record<string, any[]>>('/settings/common-codes-all'),
  get: (group: string) => api.get<any[]>(`/settings/common-codes/${group}`),
  save: (group: string, items: any) => api.post(`/settings/common-codes/${group}`, { items }),
};

export const companies = {
  list: () => api.get<any[]>('/users/companies'),
  create: (data: { name: string; code: string; type: string }) => api.post('/users/companies', data),
  update: (id: string, data: { name?: string; code?: string; type?: string }) => api.patch(`/users/companies/${id}`, data),
  remove: (id: string) => api.delete(`/users/companies/${id}`),
};

export const notifications = {
  list: () => api.get<any[]>('/notifications'),
  unreadCount: () => api.get<number>('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  remove: (id: string) => api.delete(`/notifications/${id}`),
  removeAll: () => api.delete('/notifications'),
};
