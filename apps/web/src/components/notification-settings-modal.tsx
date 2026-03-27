'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Settings, X, Smartphone, Monitor } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-notifications';

interface NotificationSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationSettingsModal({ open, onClose }: NotificationSettingsModalProps) {
  const { toast } = useToast();
  const [permissionState, setPermissionState] = useState<string>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!open) return;
    checkStatus();
  }, [open]);

  async function checkStatus() {
    try {
      if (!isPushSupported()) {
        setSupported(false);
        return;
      }
      setSupported(true);
      setPermissionState(getPermissionState());

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setSupported(false);
    }
  }

  async function handleEnable() {
    setLoading(true);
    try {
      const success = await subscribeToPush();
      if (success) {
        setIsSubscribed(true);
        setPermissionState('granted');
        toast({ title: '푸시 알림이 활성화되었습니다.' });
      } else {
        const perm = getPermissionState();
        setPermissionState(perm);
        if (perm === 'denied') {
          toast({
            title: '알림이 차단되어 있습니다.',
            description: '브라우저 설정에서 알림을 허용해주세요.',
            variant: 'destructive',
          });
        }
      }
    } catch {
      toast({ title: '알림 설정에 실패했습니다.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      setIsSubscribed(false);
      toast({ title: '푸시 알림이 비활성화되었습니다.' });
    } catch {
      toast({ title: '알림 해제에 실패했습니다.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold">알림 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* 푸시 알림 상태 */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${
                isSubscribed && permissionState === 'granted'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : permissionState === 'denied'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                {isSubscribed && permissionState === 'granted' ? (
                  <BellRing className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : permissionState === 'denied' ? (
                  <BellOff className="h-5 w-5 text-red-500 dark:text-red-400" />
                ) : (
                  <Bell className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {isSubscribed && permissionState === 'granted'
                    ? '푸시 알림 활성'
                    : permissionState === 'denied'
                      ? '알림 차단됨'
                      : '푸시 알림 비활성'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isSubscribed && permissionState === 'granted'
                    ? '변동점 상태 변경 시 실시간 알림을 받습니다.'
                    : permissionState === 'denied'
                      ? '브라우저 설정에서 알림을 허용해주세요.'
                      : '알림을 허용하면 실시간으로 알림을 받습니다.'}
                </p>
              </div>
            </div>

            {supported && permissionState !== 'denied' && (
              <div className="mt-3">
                {isSubscribed ? (
                  <button
                    onClick={handleDisable}
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {loading ? '처리 중...' : '알림 끄기'}
                  </button>
                ) : (
                  <button
                    onClick={handleEnable}
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '설정 중...' : '알림 허용'}
                  </button>
                )}
              </div>
            )}

            {!supported && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                이 브라우저에서는 푸시 알림을 지원하지 않습니다.
              </p>
            )}
          </div>

          {/* 알림 유형 안내 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">알림 유형</p>
            <div className="space-y-1.5">
              {[
                { icon: '🔵', label: '승인 요청', desc: '검토/승인이 요청될 때' },
                { icon: '🟢', label: '승인 완료', desc: '변동점이 승인될 때' },
                { icon: '🟠', label: '보완 요청', desc: '보완이 요청될 때' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 디바이스 정보 */}
          <div className="flex items-center gap-2 rounded-lg bg-blue-50/50 px-3 py-2 dark:bg-blue-900/10">
            {/Mobi|Android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') ? (
              <Smartphone className="h-4 w-4 text-blue-500" />
            ) : (
              <Monitor className="h-4 w-4 text-blue-500" />
            )}
            <p className="text-xs text-blue-600 dark:text-blue-400">
              알림은 이 기기에서만 수신됩니다. 다른 기기에서도 별도로 설정해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
