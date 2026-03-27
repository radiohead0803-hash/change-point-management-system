'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { isPushSupported, getPermissionState, subscribeToPush } from '@/lib/push-notifications';

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;

    const permission = getPermissionState();
    const dismissed = sessionStorage.getItem('push-prompt-dismissed');

    if (permission === 'default' && !dismissed) {
      // 약간의 지연 후 표시
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleAllow = async () => {
    setLoading(true);
    await subscribeToPush();
    setVisible(false);
    setLoading(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('push-prompt-dismissed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300 md:left-auto md:right-4">
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-white p-4 shadow-lg dark:border-blue-800 dark:bg-gray-900">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            알림을 허용하시겠습니까?
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            승인 요청, 검토 결과 등을 실시간으로 받아보세요.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAllow}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '설정 중...' : '알림 허용'}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              나중에
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
