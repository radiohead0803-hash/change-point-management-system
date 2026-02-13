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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">정책 설정</h2>
        <Button
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

      <div className="rounded-md border">
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
    </div>
  );
}
