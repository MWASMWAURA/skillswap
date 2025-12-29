import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => 
    api.post('/auth/register', { name, email, password }),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};

export const skillsAPI = {
  getAll: (params?: { category?: string; search?: string; page?: number }) => 
    api.get('/skills', { params }),
  getById: (id: string) => api.get(`/skills/${id}`),
  create: (data: any) => api.post('/skills', data),
  update: (id: string, data: any) => api.put(`/skills/${id}`, data),
  delete: (id: string) => api.delete(`/skills/${id}`),
  search: (query: string) => api.get('/search', { params: { q: query } }),
};

export const exchangesAPI = {
  getAll: () => api.get('/exchanges'),
  getById: (id: string) => api.get(`/exchanges/${id}`),
  create: (data: any) => api.post('/exchanges', data),
  accept: (id: string) => api.post(`/exchanges/${id}/accept`),
  reject: (id: string) => api.post(`/exchanges/${id}/reject`),
  complete: (id: string) => api.post(`/exchanges/${id}/complete`),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (exchangeId: string) => api.get(`/messages/${exchangeId}`),
  send: (exchangeId: string, content: string) => 
    api.post(`/messages/${exchangeId}`, { content }),
};

export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  getById: (id: string) => api.get(`/users/${id}`),
  uploadAvatar: (formData: FormData) => 
    api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const calendarAPI = {
  getEvents: () => api.get('/calendar/events'),
  createEvent: (data: any) => api.post('/calendar/events', data),
  updateEvent: (id: string, data: any) => api.put(`/calendar/events/${id}`, data),
  deleteEvent: (id: string) => api.delete(`/calendar/events/${id}`),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  registerPushToken: (token: string) => 
    api.post('/notifications/push-token', { token }),
};

export const paymentsAPI = {
  createPaymentIntent: (amount: number, currency: string) => 
    api.post('/payments/create-intent', { amount, currency }),
  getPaymentHistory: () => api.get('/payments/history'),
  processPayment: (paymentMethodId: string, amount: number) => 
    api.post('/payments/process', { paymentMethodId, amount }),
};
