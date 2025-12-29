// Mock data for testing messages functionality
import { Conversation, Message, User } from './api';

const MOCK_USERS: User[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    profilePhoto: '',
    level: 2,
    reputation: 85,
    location: 'New York',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    profilePhoto: '',
    level: 1,
    reputation: 72,
    location: 'San Francisco',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    skill: {
      id: 1,
      title: 'JavaScript',
      category: 'Programming'
    },
    otherUser: {
      id: 2,
      name: 'Bob Smith',
      profilePhoto: ''
    },
    status: 'accepted',
    lastMessage: {
      id: 1,
      message: 'Hi! I\'d love to learn JavaScript from you. When are you available?',
      sender: {
        id: 2,
        name: 'Bob Smith'
      },
      createdAt: '2024-12-06T10:30:00Z'
    },
    updatedAt: '2024-12-06T10:30:00Z',
    createdAt: '2024-12-06T09:00:00Z'
  },
  {
    id: 2,
    skill: {
      id: 2,
      title: 'Photography',
      category: 'Art'
    },
    otherUser: {
      id: 1,
      name: 'Alice Johnson',
      profilePhoto: ''
    },
    status: 'pending',
    lastMessage: {
      id: 2,
      message: 'I\'m interested in learning photography techniques.',
      sender: {
        id: 1,
        name: 'Alice Johnson'
      },
      createdAt: '2024-12-06T11:00:00Z'
    },
    updatedAt: '2024-12-06T11:00:00Z',
    createdAt: '2024-12-06T10:45:00Z'
  }
];

const MOCK_MESSAGES: Message[] = [
  {
    id: 1,
    exchangeId: 1,
    senderId: 2,
    message: 'Hi! I\'d love to learn JavaScript from you. When are you available?',
    isRead: false,
    edited: false,
    deleted: false,
    createdAt: '2024-12-06T10:30:00Z',
    updatedAt: '2024-12-06T10:30:00Z',
    sender: {
      id: 2,
      name: 'Bob Smith',
      profilePhoto: ''
    }
  },
  {
    id: 2,
    exchangeId: 1,
    senderId: 1,
    message: 'Hello Bob! I\'m available on weekends. Would Saturday afternoon work for you?',
    isRead: true,
    edited: false,
    deleted: false,
    createdAt: '2024-12-06T10:35:00Z',
    updatedAt: '2024-12-06T10:35:00Z',
    sender: {
      id: 1,
      name: 'Alice Johnson',
      profilePhoto: ''
    }
  },
  {
    id: 3,
    exchangeId: 1,
    senderId: 2,
    message: 'Perfect! Saturday afternoon works great for me. What should I prepare?',
    isRead: true,
    edited: false,
    deleted: false,
    createdAt: '2024-12-06T10:40:00Z',
    updatedAt: '2024-12-06T10:40:00Z',
    sender: {
      id: 2,
      name: 'Bob Smith',
      profilePhoto: ''
    }
  },
  {
    id: 4,
    exchangeId: 2,
    senderId: 1,
    message: 'I\'m interested in learning photography techniques.',
    isRead: false,
    edited: false,
    deleted: false,
    createdAt: '2024-12-06T11:00:00Z',
    updatedAt: '2024-12-06T11:00:00Z',
    sender: {
      id: 1,
      name: 'Alice Johnson',
      profilePhoto: ''
    }
  }
];

export const mockApi = {
  // Mock conversations
  getConversations: async () => {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    return {
      data: MOCK_CONVERSATIONS,
      error: undefined
    };
  },

  // Mock messages for exchange
  getExchangeMessages: async (exchangeId: string) => {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay
    const messages = MOCK_MESSAGES.filter(msg => msg.exchangeId === parseInt(exchangeId));
    
    return {
      data: messages,
      error: undefined
    };
  },

  // Mock send message
  sendMessage: async (exchangeId: string, message: string) => {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    
    const newMessage: Message = {
      id: MOCK_MESSAGES.length + 1,
      exchangeId: parseInt(exchangeId),
      senderId: 1, // Current user (Alice)
      message,
      isRead: false,
      edited: false,
      deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: 1,
        name: 'Alice Johnson',
        profilePhoto: ''
      }
    };

    // Add to mock messages
    MOCK_MESSAGES.push(newMessage);
    
    return {
      data: { message: 'Message sent successfully', messageData: newMessage },
      error: undefined
    };
  },

  // Mock unread count
  getUnreadCount: async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const unreadCount = MOCK_MESSAGES.filter(msg => !msg.isRead && msg.senderId !== 1).length;
    
    return {
      data: { count: unreadCount },
      error: undefined
    };
  }
};

export { MOCK_USERS, MOCK_CONVERSATIONS, MOCK_MESSAGES };