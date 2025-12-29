import React, { useState } from 'react';
import { BellIcon, XIcon, CheckIcon, SettingsIcon, FilterIcon } from 'lucide-react';
import { useNotificationStore } from '../store';
import { format, parseISO } from 'date-fns';

export function NotificationCenter() {
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    setNotificationPreferences 
  } = useNotificationStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Handle notification actions based on type
    if (notification.data?.type === 'incoming_call') {
      // Handle call notification
      console.log('Handle incoming call:', notification.data);
    } else if (notification.data?.exchangeId) {
      // Navigate to exchange
      console.log('Navigate to exchange:', notification.data.exchangeId);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'exchange':
        return '🔄';
      case 'system':
        return '⚙️';
      case 'reminder':
        return '⏰';
      default:
        return '📢';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 text-gray-500 hover:text-gray-700 rounded"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 rounded"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 p-4 border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'unread' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Unread
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <CheckIcon className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BellIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-medium text-gray-900 ${
                            !notification.read ? 'font-semibold' : ''
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2 ml-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {format(parseISO(notification.createdAt), 'MMM d, h:mm a')}
                          </span>
                          {notification.data && (
                            <span className="text-xs text-blue-600 hover:text-blue-700">
                              View details
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Notification Preferences
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">
                    Push Notifications
                  </label>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    defaultChecked
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">
                    Email Notifications
                  </label>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    defaultChecked
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">
                    SMS Notifications
                  </label>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Toast notification component for ephemeral notifications
export function ToastNotification({ 
  notification, 
  onClose 
}: { 
  notification: any; 
  onClose: () => void; 
}) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification, onClose]);

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      case 'system':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm animate-in slide-in-from-top-2 ${getNotificationColor(notification.type)}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="text-sm mt-1 opacity-90">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/10 rounded"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}