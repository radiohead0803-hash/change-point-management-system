'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settings } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export function PolicySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newPolicy, setNewPolicy] = useState({
    key: 'REQUIRE_96_TAG',
    value: { enabled: false },
    scopeType: 'GLOBAL',
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: () => settings.findAll().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => settings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast({ title: '정책 설정이 생성되었습니다.' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => settings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast({ title: '정책 설정이 수정되었습니다.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settings.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast({ title: '정책 설정이 삭제되었습니다.' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold sm:text-lg">정책 설정</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">96항목 필수 여부 등 점검 정책을 관리합니다</p>
        </div>
        <Button
          size="sm"
          className="w-full sm:w-auto"
          onClick={() =>
            createMutation.mutate({
              ...newPolicy,
              effectiveFrom: new Date(),
            })
          }
        >
          <Plus className="mr-1.5 h-4 w-4" />
          96항목 필수 설정 추가
        </Button>
      </div>

      {/* 데스크톱: 테이블 */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl sm:block dark:border-gray-800/60 dark:bg-gray-900/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">설정</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">값</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">범위</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">시작일</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">종료일</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {policies.map((policy) => {
              const isEnabled = JSON.parse(policy.value).enabled;
              return (
                <tr key={policy.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                  <td className="px-6 py-4 font-medium">{policy.key}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isEnabled ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {isEnabled ? '필수' : '선택'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{policy.scopeType}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(policy.effectiveFrom).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {policy.effectiveTo ? new Date(policy.effectiveTo).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateMutation.mutate({
                            id: policy.id,
                            data: { value: { enabled: !isEnabled } },
                          })
                        }
                      >
                        {isEnabled ? (
                          <ToggleRight className="mr-1.5 h-4 w-4 text-blue-500" />
                        ) : (
                          <ToggleLeft className="mr-1.5 h-4 w-4" />
                        )}
                        {isEnabled ? '선택으로' : '필수로'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => deleteMutation.mutate(policy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 리스트 */}
      <div className="space-y-3 sm:hidden">
        {policies.map((policy) => {
          const isEnabled = JSON.parse(policy.value).enabled;
          return (
            <div
              key={policy.id}
              className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{policy.key}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isEnabled ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {isEnabled ? '필수' : '선택'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground/70">범위</div>
                  <div className="text-sm">{policy.scopeType}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground/70">시작일</div>
                  <div className="text-sm">{new Date(policy.effectiveFrom).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    updateMutation.mutate({
                      id: policy.id,
                      data: { value: { enabled: !isEnabled } },
                    })
                  }
                >
                  {isEnabled ? '선택으로' : '필수로'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => deleteMutation.mutate(policy.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
