import React, { useState } from 'react';
import { X, Calendar, Clock, Save, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { TimeSlot, generateTimeOptions } from '../../lib/timezoneUtils';
import { googleCalendarService } from '../../lib/googleCalendarIntegration';

interface DateSpecificSchedulerProps {
  date: Date;
  isOpen: boolean;
  onClose: () => void;
  existingSlots: TimeSlot[];
  onSave: (slots: TimeSlot[]) => Promise<void>;
  timezone: string;
}

export function DateSpecificScheduler({
  date,
  isOpen,
  onClose,
  existingSlots,
  onSave,
  timezone
}: DateSpecificSchedulerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>(existingSlots);
  const [saving, setSaving] = useState(false);
  const [syncingToGoogle, setSyncingToGoogle] = useState(false);

  const timeOptions = generateTimeOptions();
  const dayOfWeek = date.getDay();

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      day: dayOfWeek,
      startTime: '09:00',
      endTime: '10:00',
      timezone,
    };
    setSlots(prev => [...prev, newSlot]);
  };

  const updateTimeSlot = (slotId: string, updates: Partial<TimeSlot>) => {
    setSlots(prev =>
      prev.map(slot =>
        slot.id === slotId ? { ...slot, ...updates } : slot
      )
    );
  };

  const removeTimeSlot = (slotId: string) => {
    setSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(slots);
      onClose();
    } catch (error) {
      console.error('Failed to save date-specific schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToGoogle = async () => {
    setSyncingToGoogle(true);
    try {
      // Sync each slot to Google Calendar
      for (const slot of slots) {
        const startTime = new Date(date);
        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        startTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(date);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);
        endTime.setHours(endHour, endMin, 0, 0);

        await googleCalendarService.createEvent({
          summary: `Available for Skill Exchange`,
          description: `Teaching availability for ${date.toLocaleDateString()}`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: timezone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: timezone,
          },
        });
      }
      alert('Availability synced to Google Calendar!');
    } catch (error) {
      console.error('Failed to sync to Google Calendar:', error);
      alert('Failed to sync to Google Calendar. Please try again.');
    } finally {
      setSyncingToGoogle(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Schedule for {formatDate(date)}
                </h2>
                <p className="text-sm text-gray-600">
                  Set your availability for this specific date
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Current Availability for this date */}
            {slots.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Current Availability
                </h3>
                <div className="space-y-3">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Start Time
                            </label>
                            <select
                              value={slot.startTime}
                              onChange={(e) =>
                                updateTimeSlot(slot.id, { startTime: e.target.value })
                              }
                              className="p-2 border border-gray-300 rounded-md text-sm"
                            >
                              {timeOptions.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              End Time
                            </label>
                            <select
                              value={slot.endTime}
                              onChange={(e) =>
                                updateTimeSlot(slot.id, { endTime: e.target.value })
                              }
                              className="p-2 border border-gray-300 rounded-md text-sm"
                            >
                              {timeOptions.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>
                            Duration: {Math.round(
                              (new Date(`2000-01-01T${slot.endTime}`).getTime() -
                                new Date(`2000-01-01T${slot.startTime}`).getTime()) /
                                (1000 * 60)
                            )} minutes
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeTimeSlot(slot.id)}
                        className="ml-4 text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new time slot */}
            <div>
              <Button
                onClick={addTimeSlot}
                variant="secondary"
                className="w-full flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Time Slot
              </Button>
            </div>

            {/* Google Calendar Integration */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Google Calendar Integration
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-3">
                  Sync your availability to Google Calendar to keep your schedule updated across all your devices.
                </p>
                <Button
                  onClick={handleSyncToGoogle}
                  disabled={syncingToGoogle || slots.length === 0}
                  className="w-full flex items-center gap-2"
                >
                  {syncingToGoogle ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Syncing to Google Calendar...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Sync to Google Calendar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || slots.length === 0}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}