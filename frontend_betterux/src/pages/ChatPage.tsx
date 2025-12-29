import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PaperclipIcon, SmileIcon, SendIcon, StarIcon, CalendarIcon, BellOffIcon, SearchIcon, BanIcon } from 'lucide-react';
import { ChatHeader } from '../components/messages/ChatHeader';
import { MessageBubble } from '../components/messages/MessageBubble';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useExchangeMessages } from '../lib/hooks';
import { mockApi } from '../lib/mockData';
import { Message } from '../lib/api';

// Mock user data for current user
const CURRENT_USER = {
  id: 1,
  name: 'John Doe',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
};

export function ChatPage() {
  const { id } = useParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const response = await mockApi.getExchangeMessages(id || '1');
        if (response.data) {
          setMessages(response.data);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadMessages();
    }
  }, [id]);

  // Send message
  const handleSend = async () => {
    if (!message.trim() || !id) return;

    setSending(true);
    try {
      const response = await mockApi.sendMessage(id, message.trim());
      if (response.data?.messageData) {
        setMessages(prev => [...prev, response.data.messageData]);
        setMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  // Mock chat data for display
  const chatData = {
    user: {
      name: 'Jane Smith',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
      online: true,
      skill: 'JavaScript',
      rating: 4.8,
      reviewCount: 24
    },
    upcomingSession: {
      title: 'JavaScript Fundamentals',
      date: 'Tomorrow, Dec 7',
      time: '3:00 PM - 4:30 PM'
    },
    sharedFiles: [
      {
        name: 'JavaScript_Guide.pdf',
        size: '2.4 MB',
        date: 'Today'
      }
    ]
  };

  // Transform messages for display
  const displayMessages = messages.map(msg => ({
    id: msg.id.toString(),
    content: msg.message,
    timestamp: new Date(msg.createdAt).toLocaleTimeString(),
    isOwn: msg.senderId === CURRENT_USER.id,
    sender: {
      name: msg.sender.name,
      avatar: msg.sender.profilePhoto || ''
    }
  }));

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatHeader user={chatData.user} upcomingSession={chatData.upcomingSession} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date Divider */}
          <div className="flex items-center justify-center">
            <span className="px-4 py-1 bg-gray-200 text-gray-600 text-sm rounded-full">
              Today, December 6, 2024
            </span>
          </div>

          {displayMessages.map(msg => (
            <MessageBubble
              key={msg.id}
              content={msg.content}
              timestamp={msg.timestamp}
              isOwn={msg.isOwn}
              sender={msg.sender}
            />
          ))}

          {/* Typing Indicator */}
          <div className="flex items-center gap-3">
            <Avatar src={chatData.user.avatar} name={chatData.user.name} size="sm" />
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden md:flex items-center gap-3 pr-4 border-r border-gray-200">
              <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} size="sm" />
              <div>
                <p className="text-sm font-medium text-gray-900">{CURRENT_USER.name}</p>
                <p className="text-xs text-gray-500">Level 3 • Learner</p>
              </div>
            </div>

            {/* Input */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <PaperclipIcon className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <SmileIcon className="w-5 h-5" />
                </button>
                <span className="text-xs text-gray-400">{message.length}/1000</span>
              </div>
            </div>
            <Button onClick={handleSend} disabled={!message.trim() || sending}>
              <SendIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar - Chat Info */}
      <aside className="hidden lg:block w-80 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Chat Information
          </h2>

          {/* User Profile */}
          <div className="text-center mb-6">
            <Avatar src={chatData.user.avatar} name={chatData.user.name} size="xl" className="mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900">
              {chatData.user.name}
            </h3>
            <p className="text-sm text-gray-500">{chatData.user.skill} Tutor</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <StarIcon className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-medium">{chatData.user.rating}</span>
              <span className="text-gray-500">
                ({chatData.user.reviewCount} reviews)
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <Button fullWidth>View Profile</Button>
            <Button variant="secondary" fullWidth>
              <CalendarIcon className="w-4 h-4 mr-2" />
              Schedule Session
            </Button>
          </div>

          {/* Shared Files */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Shared Files</h3>
            <div className="space-y-3">
              {chatData.sharedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">PDF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.size} • {file.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 text-left text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                <BellOffIcon className="w-5 h-5" />
                <span>Mute Notifications</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                <SearchIcon className="w-5 h-5" />
                <span>Search in Chat</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 text-left text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <BanIcon className="w-5 h-5" />
                <span>Block User</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}