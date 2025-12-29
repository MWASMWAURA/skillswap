// Mock authentication for testing messages functionality
import { apiClient, User } from './api';

// Mock user data
const MOCK_USERS = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    profilePhoto: '',
    level: 2,
    reputation: 85,
    location: 'New York',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    profilePhoto: '',
    level: 1,
    reputation: 72,
    location: 'San Francisco',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const MOCK_TOKEN = 'mock-jwt-token-for-testing';

// Mock login function
export const mockLogin = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Find user by email or default to first user
  const user = MOCK_USERS.find(u => u.email === email) || MOCK_USERS[0];
  
  // Store in localStorage to simulate persistence
  localStorage.setItem('authToken', MOCK_TOKEN);
  localStorage.setItem('mockUser', JSON.stringify(user));
  
  return {
    user,
    token: MOCK_TOKEN
  };
};

// Mock get current user
export const getMockCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('mockUser');
  return userStr ? JSON.parse(userStr) : null;
};

// Mock logout
export const mockLogout = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('mockUser');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('authToken');
};

// Get current user
export const getCurrentUser = (): User | null => {
  return getMockCurrentUser();
};

// Override the API client's auth methods for testing
export const setupMockAuth = () => {
  // Override login
  (apiClient as any).login = mockLogin;
  
  // Override getMe to return current user
  (apiClient as any).getMe = async () => {
    const user = getCurrentUser();
    return {
      data: user,
      error: null
    };
  };
  
  // Override logout
  (apiClient as any).logout = mockLogout;
  
  console.log('✅ Mock authentication setup complete');
};

// Auto-setup mock auth
setupMockAuth();