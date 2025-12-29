import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserTimezone, getTimezones, TimeSlot, AvailabilitySchedule } from './timezoneUtils';

interface TimezoneContextType {
  userTimezone: string;
  setUserTimezone: (timezone: string) => void;
  timezones: Array<{ value: string; label: string }>;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};

interface TimezoneProviderProps {
  children: React.ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  const [userTimezone, setUserTimezoneState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const timezones = getTimezones();

  useEffect(() => {
    // Initialize user timezone on mount
    const initialTimezone = getUserTimezone();
    setUserTimezoneState(initialTimezone);
    setIsLoading(false);
  }, []);

  const setUserTimezone = (timezone: string) => {
    setUserTimezoneState(timezone);
    // Save to localStorage for persistence
    localStorage.setItem('userTimezone', timezone);
  };

  const value: TimezoneContextType = {
    userTimezone,
    setUserTimezone,
    timezones,
    isLoading,
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
};

// Mock availability data service
export class AvailabilityService {
  static async getAvailabilitySchedule(userId: string): Promise<AvailabilitySchedule> {
    // Mock implementation - in real app, this would make an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          '1': [ // Monday
            {
              id: '1',
              day: 1,
              startTime: '09:00',
              endTime: '12:00',
              timezone: 'UTC',
            },
            {
              id: '2',
              day: 1,
              startTime: '14:00',
              endTime: '17:00',
              timezone: 'UTC',
            },
          ],
          '2': [ // Tuesday
            {
              id: '3',
              day: 2,
              startTime: '10:00',
              endTime: '16:00',
              timezone: 'UTC',
            },
          ],
          '3': [ // Wednesday
            {
              id: '4',
              day: 3,
              startTime: '08:00',
              endTime: '11:00',
              timezone: 'UTC',
            },
          ],
          '4': [ // Thursday
            {
              id: '5',
              day: 4,
              startTime: '15:00',
              endTime: '18:00',
              timezone: 'UTC',
            },
          ],
          '5': [ // Friday
            {
              id: '6',
              day: 5,
              startTime: '09:00',
              endTime: '15:00',
              timezone: 'UTC',
            },
          ],
        });
      }, 500);
    });
  }

  static async saveAvailabilitySchedule(userId: string, schedule: AvailabilitySchedule): Promise<void> {
    // Mock implementation - in real app, this would make an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Saved availability schedule:', schedule);
        resolve();
      }, 500);
    });
  }
}