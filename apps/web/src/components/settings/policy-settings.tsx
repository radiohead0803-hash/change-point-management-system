'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settings } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function PolicySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newPolicy, setNewPolicy] = useState({
    key: 'REQUIRE_96_TAG',
    value: { enabled: false },
    scopeType: 'GLOBAL',
  });

  // 정책 설정 목록 조회
  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: () => settings.findAll().then((res) => res.data),
  });

  // 정책 설정 생성
  const createMutation = useMutation({
    mutationFn: (data: any) => settings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast({
        title: '정책 설정이 생성되었습니다.',
      });
    },
  });

  // 정책 설정 수정
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => settings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast({
        title: '정책 설정이 수정되었습니다.',
      });
    },
  });

  // 정책 설정 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: string) => settings.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast({
        title: '정책 설정이 삭제되었습니다.',
      });
    },
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-medium sm:text-lg">정책 설정</h2>
        <Button
          size="sm"
          className="w-full sm:w-auto sm:size-default"
          onClick={() =>
            createMutation.mutate({
              ...newPolicy,
              effectiveFrom: new Date(),
            })
          }
        >
          96항목 필수 설정 추가
        </Button>
      </div>

      {/* 데스크톱: 테이블 */}
      <div className="hidden rounded-md border sm:block">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-4 text-left">설정</th>
              <th className="p-4 text-left">값</th>
              <th className="p-4 text-left">범위</th>
              <th className="p-4 text-left">시작일</th>
              <th className="p-4 text-left">종료일</th>
              <th className="p-4 text-left">작업</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id} className="border-b">
                <td className="p-4">{policy.key}</td>
                <td className="p-4">
                  {JSON.parse(policy.value).enabled ? '필수' : '선택'}
                </td>
                <td className="p-4">{policy.scopeType}</td>
                <td className="p-4">
                  {new Date(policy.effectiveFrom).toLocaleDateString()}
                </td>
                <td className="p-4">
                  {policy.effectiveTo
                    ? new Date(policy.effectiveTo).toLocaleDateString()
                    : '-'}
                </td>
                <td className="p-4">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          id: policy.id,
                          data: {
                            value: {
                              enabled: !JSON.parse(policy.value).enabled,
                            },
                          },
                        })
                      }
                    >
                      {JSON.parse(policy.value).enabled ? '선택으로 변경' : '필수로 변경'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(policy.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 리스트 */}
      <div className="space-y-3 sm:hidden">
        {policies.map((policy) => (
          <div key={policy.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{policy.key}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${JSON.parse(policy.value).enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                {JSON.parse(policy.value).enabled ? '필수' : '선택'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>범위: {policy.scopeType}</div>
              <div>시작: {new Date(policy.effectiveFrom).toLocaleDateString()}</div>
              <div>종료: {policy.effectiveTo ? new Date(policy.effectiveTo).toLocaleDateString() : '-'}</div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() =>
                  updateMutation.mutate({
                    id: policy.id,
                    data: {
                      value: {
                        enabled: !JSON.parse(policy.value).enabled,
                      },
                    },
                  })
                }
              >
                {JSON.parse(policy.value).enabled ? '선택으로' : '필수로'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(policy.id)}
              >
                삭제
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
