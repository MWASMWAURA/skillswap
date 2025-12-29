import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Exchange } from '../../lib/api';

interface RecentExchangesProps {
  exchanges: Exchange[];
}

const statusVariants: Record<Exchange['status'], 'green' | 'blue' | 'gray' | 'amber'> = {
  'Active': 'green',
  'Scheduled': 'blue',
  'Completed': 'gray',
  'Pending': 'amber',
  'Cancelled': 'gray'
};

export function RecentExchanges({ exchanges }: RecentExchangesProps) {
  // Get the most recent exchanges (limit to 3)
  const recentExchanges = exchanges
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Recent Exchanges
        </h2>
        <Link to="/messages" className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors">
          View All
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {recentExchanges.length > 0 ? (
          recentExchanges.map(exchange => (
            <div key={exchange.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <Avatar 
                src={exchange.teacher.avatar} 
                name={exchange.teacher.name} 
                size="md" 
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {exchange.skill.title}
                </p>
                <p className="text-sm text-gray-500">
                  with {exchange.teacher.name}
                </p>
              </div>
              <Badge variant={statusVariants[exchange.status]}>
                {exchange.status}
              </Badge>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No exchanges yet</p>
            <p className="text-sm mt-1">Start by browsing skills to begin learning!</p>
          </div>
        )}
      </div>
    </div>
  );
}