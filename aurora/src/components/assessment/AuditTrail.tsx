'use client';

import { type AuditEntry } from '@/types/audit';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditTrailProps {
  entries: AuditEntry[];
}

export function AuditTrail({ entries }: AuditTrailProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit entries yet.</p>;
  }

  return (
    <ScrollArea className="h-64">
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 text-xs border-b pb-2">
            <span className="text-muted-foreground whitespace-nowrap">
              {new Date(entry.timestamp).toLocaleString()}
            </span>
            <span className="font-medium capitalize">{entry.actor}</span>
            <span className="text-muted-foreground">{entry.action}</span>
            <span className="flex-1 truncate">{entry.reason}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
