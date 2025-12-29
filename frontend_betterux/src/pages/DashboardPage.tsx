import React from 'react';
import { Link } from 'react-router-dom';
import { TrophyIcon, StarIcon, RefreshCwIcon, BookOpenIcon, BellIcon, SettingsIcon } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { RecentExchanges } from '../components/dashboard/RecentExchanges';
import { UpcomingSessions } from '../components/dashboard/UpcomingSessions';
import { SkillCard } from '../components/skills/SkillCard';
import { useUserStats, useUserProgress, usePopularSkills, useExchanges } from '../lib/hooks';
import { useAuth } from '../lib/authContext';
import { RoleIndicator, PermissionGate } from '../components/auth/RoleBasedAccess';
// Helper function to extract first name from full name
const getFirstName = (fullName: string): string => {
  return fullName.split(' ')[0] || fullName;
};

export function DashboardPage() {
  const { user } = useAuth();
  const { data: userStats, loading: statsLoading } = useUserStats();
  const { data: userProgress, loading: progressLoading } = useUserProgress();
  const { data: popularSkills, loading: skillsLoading } = usePopularSkills();
  const { data: exchanges, loading: exchangesLoading } = useExchanges();

  const isLoading = statsLoading || progressLoading || skillsLoading || exchangesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const activeExchanges = exchanges?.filter(exchange => 
    exchange.status === 'accepted' || exchange.status === 'in_progress'
  ) || [];
  const completedExchanges = exchanges?.filter(exchange => exchange.status === 'completed') || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name ? getFirstName(user.name) : 'User'}! 👋
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your learning journey today.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <RoleIndicator />
            <PermissionGate permission="system:settings">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <SettingsIcon className="w-6 h-6" />
              </button>
            </PermissionGate>
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <BellIcon className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title={`Level ${userProgress?.level || 1}`} 
            value={`Level ${userProgress?.level || 1}`} 
            icon={<TrophyIcon className="w-5 h-5 text-white" />} 
            variant="blue" 
            badge={`+${userProgress ? (userProgress.nextLevelXP - userProgress.currentXP) : 0} XP`} 
            progress={{
              current: userProgress?.currentXP || 0,
              max: userProgress?.nextLevelXP || 1000
            }} 
          />
          <StatCard 
            title={`Based on ${userStats?.reviewCount || 0} reviews`} 
            value={userStats?.rating?.toFixed(1) || '0.0'} 
            icon={<StarIcon className="w-5 h-5 text-white" />} 
            variant="purple" 
            badge="Top 10%" 
            subtitle="⭐⭐⭐⭐⭐" 
          />
          <StatCard 
            title="Ongoing exchanges" 
            value={activeExchanges.length.toString()} 
            icon={<RefreshCwIcon className="w-5 h-5 text-white" />} 
            variant="green" 
            badge="Active" 
            subtitle={`${activeExchanges.filter(e => e.requesterId === user?.id).length} as learner • ${activeExchanges.filter(e => e.providerId === user?.id).length} as teacher`} 
          />
          <StatCard 
            title="Skills you can teach" 
            value={userStats?.skillsTaught?.toString() || '0'} 
            icon={<BookOpenIcon className="w-5 h-5 text-white" />} 
            variant="orange" 
            badge="+2 New" 
            subtitle="JavaScript, React, Design..." 
          />
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <QuickActions />
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentExchanges exchanges={exchanges || []} />
          <UpcomingSessions />
        </div>

        {/* Admin/Moderator Dashboard Section */}
        <PermissionGate permission="users:read">
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Admin Dashboard
              </h2>
              <Link to="/admin/verification" className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors">
                Go to Admin Panel
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">Pending Verifications</h3>
                <p className="text-2xl font-bold text-blue-600">12</p>
                <p className="text-sm text-blue-700">Skills awaiting review</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900">Active Reports</h3>
                <p className="text-2xl font-bold text-yellow-600">3</p>
                <p className="text-sm text-yellow-700">Requiring attention</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-green-900">System Health</h3>
                <p className="text-2xl font-bold text-green-600">99.9%</p>
                <p className="text-sm text-green-700">Uptime this month</p>
              </div>
            </div>
          </section>
        </PermissionGate>

        {/* Recommended Skills */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recommended for You
            </h2>
            <Link to="/skills" className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors">
              Browse All Skills
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(popularSkills || []).slice(0, 3).map(skill => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}