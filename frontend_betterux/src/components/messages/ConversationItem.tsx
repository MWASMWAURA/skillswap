import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { VideoIcon } from 'lucide-react';

export interface Conversation {
  id: string;
  user: {
    name: string;
    avatar: string;
    online: boolean;
  };
  skill: string;
  skillColor: 'blue' | 'purple' | 'green' | 'amber' | 'red';
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  action?: {
    label: string;
    type: 'join' | 'review' | 'schedule' | 'book';
  };
}
interface ConversationItemProps {
  conversation: Conversation;
  isSelected?: boolean;
}
export function ConversationItem({
  conversation,
  isSelected
}: ConversationItemProps) {
  return <Link to={`/messages/${conversation.id}`} className={`
        block p-4 rounded-xl border transition-all duration-200
        ${isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}
      `}>
      <div className="flex gap-4">
        <Avatar src={conversation.user.avatar} name={conversation.user.name} size="lg" online={conversation.user.online} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {conversation.user.name}
              </span>
              <Badge variant={conversation.skillColor} size="sm">
                {conversation.skill}
              </Badge>
            </div>
            <span className="text-xs text-gray-500">
              {conversation.timestamp}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate mb-2">
            {conversation.lastMessage}
          </p>
          <div className="flex items-center justify-between">
            {conversation.unreadCount ? <span className="text-xs font-medium text-blue-500">
                {conversation.unreadCount} new message
                {conversation.unreadCount > 1 ? 's' : ''}
              </span> : <span className="text-xs text-gray-400">
                {conversation.unreadCount === 0 ? `${Math.floor(Math.random() * 20) + 1} messages` : ''}
              </span>}
            {conversation.action && <Button size="sm" variant={conversation.action.type === 'join' ? 'primary' : 'secondary'}>
                {conversation.action.type === 'join' && <VideoIcon className="w-4 h-4 mr-1" />}
                {conversation.action.label}
              </Button>}
          </div>
        </div>
      </div>
    </Link>;
}