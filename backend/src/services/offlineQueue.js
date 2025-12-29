const localforage = require('localforage');
const { v4: uuidv4 } = require('uuid');
const encryption = require('./encryption');

/**
 * Offline Message Queue Service
 * Handles message queuing for offline users and synchronization when back online
 */
class OfflineMessageQueue {
  constructor() {
    // Configure localforage for offline storage
    this.messageQueueStore = localforage.createInstance({
      name: 'SkillSwap',
      storeName: 'messageQueue'
    });

    this.syncTokenStore = localforage.createInstance({
      name: 'SkillSwap',
      storeName: 'syncTokens'
    });

    this.encryptedMessagesStore = localforage.createInstance({
      name: 'SkillSwap',
      storeName: 'encryptedMessages'
    });

    this.maxQueueSize = 1000; // Maximum messages to queue offline
    this.maxRetries = 3; // Maximum retry attempts
  }

  /**
   * Initialize offline storage
   */
  async initialize() {
    try {
      await this.cleanupExpiredMessages();
      await this.loadPendingMessages();
      console.log('Offline message queue initialized successfully');
    } catch (error) {
      console.error('Failed to initialize offline message queue:', error);
      throw error;
    }
  }

  /**
   * Add message to offline queue
   * @param {object} message - Message to queue
   * @param {string} userKey - User-specific encryption key
   * @returns {string} Queue ID
   */
  async addToQueue(message, userKey) {
    try {
      const queueId = uuidv4();
      const timestamp = Date.now();
      
      // Validate message structure
      if (!message || !message.content || !message.exchangeId) {
        throw new Error('Invalid message structure');
      }

      // Check queue size
      const queueSize = await this.getQueueSize();
      if (queueSize >= this.maxQueueSize) {
        // Remove oldest messages if queue is full
        await this.cleanupOldestMessages(queueSize - this.maxQueueSize + 1);
      }

      // Encrypt message for secure offline storage
      const encryptedMessage = encryption.encryptForOfflineStorage(message, userKey);
      
      const queueItem = {
        id: queueId,
        exchangeId: message.exchangeId,
        senderId: message.senderId,
        recipientId: message.recipientId,
        encryptedContent: encryptedMessage,
        messageType: message.messageType || 'text',
        attachmentUrl: message.attachmentUrl,
        priority: this.calculatePriority(message),
        timestamp: timestamp,
        retryCount: 0,
        status: 'queued',
        createdAt: new Date().toISOString()
      };

      await this.messageQueueStore.setItem(queueId, queueItem);
      
      console.log(`Message queued for offline sync: ${queueId}`);
      return queueId;
    } catch (error) {
      console.error('Failed to add message to queue:', error);
      throw error;
    }
  }

  /**
   * Get all queued messages for a user
   * @param {number} userId - User ID
   * @returns {Array} Queued messages
   */
  async getQueuedMessages(userId) {
    try {
      const messages = await this.messageQueueStore.keys();
      const userMessages = [];

      for (const key of messages) {
        const message = await this.messageQueueStore.getItem(key);
        if (message && (message.senderId === userId || message.recipientId === userId)) {
          userMessages.push(message);
        }
      }

      // Sort by priority and timestamp
      return userMessages.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Earlier messages first
      });
    } catch (error) {
      console.error('Failed to get queued messages:', error);
      throw error;
    }
  }

  /**
   * Process queued messages for synchronization
   * @param {number} userId - User ID
   * @param {string} syncToken - Secure sync token
   * @returns {object} Sync results
   */
  async processQueueForSync(userId, syncToken) {
    try {
      // Verify sync token
      if (!encryption.verifySyncToken(syncToken, userId)) {
        throw new Error('Invalid sync token');
      }

      const queuedMessages = await this.getQueuedMessages(userId);
      const results = {
        processed: [],
        failed: [],
        total: queuedMessages.length
      };

      for (const message of queuedMessages) {
        try {
          const syncResult = await this.syncMessage(message, userId);
          
          if (syncResult.success) {
            results.processed.push({
              queueId: message.id,
              serverMessageId: syncResult.messageId,
              timestamp: new Date().toISOString()
            });
            
            // Remove from queue on successful sync
            await this.messageQueueStore.removeItem(message.id);
          } else {
            results.failed.push({
              queueId: message.id,
              error: syncResult.error,
              retryCount: message.retryCount + 1
            });
            
            // Update retry count
            if (message.retryCount < this.maxRetries) {
              message.retryCount++;
              await this.messageQueueStore.setItem(message.id, message);
            } else {
              // Max retries reached, remove from queue
              await this.messageQueueStore.removeItem(message.id);
            }
          }
        } catch (error) {
          console.error(`Failed to sync message ${message.id}:`, error);
          results.failed.push({
            queueId: message.id,
            error: error.message,
            retryCount: message.retryCount
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to process queue for sync:', error);
      throw error;
    }
  }

  /**
   * Sync individual message to server
   * @param {object} queueItem - Queue item to sync
   * @param {number} userId - User ID
   * @returns {object} Sync result
   */
  async syncMessage(queueItem, userId) {
    try {
      // Decrypt message
      const userKey = await this.getUserEncryptionKey(userId);
      if (!userKey) {
        throw new Error('User encryption key not found');
      }

      const decryptedMessage = encryption.decryptFromOfflineStorage(
        queueItem.encryptedContent, 
        userKey
      );

      // Prepare message for server
      const messageData = {
        exchangeId: decryptedMessage.exchangeId,
        message: decryptedMessage.content,
        messageType: decryptedMessage.messageType || 'text',
        attachmentUrl: decryptedMessage.attachmentUrl,
        offlineQueuedAt: decryptedMessage.encryptedAt
      };

      // Here you would make the API call to your backend
      // For now, we'll simulate the sync process
      const syncResult = await this.simulateServerSync(messageData);
      
      return {
        success: true,
        messageId: syncResult.messageId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Message sync error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate sync token for user
   * @param {number} userId - User ID
   * @returns {string} Sync token
   */
  async generateSyncToken(userId) {
    try {
      const token = encryption.generateSyncToken(userId);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await this.syncTokenStore.setItem(`${userId}_token`, {
        token,
        userId,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });

      return token;
    } catch (error) {
      console.error('Failed to generate sync token:', error);
      throw error;
    }
  }

  /**
   * Get queue size for user
   * @param {number} userId - Optional user ID filter
   * @returns {number} Queue size
   */
  async getQueueSize(userId = null) {
    try {
      const keys = await this.messageQueueStore.keys();
      
      if (!userId) {
        return keys.length;
      }

      let count = 0;
      for (const key of keys) {
        const message = await this.messageQueueStore.getItem(key);
        if (message && (message.senderId === userId || message.recipientId === userId)) {
          count++;
        }
      }
      
      return count;
    } catch (error) {
      console.error('Failed to get queue size:', error);
      return 0;
    }
  }

  /**
   * Calculate message priority
   * @param {object} message - Message object
   * @returns {number} Priority score (1-10)
   */
  calculatePriority(message) {
    let priority = 5; // Default priority

    // Higher priority for urgent messages
    if (message.urgent) priority += 3;
    
    // Higher priority for skill exchange related messages
    if (message.exchangeId) priority += 2;
    
    // Higher priority for new conversations
    if (message.isNewConversation) priority += 1;
    
    // Lower priority for notifications
    if (message.messageType === 'notification') priority -= 2;

    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Get user encryption key (from secure storage)
   * @param {number} userId - User ID
   * @returns {string} User encryption key
   */
  async getUserEncryptionKey(userId) {
    try {
      const keyData = await this.encryptedMessagesStore.getItem(`userKey_${userId}`);
      return keyData ? keyData.key : null;
    } catch (error) {
      console.error('Failed to get user encryption key:', error);
      return null;
    }
  }

  /**
   * Set user encryption key
   * @param {number} userId - User ID
   * @param {string} key - Encryption key
   */
  async setUserEncryptionKey(userId, key) {
    try {
      await this.encryptedMessagesStore.setItem(`userKey_${userId}`, {
        key,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to set user encryption key:', error);
      throw error;
    }
  }

  /**
   * Clean up expired messages from queue
   */
  async cleanupExpiredMessages() {
    try {
      const keys = await this.messageQueueStore.keys();
      const now = Date.now();
      const expirationTime = 30 * 24 * 60 * 60 * 1000; // 30 days

      for (const key of keys) {
        const message = await this.messageQueueStore.getItem(key);
        if (message && (now - message.timestamp) > expirationTime) {
          await this.messageQueueStore.removeItem(key);
          console.log(`Removed expired message from queue: ${key}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired messages:', error);
    }
  }

  /**
   * Load pending messages from server (for new sessions)
   * @param {number} userId - User ID
   * @param {string} lastSyncTime - Last sync timestamp
   */
  async loadPendingMessages(userId, lastSyncTime = null) {
    try {
      // This would typically involve fetching messages from the server
      // that the user hasn't received yet
      console.log(`Loading pending messages for user ${userId}`);
    } catch (error) {
      console.error('Failed to load pending messages:', error);
    }
  }

  /**
   * Clean up oldest messages from queue
   * @param {number} count - Number of messages to remove
   */
  async cleanupOldestMessages(count) {
    try {
      const keys = await this.messageQueueStore.keys();
      const messages = [];

      for (const key of keys) {
        const message = await this.messageQueueStore.getItem(key);
        if (message) {
          messages.push({ key, ...message });
        }
      }

      // Sort by timestamp and remove oldest
      messages.sort((a, b) => a.timestamp - b.timestamp);
      
      const toRemove = messages.slice(0, count);
      for (const msg of toRemove) {
        await this.messageQueueStore.removeItem(msg.key);
      }

      console.log(`Cleaned up ${count} oldest messages from queue`);
    } catch (error) {
      console.error('Failed to cleanup oldest messages:', error);
    }
  }

  /**
   * Simulate server sync (replace with actual API call)
   * @param {object} messageData - Message data to sync
   * @returns {object} Sync result
   */
  async simulateServerSync(messageData) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate random success/failure for testing
    if (Math.random() > 0.1) { // 90% success rate
      return {
        success: true,
        messageId: uuidv4()
      };
    } else {
      throw new Error('Simulated server error');
    }
  }

  /**
   * Clear all queued messages (for testing/logout)
   * @param {number} userId - Optional user ID filter
   */
  async clearQueue(userId = null) {
    try {
      if (!userId) {
        await this.messageQueueStore.clear();
        console.log('Cleared entire message queue');
      } else {
        const keys = await this.messageQueueStore.keys();
        for (const key of keys) {
          const message = await this.messageQueueStore.getItem(key);
          if (message && (message.senderId === userId || message.recipientId === userId)) {
            await this.messageQueueStore.removeItem(key);
          }
        }
        console.log(`Cleared message queue for user ${userId}`);
      }
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns {object} Queue statistics
   */
  async getQueueStats() {
    try {
      const keys = await this.messageQueueStore.keys();
      const stats = {
        total: keys.length,
        byPriority: {},
        byMessageType: {},
        averageRetryCount: 0
      };

      let totalRetries = 0;

      for (const key of keys) {
        const message = await this.messageQueueStore.getItem(key);
        if (message) {
          // Count by priority
          stats.byPriority[message.priority] = (stats.byPriority[message.priority] || 0) + 1;
          
          // Count by message type
          stats.byMessageType[message.messageType] = (stats.byMessageType[message.messageType] || 0) + 1;
          
          // Sum retry counts
          totalRetries += message.retryCount;
        }
      }

      stats.averageRetryCount = stats.total > 0 ? totalRetries / stats.total : 0;

      return stats;
    } catch (error) {
      console.error('Failed to get queue statistics:', error);
      return {
        total: 0,
        byPriority: {},
        byMessageType: {},
        averageRetryCount: 0
      };
    }
  }
}

module.exports = new OfflineMessageQueue();