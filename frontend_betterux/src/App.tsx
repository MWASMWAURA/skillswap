import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { MenuIcon } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SkillsPage } from './pages/SkillsPage';
import { SkillDetailPage } from './pages/SkillDetailPage';
import { MessagesPage } from './pages/MessagesPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { CalendarPage } from './pages/CalendarPage';
import { AdminVerificationPage } from './pages/AdminVerificationPage';
import { ListSkillPage } from './pages/ListSkillPage';
import { AuthProvider } from './lib/authContext';
import { TimezoneProvider } from './lib/timezoneContext';
import { RoleProvider, withRole } from './components/auth/RoleBasedAccess';
import { SessionWarning } from './components/auth/SessionWarning';
import { useAuth } from './lib/authContext';
import { sessionService } from './services/sessionService';

// Protect admin verification page with role-based access
const ProtectedAdminVerificationPage = withRole(AdminVerificationPage, ['admin']);

// Wrapper component for authenticated pages that includes session warning
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();

  const handleExtendSession = async () => {
    try {
      const success = await sessionService.extendSession();
      if (success) {
        console.log('Session extended successfully');
        // The session service will automatically restart monitoring
      } else {
        console.error('Failed to extend session');
        // If extension fails, you might want to force logout
        handleLogout();
      }
    } catch (error) {
      console.error('Error extending session:', error);
      // Handle error appropriately
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      {children}
      <SessionWarning onExtend={handleExtendSession} onLogout={handleLogout} />
    </>
  );
}
function AppLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Pages that don't need the sidebar (public pages)
  const publicPaths = ['/', '/login', '/register'];
  const isPublicPage = publicPaths.includes(location.pathname);
  // Chat page has its own full-screen layout
  const isChatPage = location.pathname.startsWith('/messages/') && location.pathname !== '/messages';
  if (isPublicPage) {
    return <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>;
  }
  if (isChatPage) {
    return <AuthenticatedLayout>
      <div className="flex h-screen overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          <main className="flex-1 lg:ml-64 h-full flex flex-col w-full">
            {/* Mobile Header for Chat */}
            <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <MenuIcon className="w-6 h-6" />
              </button>
              <span className="font-semibold text-gray-900">Messages</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/messages/:id" element={<ChatPage />} />
              </Routes>
            </div>
          </main>
        </div>
    </AuthenticatedLayout>;
  }
  return <AuthenticatedLayout>
    <div className="flex min-h-screen bg-gray-50">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main className="flex-1 lg:ml-64 w-full transition-all duration-300">
          {/* Mobile Header Trigger */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <MenuIcon className="w-6 h-6" />
            </button>
            <span className="font-semibold text-gray-900">SkillSwap</span>
          </div>

          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/skills/:id" element={<SkillDetailPage />} />
            <Route path="/skills/new" element={<ListSkillPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/admin/verification" element={<ProtectedAdminVerificationPage />} />
          </Routes>
        </main>
      </div>
  </AuthenticatedLayout>;
}
export function App() {
  return (
    <AuthProvider>
      <TimezoneProvider>
        <RoleProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </RoleProvider>
      </TimezoneProvider>
    </AuthProvider>
  );
}