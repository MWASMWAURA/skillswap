import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';

interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data?: any;
  timestamp: number;
}

const QUEUE_KEY = 'offline_queue';
const CACHE_PREFIX = 'cache_';

class OfflineSyncService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  async initialize(): Promise<void> {
    // Listen for network changes
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        this.syncQueue();
      }
    });

    // Check initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
  }

  async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    const newAction: QueuedAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    queue.push(newAction);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async getQueue(): Promise<QueuedAction[]> {
    const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
  }

  async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    const queue = await this.getQueue();

    const successfulIds: string[] = [];

    for (const action of queue) {
      try {
        switch (action.type) {
          case 'CREATE':
            await api.post(action.endpoint, action.data);
            break;
          case 'UPDATE':
            await api.put(action.endpoint, action.data);
            break;
          case 'DELETE':
            await api.delete(action.endpoint);
            break;
        }
        successfulIds.push(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }

    // Remove successful actions from queue
    const remainingQueue = queue.filter((a) => !successfulIds.includes(a.id));
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));

    this.syncInProgress = false;
  }

  async cacheData(key: string, data: any, ttl: number = 3600000): Promise<void> {
    const cacheEntry = {
      data,
      expiry: Date.now() + ttl,
    };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheEntry));
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    const cacheStr = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cacheStr) return null;

    const cacheEntry = JSON.parse(cacheStr);
    if (Date.now() > cacheEntry.expiry) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return cacheEntry.data as T;
  }

  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600000
  ): Promise<T> {
    // Try cache first if offline
    if (!this.isOnline) {
      const cached = await this.getCachedData<T>(key);
      if (cached) return cached;
      throw new Error('No cached data available and device is offline');
    }

    try {
      const data = await fetcher();
      await this.cacheData(key, data, ttl);
      return data;
    } catch (error) {
      // Fallback to cache on error
      const cached = await this.getCachedData<T>(key);
      if (cached) return cached;
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  }

  isNetworkAvailable(): boolean {
    return this.isOnline;
  }
}

export const offlineSyncService = new OfflineSyncService();

export async function initializeOfflineSync(): Promise<void> {
  await offlineSyncService.initialize();
}
