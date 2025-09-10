import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';

const NotificationBell: React.FC = () => {
  const auth = useContext(AuthContext);
  const data = useContext(DataContext);
  const userId = auth?.user?.userId;

  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const myNotifications = useMemo(
    () => (data?.notifications || []).filter(n => n.userId === userId),
    [data?.notifications, userId]
  );

  const unread = useMemo(
    () => myNotifications.filter(n => !n.isRead),
    [myNotifications]
  );

  const unreadCount = unread.length;
  const badge = unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : `${unreadCount}`;

  // Close dropdown on outside click / ESC
  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // When opened, mark all unread as read (so badge disappears)
  useEffect(() => {
    if (!open || unread.length === 0) return;
    unread.forEach(n => data?.readNotification(n.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Show newest first (if you later add timestamps, sort by them)
  const items = [...myNotifications].reverse().slice(0, 10);

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-royal-blue"
      >
        <Bell className="w-6 h-6 text-royal-blue" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                       rounded-full bg-red-600 text-white text-[10px]
                       flex items-center justify-center font-bold"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[320px] rounded-lg border bg-white shadow-lg z-50"
        >
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="font-semibold text-royal-blue">Notifications</div>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-500">{unreadCount} new</span>
            )}
          </div>

          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                You’re all caught up!
              </div>
            ) : (
              <ul className="divide-y">
                {items.map(n => (
                  <li key={n.id} className="px-4 py-3 hover:bg-gray-50">
                    <p className="text-sm text-gray-800">{n.message}</p>
                    {!n.isRead && (
                      <span className="mt-1 inline-block text-[10px] font-semibold text-red-600">
                        new
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
