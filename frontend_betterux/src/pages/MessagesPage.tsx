import React, { useState, useMemo } from 'react';
import { SearchIcon, PlusIcon, CalendarIcon, ClockIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConversationItem } from '../components/messages/ConversationItem';
import { useConversations, useUnreadMessageCount } from '../lib/hooks';
import { Conversation } from '../lib/api';

export function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: conversations, loading, error } = useConversations();
  const { data: unreadData } = useUnreadMessageCount();

  // Format conversations for display
  const formattedConversations = useMemo(() => {
    if (!conversations) return [];
    
    return conversations.map((conversation: Conversation) => ({
      id: conversation.id.toString(),
      user: {
        name: conversation.otherUser.name,
        avatar: conversation.otherUser.profilePhoto || '',
        online: false // TODO: Add real-time status
      },
      skill: conversation.skill.title,
      skillColor: 'blue' as const,
      lastMessage: conversation.lastMessage?.message || 'No messages yet',
      timestamp: conversation.lastMessage?.createdAt ? 
        new Date(conversation.lastMessage.createdAt).toLocaleTimeString() : 'Just now',
      unreadCount: 0, // TODO: Calculate based on actual data
      action: conversation.status === 'accepted' ? {
        label: 'Join Call',
        type: 'join' as const
      } : undefined
    }));
  }, [conversations]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return formattedConversations;
    return formattedConversations.filter(conv =>
      conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.skill.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [formattedConversations, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading conversations: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }
  return <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">Connect with your learning partners</p>
          </div>
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </header>

      <div className="p-6">
        {/* Search */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search conversations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card hover className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Scheduled Sessions
                </h3>
                <p className="text-sm text-gray-500">3 upcoming sessions</p>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          </Card>

          <Card hover className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Pending Requests
                </h3>
                <p className="text-sm text-gray-500">2 awaiting response</p>
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          </Card>
        </div>

        {/* Conversations List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Conversations
            </h2>
            <span className="text-sm text-gray-500">
              {filteredConversations.length} conversations
            </span>
          </div>
          <div className="space-y-3">
            {filteredConversations.map(conversation => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))}
          </div>
        </div>
      </div>
    </div>;
}