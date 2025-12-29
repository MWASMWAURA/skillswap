import { useState, useEffect } from 'react';
import { apiClient, ApiResponse } from './api';
import { mockApi } from './mockData';

// Generic hook for API data fetching
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall();
        if (isMounted) {
          if (result.data) {
            setData(result.data);
          } else {
            setError(result.error || 'An error occurred');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  const refetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      if (result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}

// Hook for user profile
export function useUserProfile(userId?: string) {
  return useApi(
    () => apiClient.getUserProfile(userId || 'me'),
    [userId]
  );
}

// Hook for user stats
export function useUserStats() {
  return useApi(() => apiClient.getUserStats(), []);
}

// Hook for gamification progress
export function useUserProgress() {
  return useApi(() => apiClient.getUserProgress(), []);
}

// Hook for skills with filters
export function useSkills(filters?: {
  category?: string;
  level?: string;
  isOnline?: boolean;
  search?: string;
}) {
  return useApi(() => apiClient.getSkills(filters), [JSON.stringify(filters)]);
}

// Hook for popular skills
export function usePopularSkills() {
  return useApi(() => apiClient.getPopularSkills(), []);
}

// Hook for exchanges
export function useExchanges() {
  return useApi(() => apiClient.getExchanges(), []);
}

// Hook for exchange messages
export function useExchangeMessages(exchangeId: string) {
  return useApi(() => apiClient.getExchangeMessages(exchangeId), [exchangeId]);
}

// Hook for user conversations
export function useConversations() {
  return useApi(() => mockApi.getConversations(), []);
}

// Hook for unread message count
export function useUnreadMessageCount() {
  return useApi(() => mockApi.getUnreadCount(), []);
}

// Hook for search
export function useSearch(query: string, filters?: {
  type?: 'skills' | 'users';
  category?: string;
  level?: string;
}) {
  return useApi(() => apiClient.search(query, filters), [query, JSON.stringify(filters)]);
}

// Hook for leaderboards
export function useLeaderboards() {
  return useApi(() => apiClient.getLeaderboards(), []);
}

// Hook for user badges
export function useUserBadges() {
  return useApi(() => apiClient.getUserBadges(), []);
}

// Hook for achievements
export function useAchievements() {
  return useApi(() => apiClient.getAchievements(), []);
}