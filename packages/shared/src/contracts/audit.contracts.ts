export interface AuditLogResponse {
  id: string;
  tenantId: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
