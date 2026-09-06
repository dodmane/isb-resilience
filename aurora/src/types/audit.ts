export interface AuditEntry {
  id: string;
  assessmentId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  actor: 'user' | 'system';
  timestamp: string;
}
