import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboardIcon, BookOpenIcon, MessageSquareIcon, CalendarIcon, UserIcon, SettingsIcon, GraduationCapIcon, XIcon, ShieldCheckIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useRole } from '../auth/RoleBasedAccess';
import { useAuth } from '../../lib/authContext';
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}
const navItems: NavItem[] = [{
  label: 'Dashboard',
  href: '/dashboard',
  icon: <LayoutDashboardIcon className="w-5 h-5" />
}, {
  label: 'Skills',
  href: '/skills',
  icon: <BookOpenIcon className="w-5 h-5" />
}, {
  label: 'Messages',
  href: '/messages',
  icon: <MessageSquareIcon className="w-5 h-5" />,
  badge: 3
}, {
  label: 'Calendar',
  href: '/calendar',
  icon: <CalendarIcon className="w-5 h-5" />
}, {
  label: 'Profile',
  href: '/profile',
  icon: <UserIcon className="w-5 h-5" />
}];
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}
// Helper function to extract first name from full name
const getFirstName = (fullName: string): string => {
  return fullName.split(' ')[0] || fullName;
};

export function Sidebar({
  isOpen,
  onClose
}: SidebarProps) {
  const location = useLocation();
  const { user: authUser } = useAuth();
  const { user, hasRole } = useRole();
  
  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Build navigation items based on user role
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboardIcon className="w-5 h-5" />
      },
      {
        label: 'Skills',
        href: '/skills',
        icon: <BookOpenIcon className="w-5 h-5" />
      },
      {
        label: 'Messages',
        href: '/messages',
        icon: <MessageSquareIcon className="w-5 h-5" />,
        badge: 3
      },
      {
        label: 'Calendar',
        href: '/calendar',
        icon: <CalendarIcon className="w-5 h-5" />
      }
    ];

    // Add admin items for admin users
    if (hasRole('admin')) {
      baseItems.push({
        label: 'Verification Admin',
        href: '/admin/verification',
        icon: <ShieldCheckIcon className="w-5 h-5" />
      });
    }

    return baseItems;
  };

  const navItems = getNavItems();
  return <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}>
        {/* Logo & Close Button */}
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <GraduationCapIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-blue-500">SkillSwap</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return <Link key={item.href} to={item.href} className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200
                  ${isActive ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500 -ml-1 pl-5' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}>
                {item.icon}
                <span>{item.label}</span>
                {item.badge && <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>}
              </Link>;
        })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <Link to="/profile" className="block">
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
              <Avatar 
                src={authUser?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.name || 'User')}&background=3b82f6&color=fff&size=100`} 
                name={authUser?.name || 'User'} 
                size="md" 
                online={true} 
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {authUser?.name ? getFirstName(authUser.name) : 'User'}
                </p>
                <p className="text-xs text-gray-500">
                  Level {authUser?.level || 1} Learner
                </p>
              </div>
              <SettingsIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>
        </div>
      </aside>
    </>;
}