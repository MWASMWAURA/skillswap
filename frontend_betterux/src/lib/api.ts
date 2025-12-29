// API Configuration and Base Client
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: number;
  email?: string;
  name: string;
  profilePhoto?: string;
  bio?: string;
  level: number;
  reputation: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: number;
  userId: number;
  title: string;
  description: string;
  categoryId: number;
  subcategory?: string;
  mode: string; // 'online', 'in-person', 'hybrid'
  duration: number; // in minutes
  price?: number;
  isActive: boolean;
  isVerified: boolean;
  verificationStatus: string;
  rating?: number;
  reviewCount: number;
  viewCount: number;
  requestCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    profilePhoto?: string;
    level: number;
    reputation: number;
    location?: string;
  };
  _count?: {
    exchanges: number;
  };
}

export interface Exchange {
  id: number;
  requesterId: number;
  providerId: number;
  skillId: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate?: string;
  completedDate?: string;
  timeCredits?: number;
  payment?: number;
  createdAt: string;
  updatedAt: string;
  skill?: Skill;
  requester?: User;
  provider?: User;
  messages?: Message[];
}

export interface Message {
  id: number;
  exchangeId: number;
  senderId: number;
  message: string;
  isRead: boolean;
  edited: boolean;
  editedAt?: string;
  deleted: boolean;
  deletedAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: number;
    name: string;
    profilePhoto?: string;
  };
  reactions?: Array<{
    id: number;
    emoji: string;
    userId: number;
  }>;
  threadReplies?: Array<{
    id: number;
    message: string;
    sender: {
      id: number;
      name: string;
      profilePhoto?: string;
    };
    createdAt: string;
  }>;
}

export interface Conversation {
  id: number;
  skill: {
    id: number;
    title: string;
    category: string;
  };
  otherUser: {
    id: number;
    name: string;
    profilePhoto?: string;
  };
  status: string;
  lastMessage?: {
    id: number;
    message: string;
    sender: {
      id: number;
      name: string;
    };
    createdAt: string;
  };
  updatedAt: string;
  createdAt: string;
}

export interface UserStats {
  totalExchanges: number;
  rating: number;
  reviewCount: number;
  xp: number;
  level: number;
  badges: string[];
  skillsTaught: number;
  skillsLearned: number;
}

export interface GamificationProgress {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    progress: number;
    target: number;
    completed: boolean;
  }>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle different error response formats
        const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'An error occurred',
      };
    }
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
  }) {
    return this.request<{ user: User; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Skills
  async getSkills(filters?: {
    category?: string;
    level?: string;
    isOnline?: boolean;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const query = params.toString();
    const response = await this.request<{ skills: Skill[]; pagination: any }>(`/skills${query ? `?${query}` : ''}`);
    
    // Extract skills array from the response
    return {
      ...response,
      data: response.data?.skills || []
    };
  }

  async getSkill(id: string) {
    return this.request<Skill>(`/skills/${id}`);
  }

  async createSkill(skillData: Partial<Skill>) {
    return this.request<Skill>('/skills', {
      method: 'POST',
      body: JSON.stringify(skillData),
    });
  }

  async updateSkill(id: string, skillData: Partial<Skill>) {
    return this.request<Skill>(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(skillData),
    });
  }

  async deleteSkill(id: string) {
    return this.request(`/skills/${id}`, { method: 'DELETE' });
  }

  async getUserSkills(userId: string) {
    return this.request<Skill[]>(`/skills/user/${userId}`);
  }

  async getPopularSkills() {
    return this.request<Skill[]>('/skills/popular');
  }

  // Exchanges
  async getExchanges() {
    const response = await this.request<{ exchanges: Exchange[]; pagination: any }>('/exchanges');
    
    // Extract exchanges array from the response
    return {
      ...response,
      data: response.data?.exchanges || []
    };
  }

  async getExchange(id: string) {
    return this.request<Exchange>(`/exchanges/${id}`);
  }

  async createExchange(exchangeData: {
    skillId: string;
    scheduledDate?: string;
    message?: string;
  }) {
    return this.request<Exchange>('/exchanges', {
      method: 'POST',
      body: JSON.stringify(exchangeData),
    });
  }

  async updateExchangeStatus(id: string, status: string) {
    return this.request<Exchange>(`/exchanges/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async cancelExchange(id: string) {
    return this.request(`/exchanges/${id}`, { method: 'DELETE' });
  }

  // Messages
  async getExchangeMessages(exchangeId: string) {
    const response = await this.request<{
      messages: Message[];
      conversation: any;
      pagination: any;
    }>(`/messages/exchanges/${exchangeId}`);
    
    // Extract messages array from the response
    return {
      ...response,
      data: response.data?.messages || []
    };
  }

  async sendMessage(exchangeId: string, message: string) {
    return this.request<{ message: string; messageData: Message }>(`/messages/exchanges/${exchangeId}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getUserConversations() {
    return this.request<Exchange[]>('/messages/conversations');
  }

  async getUnreadMessageCount() {
    return this.request<{ count: number }>('/messages/unread-count');
  }

  // Users
  async getUserProfile(userId: string) {
    return this.request<User>(`/users/${userId}`);
  }

  async updateProfile(userData: Partial<User>) {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async searchUsers(query: string) {
    return this.request<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  async getUserStats() {
    return this.request<UserStats>('/users/me/stats');
  }

  // Gamification
  async getUserProgress() {
    return this.request<GamificationProgress>('/gamification/progress');
  }

  async getLeaderboards() {
    return this.request<Array<{
      user: User;
      stats: UserStats;
      rank: number;
    }>>('/gamification/leaderboards');
  }

  async getUserBadges() {
    return this.request<GamificationProgress['badges']>('/gamification/badges');
  }

  async getAchievements() {
    return this.request<GamificationProgress['achievements']>('/gamification/achievements');
  }

  async trackActivity(activity: string) {
    return this.request('/gamification/activity', {
      method: 'POST',
      body: JSON.stringify({ activity }),
    });
  }

  // Search
  async search(query: string, filters?: {
    type?: 'skills' | 'users';
    category?: string;
    level?: string;
  }) {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    return this.request<{
      skills: Skill[];
      users: User[];
    }>(`/search?${params.toString()}`);
  }

  // Payment Methods
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    exchangeId: string;
    description?: string;
  }) {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createSubscription(data: {
    priceId: string;
    paymentMethodId: string;
    trialPeriodDays?: number;
  }) {
    return this.request('/payments/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.request(`/payments/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });
  }

  async updateSubscription(data: {
    subscriptionId: string;
    priceId?: string;
    quantity?: number;
  }) {
    return this.request(`/payments/subscriptions/${data.subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getPaymentMethods() {
    return this.request('/payments/payment-methods');
  }

  async attachPaymentMethod(paymentMethodId: string) {
    return this.request('/payments/payment-methods/attach', {
      method: 'POST',
      body: JSON.stringify({ paymentMethodId }),
    });
  }

  async detachPaymentMethod(paymentMethodId: string) {
    return this.request(`/payments/payment-methods/${paymentMethodId}/detach`, {
      method: 'DELETE',
    });
  }

  async getPaymentHistory() {
    return this.request('/payments/history');
  }

  async createRefund(data: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }) {
    return this.request('/payments/refunds', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Multi-Factor Authentication (MFA)
  async setupMFA() {
    return this.request<{
      secret: string;
      qrCodeUrl: string;
      backupCodes: string[];
    }>('/auth/mfa/setup', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async verifyMFASetup(request: { secret: string; token: string }) {
    return this.request<{ success: boolean; backupCodes: string[] }>('/auth/mfa/verify-setup', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async verifyMFA(request: { token: string; backupCode?: string }) {
    return this.request<{ success: boolean; user: User; tokens: any }>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async disableMFA(token: string) {
    return this.request<{ success: boolean }>('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async generateBackupCodes() {
    return this.request<{ backupCodes: string[] }>('/auth/mfa/backup-codes', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getMFAStatus() {
    return this.request<{ mfaEnabled: boolean; hasBackupCodes: boolean }>('/auth/mfa/status');
  }

  // Password strength validation
  async validatePasswordStrength(password: string) {
    return this.request<{
      isStrong: boolean;
      score: number;
      feedback: string[];
      suggestions: string[];
    }>('/auth/password/validate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // Session management
  async extendSession() {
    return this.request<{ token: string; expiresAt: string }>('/auth/session/extend', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getActiveSessions() {
    return this.request<Array<{
      id: string;
      deviceInfo: string;
      ipAddress: string;
      location?: string;
      lastActivity: string;
      expiresAt: string;
    }>>('/auth/sessions');
  }

  async terminateSession(sessionId: string) {
    return this.request(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async terminateAllSessions() {
    return this.request('/auth/sessions/all', {
      method: 'DELETE',
    });
  }

  // Skill Verification
  async getVerificationStatus(skillId: string) {
    return this.request<{
      skillId: number;
      isVerified: boolean;
      verificationStatus: string;
      latestVerification?: {
        id: number;
        type: string;
        status: string;
        submittedAt: string;
        reviewedAt?: string;
        reviewerNotes?: string;
        score?: number;
      };
    }>(`/skill-verification/status/${skillId}`);
  }

  async submitVerification(skillId: string, data: {
    type: string;
    evidence?: any;
    notes?: string;
  }) {
    return this.request(`/skill-verification/submit/${skillId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getVerificationHistory(skillId: string) {
    return this.request(`/skill-verification/history/${skillId}`);
  }

  async getUserVerificationStats() {
    return this.request<{
      totalSkills: number;
      verifiedSkills: number;
      verificationRate: number;
      statusBreakdown: Record<string, number>;
    }>(`/skill-verification/stats`);
  }

  async verifyPortfolio(skillId: string, data: {
    portfolioUrl: string;
    description: string;
    screenshots?: string[];
    testimonials?: string[];
  }) {
    return this.request(`/skill-verification/portfolio/${skillId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async scheduleDemonstration(skillId: string, data: {
    preferredDateTime: string;
    timezone?: string;
    type: string;
    requirements?: any;
  }) {
    return this.request(`/skill-verification/demonstration/${skillId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async conductAssessment(skillId: string, data: {
    questions?: number;
    timeLimit?: number;
    difficulty?: string;
  }) {
    return this.request(`/skill-verification/assessment/${skillId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkRenewal(skillId: string) {
    return this.request<{ needsRenewal: boolean }>(`/skill-verification/renewal/${skillId}`);
  }

  // Admin Skill Verification (Admin only)
  async getVerificationQueue(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const query = queryParams.toString();
    return this.request(`/skill-verification/admin/queue${query ? `?${query}` : ''}`);
  }

  async processVerification(verificationId: string, data: {
    approved: boolean;
    notes?: string;
    score?: number;
    evidenceVerified?: any;
  }) {
    return this.request(`/skill-verification/admin/process/${verificationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async autoExpireVerifications() {
    return this.request(`/skill-verification/admin/auto-expire`, {
      method: 'POST',
    });
  }

  // Enhanced skill endpoints with verification
  async getSkillWithVerification(id: string) {
    return this.request(`/skills/with-verification/${id}`);
  }
}

export const apiClient = new ApiClient();