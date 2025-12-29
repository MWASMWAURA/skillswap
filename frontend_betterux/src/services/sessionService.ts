import { apiClient } from '../lib/api';

export interface SessionInfo {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  location?: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
}

export interface SessionWarning {
  type: 'timeout_warning' | 'session_expiring' | 'multiple_sessions';
  message: string;
  timeRemaining?: number;
  sessions?: SessionInfo[];
}

class SessionService {
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private warningTimeout: number = 5 * 60 * 1000; // 5 minutes before expiry
  private activityTimers: NodeJS.Timeout[] = [];
  private warningTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isActive: boolean = true;

  constructor() {
    this.setupActivityListeners();
    this.startSessionMonitoring();
  }

  // Setup activity listeners to track user activity
  private setupActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, true);
    });
  }

  // Update last activity timestamp
  private updateLastActivity(): void {
    if (!this.isActive) return;
    
    this.lastActivity = Date.now();
    
    // Clear existing timers
    this.clearTimers();
    
    // Schedule new warnings and logout
    this.scheduleWarnings();
  }

  // Start session monitoring
  startSessionMonitoring(): void {
    this.isActive = true;
    this.lastActivity = Date.now();
    this.scheduleWarnings();
  }

  // Stop session monitoring (e.g., when user logs out)
  stopSessionMonitoring(): void {
    this.isActive = false;
    this.clearTimers();
  }

  // Schedule warning and logout timers
  private scheduleWarnings(): void {
    const now = Date.now();
    const timeElapsed = now - this.lastActivity;
    const timeRemaining = this.sessionTimeout - timeElapsed;

    if (timeRemaining <= 0) {
      // Session should already be expired
      this.handleSessionExpired();
      return;
    }

    // Schedule warning (5 minutes before expiry)
    const warningTime = Math.max(0, timeRemaining - this.warningTimeout);
    this.warningTimer = setTimeout(() => {
      this.handleSessionWarning();
    }, warningTime);

    // Schedule logout
    const logoutTimer = setTimeout(() => {
      this.handleSessionExpired();
    }, timeRemaining);

    this.activityTimers.push(this.warningTimer, logoutTimer);
  }

  // Handle session warning
  private handleSessionWarning(): void {
    if (!this.isActive) return;

    const timeRemaining = this.sessionTimeout - (Date.now() - this.lastActivity);
    
    const warning: SessionWarning = {
      type: 'session_expiring',
      message: 'Your session will expire in 5 minutes due to inactivity.',
      timeRemaining: Math.max(0, timeRemaining),
    };

    this.notifySessionWarning(warning);
  }

  // Handle session expiration
  private handleSessionExpired(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.clearTimers();

    // Clear auth tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    
    // Redirect to login or show session expired message
    window.dispatchEvent(new CustomEvent('sessionExpired'));
    
    const warning: SessionWarning = {
      type: 'timeout_warning',
      message: 'Your session has expired due to inactivity. Please log in again.',
    };

    this.notifySessionWarning(warning);
  }

  // Clear all timers
  private clearTimers(): void {
    this.activityTimers.forEach(timer => clearTimeout(timer));
    this.activityTimers = [];
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  // Notify about session warning
  private notifySessionWarning(warning: SessionWarning): void {
    window.dispatchEvent(new CustomEvent('sessionWarning', { detail: warning }));
  }

  // Extend session (called when user extends session)
  async extendSession(): Promise<boolean> {
    try {
      const response = await apiClient.extendSession();
      if (response.error) {
        return false;
      }

      const { token, expiresAt } = response.data!;
      
      // Update stored token
      localStorage.setItem('authToken', token);
      
      // Update last activity and restart monitoring
      this.lastActivity = Date.now();
      this.startSessionMonitoring();
      
      return true;
    } catch (error) {
      console.error('Failed to extend session:', error);
      return false;
    }
  }

  // Get active sessions
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const response = await apiClient.getActiveSessions();
      if (response.error) {
        return [];
      }
      
      // Add isActive property to each session (assuming they're all active)
      const sessions = response.data!;
      return sessions.map(session => ({
        ...session,
        isActive: true
      }));
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  // Terminate specific session
  async terminateSession(sessionId: string): Promise<boolean> {
    try {
      const response = await apiClient.terminateSession(sessionId);
      return !response.error;
    } catch (error) {
      console.error('Failed to terminate session:', error);
      return false;
    }
  }

  // Terminate all other sessions
  async terminateAllOtherSessions(): Promise<boolean> {
    try {
      const response = await apiClient.terminateAllSessions();
      return !response.error;
    } catch (error) {
      console.error('Failed to terminate all sessions:', error);
      return false;
    }
  }

  // Check for multiple sessions
  async checkMultipleSessions(): Promise<SessionWarning | null> {
    try {
      const sessions = await this.getActiveSessions();
      
      if (sessions.length > 1) {
        return {
          type: 'multiple_sessions',
          message: `You have ${sessions.length} active sessions. This may indicate your account is being used elsewhere.`,
          sessions,
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Get time until session expires
  getTimeUntilExpiry(): number {
    if (!this.isActive) return 0;
    
    const timeElapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.sessionTimeout - timeElapsed);
  }

  // Get session status
  getSessionStatus(): {
    isActive: boolean;
    timeUntilExpiry: number;
    lastActivity: number;
  } {
    return {
      isActive: this.isActive,
      timeUntilExpiry: this.getTimeUntilExpiry(),
      lastActivity: this.lastActivity,
    };
  }

  // Set custom timeout (for admin users, etc.)
  setCustomTimeout(minutes: number): void {
    this.sessionTimeout = minutes * 60 * 1000;
    if (this.isActive) {
      this.clearTimers();
      this.scheduleWarnings();
    }
  }

  // Format time remaining for display
  formatTimeRemaining(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds} seconds`;
  }
}

export const sessionService = new SessionService();