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
