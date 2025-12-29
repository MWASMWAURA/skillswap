// Timezone utilities for handling time conversions and scheduling

export interface TimeSlot {
  id: string;
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
}

export interface AvailabilitySchedule {
  [key: string]: TimeSlot[]; // day -> time slots
}

export interface ScheduledSession {
  id: string;
  title: string;
  teacher: {
    name: string;
    avatar?: string;
    timezone?: string;
  };
  date: string; // ISO date string
  time: string; // HH:MM format
  duration: number; // in minutes
  isOnline: boolean;
  timezone: string;
  color?: string;
}

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'Africa/Nairobi', label: 'East Africa Time (EAT)' },
];

// Get the user's current timezone
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

// Get all available timezones
export const getTimezones = () => COMMON_TIMEZONES;

// Convert time from one timezone to another
export const convertTimezone = (
  time: string, // HH:MM format
  fromTimezone: string,
  toTimezone: string,
  date: string // ISO date string
): string => {
  try {
    // Create a Date object in the from timezone
    const [hours, minutes] = time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    
    // Create UTC date first
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    
    // Format for timezone conversion
    const options: Intl.DateTimeFormatOptions = {
      timeZone: toTimezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: undefined,
    };
    
    // Convert to target timezone and extract time
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(utcDate);
    
    const hourPart = parts.find(part => part.type === 'hour');
    const minutePart = parts.find(part => part.type === 'minute');
    
    const convertedHour = hourPart?.value || '00';
    const convertedMinute = minutePart?.value || '00';
    
    return `${convertedHour}:${convertedMinute}`;
  } catch (error) {
    console.error('Error converting timezone:', error);
    return time; // Return original time if conversion fails
  }
};

// Get user's current time in their timezone
export const getCurrentTimeInTimezone = (timezone: string): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: undefined,
  };
  
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(now);
  
  const hourPart = parts.find(part => part.type === 'hour');
  const minutePart = parts.find(part => part.type === 'minute');
  
  const hour = hourPart?.value || '00';
  const minute = minutePart?.value || '00';
  
  return `${hour}:${minute}`;
};

// Check if a time slot conflicts with existing sessions
export const hasTimeConflict = (
  newSlot: TimeSlot,
  existingSessions: ScheduledSession[],
  userTimezone: string
): boolean => {
  return existingSessions.some(session => {
    // Convert session time to user's timezone for comparison
    const sessionTime = convertTimezone(
      session.time,
      session.timezone,
      userTimezone,
      session.date
    );
    
    const [newStartHour, newStartMin] = newSlot.startTime.split(':').map(Number);
    const [newEndHour, newEndMin] = newSlot.endTime.split(':').map(Number);
    const [sessionHour, sessionMin] = sessionTime.split(':').map(Number);
    
    const newStart = newStartHour * 60 + newStartMin;
    const newEnd = newEndHour * 60 + newEndMin;
    const sessionStart = sessionHour * 60 + sessionMin;
    const sessionEnd = sessionStart + session.duration;
    
    // Check if times overlap
    return (newStart < sessionEnd && newEnd > sessionStart);
  });
};

// Get available time slots for a specific day
export const getAvailableTimeSlots = (
  day: number,
  schedule: AvailabilitySchedule,
  userTimezone: string
): TimeSlot[] => {
  return schedule[day] || [];
};

// Format time for display in user's timezone
export const formatTimeForDisplay = (
  time: string,
  fromTimezone: string,
  toTimezone: string,
  date: string
): string => {
  const convertedTime = convertTimezone(time, fromTimezone, toTimezone, date);
  const [hours, minutes] = convertedTime.split(':').map(Number);
  
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Get the next available slots for booking
export const getNextAvailableSlots = (
  schedule: AvailabilitySchedule,
  userTimezone: string,
  daysAhead: number = 7
): Array<{
  date: string;
  dayName: string;
  slots: TimeSlot[];
}> => {
  const availableSlots: Array<{
    date: string;
    dayName: string;
    slots: TimeSlot[];
  }> = [];
  
  const today = new Date();
  
  for (let i = 0; i < daysAhead; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    const slots = getAvailableTimeSlots(dayOfWeek, schedule, userTimezone);
    
    if (slots.length > 0) {
      availableSlots.push({
        date: dateString,
        dayName,
        slots: slots.map(slot => ({
          ...slot,
          timezone: userTimezone // Convert to user's timezone for display
        }))
      });
    }
  }
  
  return availableSlots;
};

// Validate time slot duration
export const isValidTimeSlot = (
  startTime: string,
  endTime: string,
  minDuration: number = 30,
  maxDuration: number = 180
): boolean => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  const duration = endMinutes - startMinutes;
  
  return duration >= minDuration && duration <= maxDuration && endMinutes > startMinutes;
};

// Generate time options for dropdowns
export const generateTimeOptions = (interval: number = 30): string[] => {
  const options: string[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(timeString);
    }
  }
  
  return options;
};