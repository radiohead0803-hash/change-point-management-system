'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { users } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { User as UserIcon, Lock, Phone, Building2, Shield } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  TIER1_EDITOR: '캠스 담당자',
  TIER1_REVIEWER: '중역',
  EXEC_APPROVER: '전담중역',
  TIER2_EDITOR: '협력사 담당자',
  CUSTOMER_VIEWER: '고객사 뷰어',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => users.getMyProfile().then((res) => res.data),
  });

  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setTeam((profile as any).team || '');
      setPosition((profile as any).position || '');
      setPhone((profile as any).phone || '');
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: (data: any) => users.updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      refreshUser(); // 사이드바 등 전역 사용자 정보 동기화
      toast({ title: '프로필이 수정되었습니다.' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: '수정 실패' });
    },
  });

  const handleSaveProfile = () => {
    updateProfile.mutate({ name, team, position, phone });
  };

  const handleChangePassword = () => {
    if (!newPassword) {
      toast({ variant: 'destructive', title: '새 비밀번호를 입력해주세요.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: '비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (newPassword.length < 4) {
      toast({ variant: 'destructive', title: '비밀번호는 4자리 이상이어야 합니다.' });
      return;
    }
    updateProfile.mutate({ password: newPassword }, {
      onSuccess: () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast({ title: '비밀번호가 변경되었습니다.' });
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">내 프로필</h1>
        <p className="mt-1 text-sm text-muted-foreground">개인정보 및 비밀번호를 관리합니다.</p>
      </div>

      {/* 계정 정보 (읽기 전용) */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          계정 정보
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">아이디</label>
            <div className="rounded-xl border border-input bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800">
              {profile?.email || user?.email}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">역할</label>
            <div className="rounded-xl border border-input bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800">
              {ROLE_LABELS[profile?.role || user?.role || ''] || user?.role}
            </div>
          </div>
          {(profile as any)?.company && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">소속 회사</label>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {(profile as any).company.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 개인정보 수정 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-primary" />
          개인정보 수정
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">이름</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">팀/부서</label>
            <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="품질관리팀" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">직급</label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="과장" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">전화번호</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
            정보 저장
          </Button>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-4 text-sm font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          비밀번호 변경
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">새 비밀번호</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호 입력"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">비밀번호 확인</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 재입력"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleChangePassword} disabled={updateProfile.isPending}>
            비밀번호 변경
          </Button>
        </div>
      </div>
    </div>
  );
}
