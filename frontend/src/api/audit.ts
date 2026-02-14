import { apiGet } from './client';

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  user_id: number | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function listAuditLogs(
  userId: number,
  params?: { skip?: number; limit?: number; entity_type?: string; action?: string }
): Promise<AuditLog[]> {
  return apiGet<AuditLog[]>('audit-logs/', userId, params as Record<string, string | number | undefined>);
}
