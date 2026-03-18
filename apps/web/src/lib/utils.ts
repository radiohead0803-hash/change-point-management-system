import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Tailwind-safe status badge styles (avoids dynamic class purge issue)
export function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'SUBMITTED':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'REVIEW_RETURNED':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'REVIEWED':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'APPROVED':
      return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'CLOSED':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

// Status icon color for dashboard cards
export function getStatusIconClass(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'text-gray-500';
    case 'SUBMITTED':
      return 'text-blue-500';
    case 'REVIEW_RETURNED':
      return 'text-amber-500';
    case 'REVIEWED':
      return 'text-emerald-500';
    case 'APPROVED':
      return 'text-green-500';
    case 'CLOSED':
      return 'text-purple-500';
    case 'REJECTED':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'gray';
    case 'SUBMITTED':
      return 'blue';
    case 'REVIEW_RETURNED':
      return 'yellow';
    case 'REVIEWED':
      return 'green';
    case 'APPROVED':
      return 'emerald';
    case 'CLOSED':
      return 'purple';
    case 'REJECTED':
      return 'red';
    default:
      return 'gray';
  }
}

export function getStatusText(status: string) {
  switch (status) {
    case 'DRAFT':
      return '임시저장';
    case 'SUBMITTED':
      return '제출됨';
    case 'REVIEW_RETURNED':
      return '보완요청';
    case 'REVIEWED':
      return '검토완료';
    case 'APPROVED':
      return '승인완료';
    case 'CLOSED':
      return '종결';
    case 'REJECTED':
      return '반려';
    default:
      return status;
  }
}
