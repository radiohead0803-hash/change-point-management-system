'use client';

import {
  BookOpen, Users, ArrowDownUp, ClipboardCheck, FileSpreadsheet,
  Shield, AlertCircle, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const sections = [
  {
    id: 'overview',
    icon: BookOpen,
    title: '시스템 개요',
    content: [
      '변동점 관리시스템은 부품 품질 일관성 확보를 위한 신차개발-양산 연속적인 변동점 관리 방안을 제공합니다.',
      '기존 4M(Man, Machine, Material, Method)뿐만 아니라 신차개발 및 양산단계에서 발생할 수 있는 모든 일상 제조공정 변동사항을 포괄하는 개념으로 관리합니다.',
      '4M/ISIR 신고 범위 외에도 모든 변동점이 품질문제를 초래할 수 있으므로, 변동점 담당제 시행을 통한 관리/점검이 필요합니다.',
    ],
  },
  {
    id: 'roles',
    icon: Users,
    title: '역할 및 권한',
    content: [
      '관리자 (ADMIN): 시스템 전체 관리, 기초정보 편집, 모든 변동점 승인/반려, 사용자 관리',
      '담당자 (TIER1_EDITOR/REVIEWER): 변동점 등록 및 1차 검토, 주단위 점검결과 종합',
      '협력사 (TIER2_EDITOR): 변동점 등록 및 수정, 일일 점검 실시',
      '전담중역 (EXEC_APPROVER): 최종 승인, 사장님 보고용 매주 점검',
      '고객사 뷰어 (CUSTOMER_VIEWER): 승인된 변동점 조회 전용',
    ],
  },
  {
    id: 'process',
    icon: ArrowDownUp,
    title: '프로세스 흐름',
    steps: [
      { step: '1', title: '변동점 등록', desc: '협력사 또는 담당자가 변동점 발생 내용을 등록합니다.' },
      { step: '2', title: '일일 점검', desc: '변동점 관리 실무부서(관리자)가 매일 점검합니다.' },
      { step: '3', title: '주 단위 종합', desc: '주 단위 점검결과를 종합하여 전담 중역에게 보고합니다.' },
      { step: '4', title: '매주 점검', desc: '변동점 전담 중역(사장님 보고)이 매주 점검합니다.' },
      { step: '5', title: '월 단위 제출', desc: '월 단위 점검결과를 HMC/KIA 개발에 제출합니다 (매월 5일).' },
      { step: '6', title: '피드백', desc: '고객사 개발담당 피드백을 반영합니다.' },
    ],
  },
  {
    id: 'classification',
    icon: ClipboardCheck,
    title: '변동점 분류 체계',
    content: [
      '4M 필수 신고 변동점 (17항목): MAN(2), MACHINE(2), MATERIAL(5), METHOD(8)',
      '→ VAATZ - 4M 신고 시스템을 통해 신고 필수',
      '',
      '4M외 관리대상 변동점 (17항목): 작업자(3), 설비/공구(2), 공장조건(4), 소모품/윤활관리(3), 공정외(3), 2/3차사(1), 기타(1)',
      '→ 변동점 담당제를 통한 일관성 확보 및 문제 최소화',
      '',
      '96항목 세부 점검: 신기술(3) + 집중관리(9) + 신규&변동(84항목)',
      '→ 11개 대분류: 품목, 협력사, 사양/기능, 공법, 소재, 구조, 공정, 칼라/표면처리, 스펙/법규, 소프트웨어, 기타',
    ],
  },
  {
    id: 'required-fields',
    icon: FileSpreadsheet,
    title: '필수 작성 항목 (발생 & 조치결과)',
    columns: [
      { header: '발생내역', fields: ['발생일', '발생항목', '발생부서', '담당자'] },
      { header: '조치결과', fields: ['조치시점', '조치방안', '조치결과', '품질검증'] },
    ],
  },
  {
    id: 'guidelines',
    icon: Shield,
    title: '관리 기준',
    content: [
      '점검 대상: 모든 사내 + 2차사의 양산 제조공정의 변동점',
      '점검 주기: 양산 후 2회 (SOP+6M / 12M)',
      '점검 방식: 전 품목 대상 서류점검 후 선별 현장점검',
      '제출처/기한: 부품개발혁신추진팀 + 담당 개발, 구매 담당 / 매월 5일',
      '',
      '협력사 당부사항:',
      '1. 양산 후 품질관리 연속성 확보 및 유명무실 항목의 재점검을 통한 경각심 제고',
      '2. 형식적인 점검이 아닌, 실질적인 제조공정 점검을 통한 변동점 최소화',
    ],
  },
];

export default function HelpPage() {
  const [expandedId, setExpandedId] = useState<string | null>('overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">도움말 / 관리 기준</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          변동점 담당제 운영 가이드 및 시스템 사용 안내
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedId === section.id;

          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50/80 sm:p-5 dark:hover:bg-gray-800/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="flex-1 text-sm font-semibold">{section.title}</h3>
                <ChevronRight
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 p-5 dark:border-gray-800">
                  {/* 일반 텍스트 내용 */}
                  {section.content && (
                    <div className="space-y-2">
                      {section.content.map((line, i) =>
                        line === '' ? (
                          <div key={i} className="h-2" />
                        ) : (
                          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                            {line.startsWith('→') ? (
                              <span className="ml-4 text-xs text-primary">{line}</span>
                            ) : (
                              line
                            )}
                          </p>
                        ),
                      )}
                    </div>
                  )}

                  {/* 프로세스 스텝 */}
                  {section.steps && (
                    <div className="space-y-3">
                      {section.steps.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {step.step}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{step.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 필수 작성 항목 테이블 */}
                  {section.columns && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">NO</th>
                            {section.columns.map((col) => (
                              <th
                                key={col.header}
                                colSpan={col.fields.length}
                                className="px-3 py-2 text-center text-xs font-semibold"
                              >
                                {col.header}
                              </th>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="px-3 py-2"></th>
                            {section.columns.flatMap((col) =>
                              col.fields.map((f) => (
                                <th
                                  key={f}
                                  className="px-3 py-2 text-center text-xs font-medium text-muted-foreground"
                                >
                                  {f}
                                </th>
                              )),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-3 text-center text-xs text-muted-foreground">1</td>
                            {section.columns.flatMap((col) =>
                              col.fields.map((f) => (
                                <td key={f} className="px-3 py-3 text-center">
                                  <div className="mx-auto h-6 w-16 rounded border border-dashed border-gray-200 dark:border-gray-700" />
                                </td>
                              )),
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
