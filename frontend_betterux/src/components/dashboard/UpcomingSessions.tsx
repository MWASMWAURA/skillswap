import React from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, VideoIcon, MapPinIcon } from 'lucide-react';
import { Button } from '../ui/Button';
interface Session {
  id: string;
  skillName: string;
  teacherName: string;
  date: string;
  time: string;
  isOnline: boolean;
}
const mockSessions: Session[] = [{
  id: '1',
  skillName: 'JavaScript Session',
  teacherName: 'Jane Smith',
  date: 'Tomorrow',
  time: '3:00 PM - 4:30 PM',
  isOnline: true
}, {
  id: '2',
  skillName: 'Guitar Practice',
  teacherName: 'Mike Chen',
  date: 'Thu, Dec 5',
  time: '7:00 PM - 8:00 PM',
  isOnline: false
}];
export function UpcomingSessions() {
  return <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Upcoming Sessions
        </h2>
        <Link to="/calendar" className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors">
          View Calendar
        </Link>
      </div>
      <div className="p-4 space-y-4">
        {mockSessions.map(session => <div key={session.id} className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {session.skillName}
                </h3>
                <p className="text-sm text-gray-500">
                  with {session.teacherName}
                </p>
              </div>
              <span className="text-sm font-medium text-gray-600">
                {session.date}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {session.time}
              </span>
              <span className="flex items-center gap-1">
                {session.isOnline ? <>
                    <VideoIcon className="w-4 h-4" />
                    Online
                  </> : <>
                    <MapPinIcon className="w-4 h-4" />
                    In-person
                  </>}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" fullWidth>
                {session.isOnline ? 'Join Call' : 'View Details'}
              </Button>
              <Button variant="secondary" size="sm">
                {session.isOnline ? 'Reschedule' : 'Message'}
              </Button>
            </div>
          </div>)}
      </div>
    </div>;
}