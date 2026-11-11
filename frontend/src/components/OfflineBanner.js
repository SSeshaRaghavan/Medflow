import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div className="bg-emerald-600 text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2 transition-all shadow-md z-50">
        <Wifi size={14} /> Back online! All changes and queue statuses are synchronized.
      </div>
    );
  }

  return (
    <div className="bg-amber-600 text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2 transition-all shadow-md z-50">
      <WifiOff size={14} className="animate-pulse" />
      <span>
        <strong>Offline Mode Active:</strong> Network disconnected. Local cache is active; prescription drafts will be preserved and synchronized upon reconnection.
      </span>
    </div>
  );
}

