import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, SearchIcon, CalendarIcon } from 'lucide-react';
import { Card } from '../ui/Card';
const actions = [{
  title: 'List New Skill',
  description: 'Share your expertise with others',
  icon: <PlusIcon className="w-6 h-6" />,
  href: '/skills/new',
  color: 'bg-blue-50 text-blue-600'
}, {
  title: 'Find Skill',
  description: 'Discover new skills to learn',
  icon: <SearchIcon className="w-6 h-6" />,
  href: '/skills',
  color: 'bg-purple-50 text-purple-600'
}, {
  title: 'Schedule Session',
  description: 'Book your next learning session',
  icon: <CalendarIcon className="w-6 h-6" />,
  href: '/calendar',
  color: 'bg-emerald-50 text-emerald-600'
}];
export function QuickActions() {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map(action => <Link key={action.title} to={action.href}>
          <Card hover className="h-full">
            <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4`}>
              {action.icon}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
            <p className="text-sm text-gray-500">{action.description}</p>
          </Card>
        </Link>)}
    </div>;
}