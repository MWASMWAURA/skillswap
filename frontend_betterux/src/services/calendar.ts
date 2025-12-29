import React from 'react';
import { format, parseISO, addDays, startOfWeek, endOfWeek, isToday, isSameDay } from 'date-fns';
import { useNotificationStore, useAuthStore } from '../store';
import { apiClient } from '../lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: 'exchange' | 'session' | 'reminder' | 'meeting';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  participants: Array<{
    id: string;
    name: string;
    email: string;
    role: 'learner' | 'teacher' | 'organizer';
  }>;
  exchangeId?: string;
  reminder?: {
    enabled: boolean;
    minutes: number;
  };
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  booked: boolean;
}

interface Availability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  slots: TimeSlot[];
}

class CalendarService {
  private calendarId?: string;
  private isConnected = false;

  // Connect to device calendar (Calendar API or similar)
  async connectCalendar(): Promise<boolean> {
    try {
      // Request calendar permissions
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'calendar' as PermissionName });
        if (permission.state === 'denied') {
          throw new Error('Calendar permission denied');
        }
      }

      // For web calendars (Google Calendar, Outlook, etc.)
      // This would typically involve OAuth flow
      this.isConnected = true;
      
      return true;
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      return false;
    }
  }

  // Sync events with external calendar
  async syncEvents(): Promise<CalendarEvent[]> {
    try {
      const response = await apiClient.getCalendarEvents();
      if (response.error) {
        throw new Error(response.error);
      }

      // Sync with external calendar if connected
      if (this.isConnected) {
        await this.syncWithExternalCalendar(response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to sync calendar events:', error);
      throw error;
    }
  }

  // Create new event
  async createEvent(eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    try {
      const response = await apiClient.createCalendarEvent(eventData);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Add to external calendar if connected
      if (this.isConnected) {
        await this.addToExternalCalendar(response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  // Update existing event
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const response = await apiClient.updateCalendarEvent(eventId, updates);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Update in external calendar if connected
      if (this.isConnected) {
        await this.updateExternalCalendar(response.data);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      throw error;
    }
  }

  // Delete event
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const response = await apiClient.deleteCalendarEvent(eventId);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Remove from external calendar if connected
      if (this.isConnected) {
        await this.removeFromExternalCalendar(eventId);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      throw error;
    }
  }

  // Get events for date range
  async getEventsInRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    try {
      const response = await apiClient.getCalendarEventsInRange(startDate, endDate);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to get events in range:', error);
      throw error;
    }
  }

  // Check availability for time slots
  async checkAvailability(
    date: string,
    duration: number,
    participantIds: string[]
  ): Promise<TimeSlot[]> {
    try {
      const response = await apiClient.checkAvailability({
        date,
        duration,
        participantIds,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to check availability:', error);
      throw error;
    }
  }

  // Book time slot
  async bookTimeSlot(
    timeSlot: TimeSlot,
    eventData: Omit<CalendarEvent, 'id' | 'startDate' | 'endDate'>
  ): Promise<CalendarEvent> {
    try {
      const eventDataWithTimes = {
        ...eventData,
        startDate: timeSlot.start,
        endDate: timeSlot.end,
      };

      return await this.createEvent(eventDataWithTimes);
    } catch (error) {
      console.error('Failed to book time slot:', error);
      throw error;
    }
  }

  // Set availability for teaching
  async setTeachingAvailability(availability: Availability[]): Promise<boolean> {
    try {
      const response = await apiClient.setTeachingAvailability(availability);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return true;
    } catch (error) {
      console.error('Failed to set teaching availability:', error);
      throw error;
    }
  }

  // Get teaching availability
  async getTeachingAvailability(): Promise<Availability[]> {
    try {
      const response = await apiClient.getTeachingAvailability();
      
      if (response.error) {
        throw new Error(response.error);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to get teaching availability:', error);
      throw error;
    }
  }

  // Send calendar invites
  async sendCalendarInvite(eventId: string, participantEmails: string[]): Promise<boolean> {
    try {
      const response = await apiClient.sendCalendarInvite(eventId, participantEmails);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return true;
    } catch (error) {
      console.error('Failed to send calendar invite:', error);
      throw error;
    }
  }

  // Private methods for external calendar integration
  private async syncWithExternalCalendar(events: CalendarEvent[]): Promise<void> {
    // Implementation would depend on the external calendar API
    // This is a placeholder for the actual integration
    console.log('Syncing with external calendar:', events.length, 'events');
  }

  private async addToExternalCalendar(event: CalendarEvent): Promise<void> {
    // Add event to Google Calendar, Outlook, etc.
    console.log('Adding event to external calendar:', event.title);
  }

  private async updateExternalCalendar(event: CalendarEvent): Promise<void> {
    // Update event in external calendar
    console.log('Updating event in external calendar:', event.title);
  }

  private async removeFromExternalCalendar(eventId: string): Promise<void> {
    // Remove event from external calendar
    console.log('Removing event from external calendar:', eventId);
  }

  // Utility methods
  formatEventTime(event: CalendarEvent): string {
    const start = format(parseISO(event.startDate), 'h:mm a');
    const end = format(parseISO(event.endDate), 'h:mm a');
    return `${start} - ${end}`;
  }

  getEventDuration(event: CalendarEvent): number {
    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
  }

  isEventToday(event: CalendarEvent): boolean {
    return isToday(parseISO(event.startDate));
  }

  isEventUpcoming(event: CalendarEvent, hoursAhead: number = 24): boolean {
    const eventStart = parseISO(event.startDate);
    const now = new Date();
    const threshold = addDays(now, 0); // today
    
    return eventStart > threshold && 
           eventStart <= addDays(now, hoursAhead / 24);
  }

  generateTimeSlots(
    startHour: number = 8,
    endHour: number = 20,
    slotDuration: number = 60
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const today = new Date();
    
    for (let hour = startHour; hour < endHour; hour += slotDuration / 60) {
      const start = new Date(today);
      start.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
      
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + slotDuration);
      
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        available: true,
        booked: false,
      });
    }
    
    return slots;
  }
}

export const calendarService = new CalendarService();

// React hook for calendar functionality
export function useCalendar() {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [availability, setAvailability] = React.useState<Availability[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  // Load events
  const loadEvents = React.useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      let eventsData: CalendarEvent[];
      
      if (startDate && endDate) {
        eventsData = await calendarService.getEventsInRange(startDate, endDate);
      } else {
        const weekStart = startOfWeek(selectedDate);
        const weekEnd = endOfWeek(selectedDate);
        eventsData = await calendarService.getEventsInRange(
          weekStart.toISOString(),
          weekEnd.toISOString()
        );
      }
      
      setEvents(eventsData);
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Calendar Error',
        message: 'Failed to load calendar events',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, addNotification]);

  // Create event
  const createEvent = React.useCallback(async (eventData: Omit<CalendarEvent, 'id'>) => {
    try {
      setLoading(true);
      const newEvent = await calendarService.createEvent(eventData);
      setEvents(prev => [...prev, newEvent]);
      
      addNotification({
        type: 'system',
        title: 'Event Created',
        message: 'Calendar event has been created successfully',
      });
      
      return newEvent;
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Event Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create event',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Update event
  const updateEvent = React.useCallback(async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      setLoading(true);
      const updatedEvent = await calendarService.updateEvent(eventId, updates);
      setEvents(prev => prev.map(event => 
        event.id === eventId ? updatedEvent : event
      ));
      
      addNotification({
        type: 'system',
        title: 'Event Updated',
        message: 'Calendar event has been updated successfully',
      });
      
      return updatedEvent;
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Event Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update event',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Delete event
  const deleteEvent = React.useCallback(async (eventId: string) => {
    try {
      setLoading(true);
      await calendarService.deleteEvent(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
      
      addNotification({
        type: 'system',
        title: 'Event Deleted',
        message: 'Calendar event has been deleted',
      });
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Event Deletion Failed',
        message: error instanceof Error ? error.message : 'Failed to delete event',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Check availability
  const checkAvailability = React.useCallback(async (
    date: string,
    duration: number,
    participantIds: string[]
  ) => {
    try {
      return await calendarService.checkAvailability(date, duration, participantIds);
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Availability Check Failed',
        message: error instanceof Error ? error.message : 'Failed to check availability',
      });
      throw error;
    }
  }, [addNotification]);

  // Set teaching availability
  const setTeachingAvailability = React.useCallback(async (availability: Availability[]) => {
    try {
      setLoading(true);
      await calendarService.setTeachingAvailability(availability);
      setAvailability(availability);
      
      addNotification({
        type: 'system',
        title: 'Availability Updated',
        message: 'Your teaching availability has been updated',
      });
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Availability Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update availability',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  // Get events for selected date
  const getEventsForDate = React.useCallback((date: Date): CalendarEvent[] => {
    return events.filter(event => isSameDay(parseISO(event.startDate), date));
  }, [events]);

  // Get today's events
  const getTodayEvents = React.useCallback((): CalendarEvent[] => {
    return events.filter(event => calendarService.isEventToday(event));
  }, [events]);

  // Get upcoming events
  const getUpcomingEvents = React.useCallback((hoursAhead: number = 24): CalendarEvent[] => {
    return events.filter(event => calendarService.isEventUpcoming(event, hoursAhead));
  }, [events]);

  // Load data on mount and date change
  React.useEffect(() => {
    if (user) {
      loadEvents();
      calendarService.getTeachingAvailability().then(setAvailability).catch(console.error);
    }
  }, [user, loadEvents]);

  // Reload events when selected date changes significantly
  React.useEffect(() => {
    if (user) {
      const weekStart = startOfWeek(selectedDate);
      const weekEnd = endOfWeek(selectedDate);
      loadEvents(weekStart.toISOString(), weekEnd.toISOString());
    }
  }, [selectedDate, loadEvents, user]);

  return {
    events,
    availability,
    loading,
    selectedDate,
    setSelectedDate,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    checkAvailability,
    setTeachingAvailability,
    getEventsForDate,
    getTodayEvents,
    getUpcomingEvents,
    connectCalendar: calendarService.connectCalendar.bind(calendarService),
    syncEvents: calendarService.syncEvents.bind(calendarService),
    formatEventTime: calendarService.formatEventTime.bind(calendarService),
    getEventDuration: calendarService.getEventDuration.bind(calendarService),
    isEventToday: calendarService.isEventToday.bind(calendarService),
    generateTimeSlots: calendarService.generateTimeSlots.bind(calendarService),
  };
}