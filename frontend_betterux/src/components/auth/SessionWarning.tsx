import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RefreshCw, X, Monitor } from 'lucide-react';
import { sessionService, SessionWarning as SessionWarningType } from '../../services/sessionService';
import { Button } from '../ui/Button';

interface SessionWarningProps {
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionWarning({ onExtend, onLogout }: SessionWarningProps) {
  const [warning, setWarning] = useState<SessionWarningType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for session warnings
    const handleSessionWarning = (event: CustomEvent) => {
      setWarning(event.detail);
      
      if (event.detail.type === 'session_expiring') {
        setTimeRemaining(event.detail.timeRemaining || 0);
      } else if (event.detail.type === 'multiple_sessions') {
        setSessions(event.detail.sessions || []);
      }
    };

    window.addEventListener('sessionWarning', handleSessionWarning as EventListener);
    
    // Check for multiple sessions on mount
    checkMultipleSessions();

    return () => {
      window.removeEventListener('sessionWarning', handleSessionWarning as EventListener);
    };
  }, []);

  useEffect(() => {
    // Countdown timer for session expiry
    let interval: NodeJS.Timeout;
    
    if (warning?.type === 'session_expiring' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            // Auto logout when time runs out
            onLogout();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [warning, timeRemaining, onLogout]);

  const checkMultipleSessions = async () => {
    try {
      const sessionWarning = await sessionService.checkMultipleSessions();
      if (sessionWarning) {
        setWarning(sessionWarning);
        setSessions(sessionWarning.sessions || []);
      }
    } catch (error) {
      console.error('Failed to check multiple sessions:', error);
    }
  };

  const handleExtendSession = async () => {
    setLoading(true);
    try {
      const success = await sessionService.extendSession();
      if (success) {
        setWarning(null);
        onExtend();
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateOtherSessions = async () => {
    setLoading(true);
    try {
      const success = await sessionService.terminateAllOtherSessions();
      if (success) {
        setWarning(null);
        onExtend();
      }
    } catch (error) {
      console.error('Failed to terminate sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const dismissWarning = () => {
    setWarning(null);
  };

  if (!warning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {warning.type === 'session_expiring' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Session Expiring</h3>
                <p className="text-gray-600">Your session will expire soon</p>
              </div>
              <button onClick={dismissWarning} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-900">Time Remaining</span>
              </div>
              <div className="text-2xl font-mono font-bold text-orange-900">
                {formatTime(timeRemaining)}
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              {warning.message}
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleExtendSession}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Extending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Extend Session
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full"
              >
                Logout Now
              </Button>
            </div>
          </>
        )}

        {warning.type === 'multiple_sessions' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Monitor className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Multiple Sessions Detected</h3>
                <p className="text-gray-600">Your account is active on multiple devices</p>
              </div>
              <button onClick={dismissWarning} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                {warning.message}
              </p>
            </div>

            {sessions.length > 0 && (
              <div className="space-y-2 mb-6">
                <h4 className="font-medium text-gray-900">Active Sessions:</h4>
                {sessions.map((session, index) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.deviceInfo}</p>
                        <p className="text-xs text-gray-500">
                          {session.location && `${session.location} • `}
                          Last active: {new Date(session.lastActivity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleTerminateOtherSessions}
                disabled={loading}
                variant="ghost"
                className="w-full"
              >
                {loading ? 'Terminating...' : 'Terminate Other Sessions'}
              </Button>
              
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full"
              >
                Logout All Sessions
              </Button>
            </div>
          </>
        )}

        {warning.type === 'timeout_warning' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Session Expired</h3>
                <p className="text-gray-600">Please log in again</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              {warning.message}
            </p>

            <Button
              onClick={onLogout}
              className="w-full"
            >
              Return to Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}