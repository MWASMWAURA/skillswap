import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, VideoIcon, MapPinIcon, ClockIcon, CalendarDaysIcon, UserIcon, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { AvailabilityScheduler } from '../components/schedule/AvailabilityScheduler';
import { DateSpecificScheduler } from '../components/schedule/DateSpecificScheduler';
import { useTimezone, AvailabilityService } from '../lib/timezoneContext';
import { convertTimezone, formatTimeForDisplay, getAvailableTimeSlots, ScheduledSession, TimeSlot, AvailabilitySchedule } from '../lib/timezoneUtils';
import { googleCalendarService } from '../lib/googleCalendarIntegration';

// Mock session data with timezone information
const mockSessions: ScheduledSession[] = [
  {
    id: '1',
    title: 'JavaScript Session',
    teacher: {
      name: 'Jane Smith',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      timezone: 'America/New_York'
    },
    date: '2025-12-08',
    time: '15:00', // 3:00 PM EST
    duration: 90,
    isOnline: true,
    timezone: 'America/New_York',
    color: 'blue'
  },
  {
    id: '2',
    title: 'Guitar Practice',
    teacher: {
      name: 'Mike Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      timezone: 'America/Los_Angeles'
    },
    date: '2025-12-09',
    time: '19:00', // 7:00 PM PST
    duration: 60,
    isOnline: false,
    timezone: 'America/Los_Angeles',
    color: 'amber'
  },
  {
    id: '3',
    title: 'Photography Workshop',
    teacher: {
      name: 'Sarah Lee',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      timezone: 'Europe/London'
    },
    date: '2025-12-10',
    time: '14:00', // 2:00 PM GMT
    duration: 120,
    isOnline: true,
    timezone: 'Europe/London',
    color: 'purple'
  },
  {
    id: '4',
    title: 'Python Basics',
    teacher: {
      name: 'Alex Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      timezone: 'Asia/Tokyo'
    },
    date: '2025-12-11',
    time: '11:00', // 11:00 AM JST
    duration: 90,
    isOnline: true,
    timezone: 'Asia/Tokyo',
    color: 'green'
  }
];

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const { userTimezone } = useTimezone();
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // December 2025
  const [availabilitySchedule, setAvailabilitySchedule] = useState<AvailabilitySchedule>({});
  const [sessions, setSessions] = useState<ScheduledSession[]>(mockSessions);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'availability'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDateScheduler, setShowDateScheduler] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  useEffect(() => {
    loadAvailabilityData();
    checkGoogleCalendarConnection();
  }, []);

  const checkGoogleCalendarConnection = () => {
    const isConnected = googleCalendarService.checkConnectionStatus();
    setGoogleCalendarConnected(isConnected);
  };

  const loadAvailabilityData = async () => {
    setIsLoading(true);
    try {
      const userId = 'current-user-id';
      const schedule = await AvailabilityService.getAvailabilitySchedule(userId);
      setAvailabilitySchedule(schedule);
    } catch (error) {
      console.error('Failed to load availability schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAvailability = async (schedule: AvailabilitySchedule) => {
    try {
      const userId = 'current-user-id';
      await AvailabilityService.saveAvailabilitySchedule(userId, schedule);
      setAvailabilitySchedule(schedule);
      console.log('Availability schedule saved successfully');
    } catch (error) {
      console.error('Failed to save availability schedule:', error);
      throw error;
    }
  };

  const handleGoogleCalendarConnect = async () => {
    try {
      const connected = await googleCalendarService.connect();
      setGoogleCalendarConnected(connected);
      if (connected) {
        alert('Successfully connected to Google Calendar!');
      } else {
        alert('Failed to connect to Google Calendar. Please try again.');
      }
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      alert('Failed to connect to Google Calendar. Please try again.');
    }
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    setShowDateScheduler(true);
  };

  const handleSaveDateSchedule = async (slots: TimeSlot[]) => {
    try {
      // Update the availability schedule for the selected date's day of week
      const dayOfWeek = selectedDate!.getDay();
      const updatedSchedule = {
        ...availabilitySchedule,
        [dayOfWeek]: slots
      };
      
      await handleSaveAvailability(updatedSchedule);
      setShowDateScheduler(false);
      setSelectedDate(null);
    } catch (error) {
      console.error('Failed to save date-specific schedule:', error);
      throw error;
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      firstDay,
      daysInMonth
    };
  };

  const {
    firstDay,
    daysInMonth
  } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });

  const getSessionForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return sessions.find(s => s.date === dateStr);
  };

  const getAvailabilitySlotsForDay = (day: number): TimeSlot[] => {
    return getAvailableTimeSlots(day, availabilitySchedule, userTimezone);
  };

  const upcomingSessions = sessions
    .filter(session => new Date(session.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600">Manage your learning schedule and availability</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setActiveTab('calendar')}
              variant={activeTab === 'calendar' ? 'primary' : 'secondary'}
              className="w-full sm:w-auto"
            >
              <CalendarDaysIcon className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            <Button 
              onClick={() => setActiveTab('availability')}
              variant={activeTab === 'availability' ? 'primary' : 'secondary'}
              className="w-full sm:w-auto"
            >
              <ClockIcon className="w-4 h-4 mr-2" />
              Availability
            </Button>
            {!googleCalendarConnected && (
              <Button 
                onClick={handleGoogleCalendarConnect}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {activeTab === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card padding="lg">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {monthName}
                  </h2>
                  <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day Headers */}
                  {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}

                  {/* Empty cells for days before the first of the month */}
                  {[...Array(firstDay)].map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}

                  {/* Day cells */}
                  {[...Array(daysInMonth)].map((_, index) => {
                    const day = index + 1;
                    const session = getSessionForDay(day);
                    const availabilitySlots = getAvailabilitySlotsForDay(day);
                    const isToday = day === new Date().getDate() && 
                      currentDate.getMonth() === new Date().getMonth() && 
                      currentDate.getFullYear() === new Date().getFullYear();
                    
                    return (
                      <div
                        key={day}
                        className={`
                          aspect-square p-1 border border-gray-100 rounded-lg
                          ${isToday ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
                          transition-colors cursor-pointer relative
                        `}
                        onClick={() => handleDateClick(day)}
                      >
                        <div className={`text-xs sm:text-sm ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                          {day}
                        </div>
                        
                        {/* Session indicator */}
                        {session && (
                          <div className={`
                            hidden sm:block mt-1 px-1 py-0.5 text-[10px] rounded truncate
                            ${session.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                            ${session.color === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                            ${session.color === 'purple' ? 'bg-purple-100 text-purple-700' : ''}
                            ${session.color === 'green' ? 'bg-emerald-100 text-emerald-700' : ''}
                          `}>
                            {session.title.split(' ')[0]}
                          </div>
                        )}

                        {/* Availability indicator */}
                        {availabilitySlots.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500" 
                               title={`${availabilitySlots.length} available slots`} />
                        )}

                        {/* Mobile session dot */}
                        {session && (
                          <div className={`
                            sm:hidden absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full
                            ${session.color === 'blue' ? 'bg-blue-500' : ''}
                            ${session.color === 'amber' ? 'bg-amber-500' : ''}
                            ${session.color === 'purple' ? 'bg-purple-500' : ''}
                            ${session.color === 'green' ? 'bg-emerald-500' : ''}
                          `} />
                        )}

                        {/* Click indicator */}
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-0 hover:bg-opacity-5 rounded-lg transition-all" />
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Legend:</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="text-sm text-gray-600">JavaScript</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-amber-500 rounded-full" />
                      <span className="text-sm text-gray-600">Guitar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-purple-500 rounded-full" />
                      <span className="text-sm text-gray-600">Photography</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <span className="text-sm text-gray-600">Python</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full" />
                      <span className="text-sm text-gray-600">Available</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Click on any date to set specific availability for that day
                  </p>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div>
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Upcoming Sessions
                </h2>
                <div className="space-y-4">
                  {upcomingSessions.map(session => (
                    <div key={session.id} className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={session.teacher.avatar} name={session.teacher.name} size="sm" />
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {session.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              with {session.teacher.name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="blue">
                          {new Date(session.date) <= new Date(Date.now() + 86400000) ? 'Tomorrow' : 
                           new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {formatTimeForDisplay(session.time, session.timezone, userTimezone, session.date)} 
                          <span className="text-xs">({userTimezone.split('/')[1]?.replace('_', ' ') || userTimezone})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          {session.isOnline ? (
                            <>
                              <VideoIcon className="w-4 h-4" />
                              Online
                            </>
                          ) : (
                            <>
                              <MapPinIcon className="w-4 h-4" />
                              In-person
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" fullWidth>
                          {session.isOnline ? 'Join Call' : 'View Details'}
                        </Button>
                        <Button variant="secondary" size="sm">
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="ghost" fullWidth className="mt-4">
                  View All Sessions
                </Button>
              </Card>

              {/* Availability Summary */}
              <Card padding="lg" className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-green-600" />
                  This Week's Availability
                </h3>
                <div className="space-y-2">
                  {Object.entries(availabilitySchedule).map(([day, slots]) => {
                    const dayName = daysOfWeek[parseInt(day)];
                    return (
                      <div key={day} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{dayName}</span>
                        <span className="font-medium text-gray-900">
                          {slots.length} slot{slots.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Button 
                  variant="ghost" 
                  fullWidth 
                  className="mt-4"
                  onClick={() => setActiveTab('availability')}
                >
                  Manage Availability
                </Button>
              </Card>

              {/* Google Calendar Status */}
              <Card padding="lg" className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Google Calendar
                </h3>
                {googleCalendarConnected ? (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Connected to Google Calendar</p>
                    <p className="text-xs text-gray-500">
                      Your availability will be synced automatically
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Not connected</p>
                    <Button 
                      variant="secondary" 
                      fullWidth 
                      size="sm"
                      onClick={handleGoogleCalendarConnect}
                    >
                      Connect Now
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : (
          /* Availability Management Tab */
          <div className="max-w-6xl mx-auto">
            <Card padding="lg">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Manage Your Availability
                </h2>
                <p className="text-gray-600">
                  Set your available teaching hours for skill exchanges. Students can only book sessions during these times.
                </p>
                <div className="mt-2 text-sm text-gray-500">
                  Your timezone: <span className="font-medium">{userTimezone}</span>
                </div>
              </div>
              
              <AvailabilityScheduler
                skillId="general"
                initialSchedule={availabilitySchedule}
                onSave={handleSaveAvailability}
                timezone={userTimezone}
                maxSlotsPerDay={8}
                minSlotDuration={30}
                maxSlotDuration={180}
              />
            </Card>
          </div>
        )}
      </div>

      {/* Date-Specific Scheduler Modal */}
      {selectedDate && (
        <DateSpecificScheduler
          date={selectedDate}
          isOpen={showDateScheduler}
          onClose={() => {
            setShowDateScheduler(false);
            setSelectedDate(null);
          }}
          existingSlots={getAvailabilitySlotsForDay(selectedDate.getDay())}
          onSave={handleSaveDateSchedule}
          timezone={userTimezone}
        />
      )}
    </div>
  );
}