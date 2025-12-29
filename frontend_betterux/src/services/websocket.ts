import React from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore, useAuthStore, useNotificationStore } from '../store';
import { Message } from '../lib/api';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect() {
    const { token } = useAuthStore.getState();
    
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:5000';
    
    this.socket = io(wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Connected',
        message: 'Real-time messaging is now active',
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Disconnected',
        message: 'Real-time messaging is temporarily unavailable',
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    // Message events
    this.socket.on('new_message', (data: { message: Message; conversationId: string }) => {
      const { message, conversationId } = data;
      const { addMessage, currentConversation } = useChatStore.getState();
      
      addMessage(conversationId, message);
      
      // Show notification if not in current conversation
      if (currentConversation !== conversationId) {
        useNotificationStore.getState().addNotification({
          type: 'message',
          title: 'New Message',
          message: `From ${message.sender.name}: ${message.message.substring(0, 50)}...`,
          data: { message, conversationId },
        });
      }
    });

    this.socket.on('message_updated', (data: { messageId: string; updates: Partial<Message>; conversationId: string }) => {
      const { messageId, updates, conversationId } = data;
      const { updateMessage } = useChatStore.getState();
      updateMessage(conversationId, messageId, updates);
    });

    this.socket.on('message_deleted', (data: { messageId: string; conversationId: string }) => {
      const { messageId, conversationId } = data;
      const { updateMessage } = useChatStore.getState();
      updateMessage(conversationId, messageId, { deleted: true, deletedAt: new Date().toISOString() });
    });

    // User presence events
    this.socket.on('user_online', (data: { userId: string; userName: string }) => {
      const { setOnlineUsers } = useChatStore.getState();
      const { onlineUsers } = useChatStore.getState();
      setOnlineUsers([...onlineUsers, data.userId]);
    });

    this.socket.on('user_offline', (data: { userId: string }) => {
      const { setOnlineUsers } = useChatStore.getState();
      const { onlineUsers } = useChatStore.getState();
      setOnlineUsers(onlineUsers.filter(id => id !== data.userId));
    });

    // Exchange events
    this.socket.on('exchange_update', (data: { exchangeId: string; status: string; message?: string }) => {
      useNotificationStore.getState().addNotification({
        type: 'exchange',
        title: 'Exchange Update',
        message: data.message || `Your exchange status has been updated to: ${data.status}`,
        data: { exchangeId: data.exchangeId, status: data.status },
      });
    });

    // Call events
    this.socket.on('call_offer', (data: { exchangeId: string; offer: any; caller: { id: string; name: string } }) => {
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Incoming Call',
        message: `${data.caller.name} is calling you`,
        data: { type: 'incoming_call', ...data },
      });
    });

    this.socket.on('call_ended', (data: { exchangeId: string; reason?: string }) => {
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Call Ended',
        message: data.reason || 'The call has ended',
        data: { type: 'call_ended', ...data },
      });
    });

    // Typing events
    this.socket.on('user_typing', (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => {
      // Handle typing indicators in chat store if needed
      console.log('User typing:', data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Connection Failed',
        message: 'Unable to establish real-time connection. Please refresh the page.',
      });
    }
  }

  // Join a conversation room
  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  // Leave a conversation room
  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  // Send a message
  sendMessage(conversationId: string, message: string) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', { conversationId, message });
    }
  }

  // Join a call room
  joinCall(exchangeId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_call', { exchangeId });
    }
  }

  // Leave a call room
  leaveCall(exchangeId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_call', { exchangeId });
    }
  }

  // Send call offer
  sendCallOffer(exchangeId: string, offer: any, recipientId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call_offer', { exchangeId, offer, recipientId });
    }
  }

  // Send call answer
  sendCallAnswer(exchangeId: string, answer: any, callerId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call_answer', { exchangeId, answer, callerId });
    }
  }

  // Send ICE candidate
  sendIceCandidate(exchangeId: string, candidate: any, targetId: string) {
    if (this.socket?.connected) {
      this.socket.emit('ice_candidate', { exchangeId, candidate, targetId });
    }
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
  }

  // Mark message as read
  markMessageAsRead(conversationId: string, messageId: string) {
    if (this.socket?.connected) {
      this.socket.emit('message_read', { conversationId, messageId });
    }
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket instance (for advanced usage)
  getSocket(): Socket | null {
    return this.socket;
  }
}

export const websocketService = new WebSocketService();

// React hook for WebSocket connection
export function useWebSocket() {
  const { isAuthenticated } = useAuthStore();
  
  // Connect/disconnect based on auth status
  React.useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect();
    } else {
      websocketService.disconnect();
    }

    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated]);

  return {
    sendMessage: websocketService.sendMessage.bind(websocketService),
    joinConversation: websocketService.joinConversation.bind(websocketService),
    leaveConversation: websocketService.leaveConversation.bind(websocketService),
    joinCall: websocketService.joinCall.bind(websocketService),
    leaveCall: websocketService.leaveCall.bind(websocketService),
    sendCallOffer: websocketService.sendCallOffer.bind(websocketService),
    sendCallAnswer: websocketService.sendCallAnswer.bind(websocketService),
    sendIceCandidate: websocketService.sendIceCandidate.bind(websocketService),
    sendTyping: websocketService.sendTyping.bind(websocketService),
    markMessageAsRead: websocketService.markMessageAsRead.bind(websocketService),
    isConnected: websocketService.isConnected.bind(websocketService),
    getSocket: websocketService.getSocket.bind(websocketService),
  };
}