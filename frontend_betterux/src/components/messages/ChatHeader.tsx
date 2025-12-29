import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, VideoIcon, PhoneIcon, InfoIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
interface ChatHeaderProps {
  user: {
    name: string;
    avatar: string;
    online: boolean;
    skill: string;
  };
  upcomingSession?: {
    title: string;
    date: string;
    time: string;
  };
}
export function ChatHeader({
  user,
  upcomingSession
}: ChatHeaderProps) {
  return <div className="bg-white border-b border-gray-200">
      {/* Main Header */}
      <div className="flex items-center gap-4 p-4">
        <Link to="/messages" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden">
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>

        <Avatar src={user.avatar} name={user.name} size="md" online={user.online} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">{user.name}</h2>
            <span className="text-sm text-emerald-500">
              {user.online ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-sm text-gray-500">{user.skill} Tutor</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <VideoIcon className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <InfoIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Upcoming Session Banner */}
      {upcomingSession && <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center gap-3">
            <Badge variant="blue">Upcoming Session</Badge>
            <span className="text-sm text-gray-700">
              <strong>{upcomingSession.title}</strong> • {upcomingSession.date}{' '}
              • {upcomingSession.time}
            </span>
          </div>
          <Button size="sm">
            <VideoIcon className="w-4 h-4 mr-1" />
            Join Session
          </Button>
        </div>}
    </div>;
}