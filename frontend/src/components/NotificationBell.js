import React, { useState, useEffect, useRef } from 'react';
import { notificationApi } from '../api';
import { Bell, CheckCheck, Clock, ShieldAlert, Sparkles, FileText, Stethoscope } from 'lucide-react';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationApi.list();
      const list = data.results || data || [];
      setNotifications(list);
      setUnreadCount(data.unread_count ?? list.filter((n) => !n.is_read).length);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const getIcon = (type) => {
    switch (type) {
      case 'consultation_called':
        return <Stethoscope size={14} className="text-emerald-600" />;
      case 'prescription_issued':
        return <FileText size={14} className="text-blue-600" />;
      case 'capacity_alert':
        return <ShieldAlert size={14} className="text-amber-600" />;
      case 'queue_update':
        return <Clock size={14} className="text-indigo-600" />;
      default:
        return <Sparkles size={14} className="text-purple-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 px-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-gray-900 uppercase tracking-wider">Notifications</span>
              {unreadCount > 0 && (
                <span className="badge-blue text-[10px] py-0 px-1.5">{unreadCount} new</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                  className={`p-3.5 text-xs transition-colors cursor-pointer flex gap-3 ${
                    n.is_read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/50 hover:bg-blue-50'
                  }`}
                >
                  <div className="mt-0.5 w-6 h-6 rounded-lg bg-white shadow-xs border border-gray-200 flex items-center justify-center shrink-0">
                    {getIcon(n.notification_type)}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold ${n.is_read ? 'text-gray-800' : 'text-blue-950 font-bold'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-600 text-[11px] leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

