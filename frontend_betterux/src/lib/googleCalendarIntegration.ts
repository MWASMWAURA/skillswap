// Google Calendar integration utilities

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
}

export interface CalendarIntegration {
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  getEvents: (startDate: Date, endDate: Date) => Promise<GoogleCalendarEvent[]>;
  createEvent: (event: Omit<GoogleCalendarEvent, 'id'>) => Promise<GoogleCalendarEvent>;
  updateEvent: (eventId: string, event: Partial<GoogleCalendarEvent>) => Promise<GoogleCalendarEvent>;
  deleteEvent: (eventId: string) => Promise<void>;
  checkConnectionStatus: () => boolean;
}

declare global {
  interface Window {
    gapi: any;
  }
}

class MockCalendarService implements CalendarIntegration {
  private _isConnected = false;
  private events: GoogleCalendarEvent[] = [];

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<boolean> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    this._isConnected = true;
    localStorage.setItem('googleCalendarConnected', 'true');
    return true;
  }

  disconnect(): void {
    this._isConnected = false;
    localStorage.removeItem('googleCalendarConnected');
  }

  async getEvents(startDate: Date, endDate: Date): Promise<GoogleCalendarEvent[]> {
    if (!this._isConnected) {
      throw new Error('Google Calendar not connected');
    }

    // Mock some events
    return this.events.filter(event => {
      const eventStart = new Date(event.start.dateTime);
      return eventStart >= startDate && eventStart <= endDate;
    });
  }

  async createEvent(event: Omit<GoogleCalendarEvent, 'id'>): Promise<GoogleCalendarEvent> {
    if (!this._isConnected) {
      throw new Error('Google Calendar not connected');
    }

    const newEvent: GoogleCalendarEvent = {
      ...event,
      id: Date.now().toString(),
    };

    this.events.push(newEvent);
    return newEvent;
  }

  async updateEvent(eventId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    if (!this._isConnected) {
      throw new Error('Google Calendar not connected');
    }

    const eventIndex = this.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      throw new Error('Event not found');
    }

    this.events[eventIndex] = { ...this.events[eventIndex], ...event };
    return this.events[eventIndex];
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this._isConnected) {
      throw new Error('Google Calendar not connected');
    }

    this.events = this.events.filter(e => e.id !== eventId);
  }

  checkConnectionStatus(): boolean {
    return localStorage.getItem('googleCalendarConnected') === 'true';
  }
}

// Export singleton instance
export const googleCalendarService = new MockCalendarService();

// Utility functions for calendar integration
export const createSkillExchangeEvent = (
  title: string,
  startTime: Date,
  endTime: Date,
  description: string,
  timezone: string,
  location?: string
): Omit<GoogleCalendarEvent, 'id'> => ({
  summary: title,
  description,
  start: {
    dateTime: startTime.toISOString(),
    timeZone: timezone,
  },
  end: {
    dateTime: endTime.toISOString(),
    timeZone: timezone,
  },
  location,
});

export const formatDateForCalendar = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatTimeForCalendar = (date: Date): string => {
  return date.toISOString();
};