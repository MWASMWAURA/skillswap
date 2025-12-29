import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Calendar from 'expo-calendar';
import { calendarAPI } from '../services/api';

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  skillExchangeId?: string;
}

export default function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    requestCalendarPermission();
    fetchEvents();
  }, []);

  const requestCalendarPermission = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Calendar access is needed to schedule skill sessions'
      );
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await calendarAPI.getEvents();
      const formattedEvents = response.data.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const syncToDeviceCalendar = async (event: CalendarEvent) => {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(
        (cal) => cal.allowsModifications
      );

      if (!defaultCalendar) {
        Alert.alert('Error', 'No writable calendar found');
        return;
      }

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        notes: event.notes,
        location: event.location,
      });

      Alert.alert('Success', 'Event added to your device calendar');
    } catch (error) {
      console.error('Failed to sync event:', error);
      Alert.alert('Error', 'Failed to add event to calendar');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter((event) => event.startDate >= now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  };

  const renderEventCard = ({ item }: { item: CalendarEvent }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventDateContainer}>
        <Text style={styles.eventDay}>
          {item.startDate.getDate()}
        </Text>
        <Text style={styles.eventMonth}>
          {item.startDate.toLocaleDateString([], { month: 'short' })}
        </Text>
      </View>
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventTime}>
          {formatTime(item.startDate)} - {formatTime(item.endDate)}
        </Text>
        {item.location && (
          <Text style={styles.eventLocation}>📍 {item.location}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.syncButton}
        onPress={() => syncToDeviceCalendar(item)}
      >
        <Text style={styles.syncButtonText}>📅</Text>
      </TouchableOpacity>
    </View>
  );

  const upcomingEvents = getUpcomingEvents();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>Your upcoming skill sessions</Text>
      </View>

      <FlatList
        data={upcomingEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eventsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No upcoming sessions</Text>
            <Text style={styles.emptyText}>
              Schedule a skill exchange to see it here
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.todaySection}>
            <Text style={styles.todayText}>
              Today is {formatDate(new Date())}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  todaySection: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  todayText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  eventsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventDateContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  eventDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  eventMonth: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  syncButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  syncButtonText: {
    fontSize: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
