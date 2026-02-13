export type Role =
  | 'ADMIN'
  | 'TIER1_EDITOR'
  | 'TIER2_EDITOR'
  | 'TIER1_REVIEWER'
  | 'EXEC_APPROVER'
  | 'CUSTOMER_VIEWER';

export type ChangeType = 'FOUR_M' | 'NON_FOUR_M';

export type EventStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REVIEW_RETURNED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'CLOSED'
  | 'REJECTED';

export type ItemType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'NUMBER' | 'DATE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId?: string;
  company?: Company;
}

export interface Company {
  id: string;
  name: string;
  type: 'TIER1' | 'TIER2' | 'CUSTOMER';
  code: string;
}

export interface ChangeEvent {
  id: string;
  receiptMonth: string;
  occurredDate: string;
  customer: string;
  project: string;
  productLine: string;
  partNumber: string;
  factory: string;
  productionLine: string;
  companyId: string;
  company: Company;
  changeType: ChangeType;
  category: string;
  subCategory: string;
  description: string;
  department: string;
  status: EventStatus;
  managerId: string;
  manager: User;
  executiveId?: string;
  executive?: User;
  reviewerId?: string;
  reviewer?: User;
  primaryItemId?: string;
  tags?: Array<{ itemId: string; tagType: 'PRIMARY' | 'TAG' }>;
  inspectionResults: InspectionResult[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy: User;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  version: string;
  isActive: boolean;
  items: InspectionItem[];
}

export interface InspectionItem {
  id: string;
  templateId: string;
  order: number;
  category: string;
  question: string;
  type: ItemType;
  required: boolean;
  options: string[];
}

export interface InspectionResult {
  id: string;
  eventId: string;
  itemId: string;
  item: InspectionItem;
  value: string;
}

export interface Attachment {
  id: string;
  eventId: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
}
