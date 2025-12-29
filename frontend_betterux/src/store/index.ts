import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Skill, Exchange, Message } from '../lib/api';

// Auth Store
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },
      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// UI Store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: false,
      theme: 'light',
      notifications: [],
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      addNotification: (notification) => {
        const id = Math.random().toString(36).substring(2);
        const newNotification = { 
          ...notification, 
          id, 
          timestamp: new Date(),
          duration: notification.duration || 5000
        };
        set({ notifications: [...get().notifications, newNotification] });
        
        // Auto remove notification after duration
        if (newNotification.duration) {
          setTimeout(() => {
            set({ notifications: get().notifications.filter(n => n.id !== id) });
          }, newNotification.duration);
        }
      },
      removeNotification: (id) => {
        set({ notifications: get().notifications.filter(n => n.id !== id) });
      },
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ 
        theme: state.theme,
        sidebarOpen: state.sidebarOpen 
      }),
    }
  )
);

// Chat Store
interface ChatState {
  currentConversation: string | null;
  messages: { [conversationId: string]: Message[] };
  unreadCount: { [conversationId: string]: number };
  onlineUsers: string[];
  setCurrentConversation: (conversationId: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  markAsRead: (conversationId: string) => void;
  setOnlineUsers: (users: string[]) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversation: null,
  messages: {},
  unreadCount: {},
  onlineUsers: [],
  setCurrentConversation: (conversationId) => set({ currentConversation: conversationId }),
  addMessage: (conversationId, message) => {
    const currentMessages = get().messages[conversationId] || [];
    set({
      messages: {
        ...get().messages,
        [conversationId]: [...currentMessages, message],
      },
    });
  },
  setMessages: (conversationId, messages) => {
    set({
      messages: {
        ...get().messages,
        [conversationId]: messages,
      },
    });
  },
  markAsRead: (conversationId) => {
    set({
      unreadCount: {
        ...get().unreadCount,
        [conversationId]: 0,
      },
    });
  },
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  updateMessage: (conversationId, messageId, updates) => {
    const currentMessages = get().messages[conversationId] || [];
    const updatedMessages = currentMessages.map(msg =>
      msg.id.toString() === messageId.toString() ? { ...msg, ...updates } : msg
    );
    set({
      messages: {
        ...get().messages,
        [conversationId]: updatedMessages,
      },
    });
  },
}));

// Skills Store
interface SkillsState {
  skills: Skill[];
  selectedSkill: Skill | null;
  filters: {
    category?: string;
    level?: string;
    mode?: string;
    search?: string;
  };
  loading: boolean;
  setSkills: (skills: Skill[]) => void;
  setSelectedSkill: (skill: Skill | null) => void;
  setFilters: (filters: Partial<SkillsState['filters']>) => void;
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  selectedSkill: null,
  filters: {},
  loading: false,
  setSkills: (skills) => set({ skills }),
  setSelectedSkill: (skill) => set({ selectedSkill: skill }),
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
  addSkill: (skill) => set({ skills: [...get().skills, skill] }),
  updateSkill: (id, updates) => {
    const updatedSkills = get().skills.map(skill =>
      skill.id.toString() === id ? { ...skill, ...updates } : skill
    );
    set({ skills: updatedSkills });
  },
  removeSkill: (id) => {
    set({ skills: get().skills.filter(skill => skill.id.toString() !== id) });
  },
  setLoading: (loading) => set({ loading }),
}));

// Gamification Store
interface GamificationState {
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
  streak: number;
  lastActivityDate: string | null;
  setLevel: (level: number) => void;
  setXP: (currentXP: number, nextLevelXP: number) => void;
  addBadge: (badge: GamificationState['badges'][0]) => void;
  updateAchievement: (id: string, progress: number, completed?: boolean) => void;
  setStreak: (streak: number, lastActivityDate: string) => void;
  resetProgress: () => void;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  level: 1,
  currentXP: 0,
  nextLevelXP: 1000,
  badges: [],
  achievements: [],
  streak: 0,
  lastActivityDate: null,
  setLevel: (level) => set({ level }),
  setXP: (currentXP, nextLevelXP) => set({ currentXP, nextLevelXP }),
  addBadge: (badge) => set({ badges: [...get().badges, badge] }),
  updateAchievement: (id, progress, completed = false) => {
    const updatedAchievements = get().achievements.map(achievement =>
      achievement.id === id ? { ...achievement, progress, completed } : achievement
    );
    set({ achievements: updatedAchievements });
  },
  setStreak: (streak, lastActivityDate) => set({ streak, lastActivityDate }),
  resetProgress: () => set({
    level: 1,
    currentXP: 0,
    nextLevelXP: 1000,
    badges: [],
    achievements: [],
    streak: 0,
    lastActivityDate: null,
  }),
}));

// Notifications Store
interface NotificationState {
  notifications: Array<{
    id: string;
    type: 'message' | 'exchange' | 'system' | 'reminder';
    title: string;
    message: string;
    data?: any;
    read: boolean;
    createdAt: string;
  }>;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  setNotificationPreferences: (prefs: { pushEnabled?: boolean; emailEnabled?: boolean; smsEnabled?: boolean }) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  addNotification: (notification) => {
    const newNotification = {
      ...notification,
      id: Math.random().toString(36).substring(2),
      read: false,
      createdAt: new Date().toISOString(),
    };
    set({ notifications: [newNotification, ...get().notifications] });
  },
  markAsRead: (id) => {
    const updatedNotifications = get().notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    );
    set({ notifications: updatedNotifications });
  },
  markAllAsRead: () => {
    const updatedNotifications = get().notifications.map(notif => ({ ...notif, read: true }));
    set({ notifications: updatedNotifications });
  },
  removeNotification: (id) => {
    set({ notifications: get().notifications.filter(notif => notif.id !== id) });
  },
  setNotificationPreferences: (prefs) => set({
    pushEnabled: prefs.pushEnabled ?? get().pushEnabled,
    emailEnabled: prefs.emailEnabled ?? get().emailEnabled,
    smsEnabled: prefs.smsEnabled ?? get().smsEnabled,
  }),
}));