import React, { useState, useCallback } from 'react';
import { Calendar, Clock, Plus, X, Save, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface TimeSlot {
  id: string;
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
}

interface AvailabilitySchedule {
  [key: string]: TimeSlot[]; // day -> time slots
}

interface AvailabilitySchedulerProps {
  skillId?: string;
  initialSchedule?: AvailabilitySchedule;
  onSave: (schedule: AvailabilitySchedule) => Promise<void>;
  timezone?: string;
  maxSlotsPerDay?: number;
  minSlotDuration?: number; // in minutes
  maxSlotDuration?: number; // in minutes
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export function AvailabilityScheduler({
  skillId,
  initialSchedule = {},
  onSave,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  maxSlotsPerDay = 8,
  minSlotDuration = 30,
  maxSlotDuration = 180,
}: AvailabilitySchedulerProps) {
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(initialSchedule);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [saving, setSaving] = useState(false);

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const addTimeSlot = (day: number) => {
    // Ensure we have an array for this day and check slot limit
    if (!schedule[day]) {
      schedule[day] = [];
    }
    if (schedule[day].length >= maxSlotsPerDay) return;

    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      day,
      startTime: '09:00',
      endTime: '10:00',
      timezone,
    };

    setSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), newSlot],
    }));
  };

  const updateTimeSlot = (slotId: string, day: number, updates: Partial<TimeSlot>) => {
    setSchedule(prev => {
      const daySlots = prev[day] || [];
      const updatedSlots = daySlots.map(slot =>
        slot.id === slotId ? { ...slot, ...updates } : slot
      );

      // Validate time slot
      const updatedSlot = updatedSlots.find(s => s.id === slotId);
      if (updatedSlot) {
        const startMinutes = timeToMinutes(updatedSlot.startTime);
        const endMinutes = timeToMinutes(updatedSlot.endTime);
        
        if (endMinutes <= startMinutes) {
          // Invalid time range, don't update
          return prev;
        }

        const duration = endMinutes - startMinutes;
        if (duration < minSlotDuration || duration > maxSlotDuration) {
          // Invalid duration, don't update
          return prev;
        }
      }

      return {
        ...prev,
        [day]: updatedSlots,
      };
    });
  };

  const removeTimeSlot = (day: number, slotId: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: (prev[day] || []).filter(slot => slot.id !== slotId),
    }));
  };

  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(schedule);
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetSchedule = () => {
    setSchedule({});
    setSelectedDay(null);
    setEditingSlot(null);
  };

  const hasChanges = JSON.stringify(schedule) !== JSON.stringify(initialSchedule);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Availability Schedule
          </h2>
          <p className="text-gray-600 mt-1">
            Set your available teaching hours for this skill
          </p>
        </div>
        
        <div className="flex gap-2">
          {hasChanges && (
            <Button
              variant="ghost"
              onClick={resetSchedule}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </div>

      {/* Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS_OF_WEEK.map((day) => {
          const slots = schedule[day.value] || [];
          const isSelected = selectedDay === day.value;
          
          return (
            <div
              key={day.value}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedDay(isSelected ? null : day.value)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{day.label}</h3>
                <span className="text-sm text-gray-500">
                  {slots.length}/{maxSlotsPerDay}
                </span>
              </div>
              
              <div className="space-y-2">
                {slots.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No availability</p>
                ) : (
                  slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-2 bg-white rounded border text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSlot(slot);
                      }}
                    >
                      <span className="font-medium">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTimeSlot(day.value, slot.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  addTimeSlot(day.value);
                }}
                disabled={slots.length >= maxSlotsPerDay}
                className="w-full mt-3 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Time Slot
              </Button>
            </div>
          );
        })}
      </div>

      {/* Time Slot Editor Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Time Slot</h3>
              <button
                onClick={() => setEditingSlot(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Day
                </label>
                <select
                  value={editingSlot.day}
                  onChange={(e) => {
                    const newDay = parseInt(e.target.value);
                    updateTimeSlot(editingSlot.id, editingSlot.day, { day: newDay });
                    setEditingSlot({ ...editingSlot, day: newDay });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <select
                    value={editingSlot.startTime}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      const updates = { startTime: newStartTime };
                      updateTimeSlot(editingSlot.id, editingSlot.day, updates);
                      setEditingSlot({ ...editingSlot, ...updates });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <select
                    value={editingSlot.endTime}
                    onChange={(e) => {
                      const newEndTime = e.target.value;
                      const updates = { endTime: newEndTime };
                      updateTimeSlot(editingSlot.id, editingSlot.day, updates);
                      setEditingSlot({ ...editingSlot, ...updates });
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={editingSlot.timezone}
                  onChange={(e) => {
                    const updates = { timezone: e.target.value };
                    updateTimeSlot(editingSlot.id, editingSlot.day, updates);
                    setEditingSlot({ ...editingSlot, ...updates });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Duration: {minutesToTime(
                      timeToMinutes(editingSlot.endTime) - timeToMinutes(editingSlot.startTime)
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Min: {minSlotDuration}min, Max: {maxSlotDuration}min
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setEditingSlot(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setEditingSlot(null)}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Scheduling Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Set realistic availability that you can consistently maintain</li>
          <li>• Consider time zones if you teach students from different regions</li>
          <li>• You can update your schedule anytime</li>
          <li>• Students can only book sessions during your available hours</li>
        </ul>
      </div>
    </div>
  );
}