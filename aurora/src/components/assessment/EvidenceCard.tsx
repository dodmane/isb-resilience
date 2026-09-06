'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SourceLink } from './SourceLink';
import { type Evidence } from '@/types/evidence';
import { CheckCircle2, XCircle, AlertTriangle, FlaskConical } from 'lucide-react';

interface EvidenceCardProps {
  evidence: Evidence;
  onAccept: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onViewDetail: (evidence: Evidence) => void;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  annual_report: 'Annual Report',
  regulatory_filing: 'Regulatory Filing',
  investor_relations: 'Investor Relations',
  sustainability_report: 'Sustainability Report',
  risk_disclosure: 'Risk Disclosure',
  regulatory_publication: 'Regulatory Publication',
  research: 'Research',
  uploaded_document: 'Uploaded Document',
  other: 'Other',
};

const STATUS_CONFIG = {
  proposed: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', label: 'Proposed' },
  accepted: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Accepted' },
  rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Rejected' },
};

export function EvidenceCard({ evidence, onAccept, onReject, onViewDetail }: EvidenceCardProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const statusConf = STATUS_CONFIG[evidence.status];

  return (
    <Card className="relative card-hover shadow-sm">
      {evidence.isMock && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-600">
            <FlaskConical className="h-3 w-3" />
            Mock AI
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <Badge className={`text-xs ${statusConf.color}`}>{statusConf.label}</Badge>
          <Badge variant="outline" className="text-xs">
            {SOURCE_TYPE_LABELS[evidence.sourceType] || evidence.sourceType}
          </Badge>
        </div>
        <p className="text-sm font-medium mt-2 pr-16">{evidence.claim}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {evidence.extractedValue && (
          <div>
            <span className="text-muted-foreground">Value: </span>
            <span className="font-medium">{evidence.extractedValue}</span>
          </div>
        )}
        <div className="bg-muted/50 rounded p-2 text-xs italic">
          &ldquo;{evidence.supportingExcerpt}&rdquo;
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {evidence.sourceTitle} — {evidence.publisher}
          </span>
          <SourceLink url={evidence.sourceUrl} urlResolved={evidence.urlResolved} />
        </div>
        {evidence.status === 'rejected' && evidence.rejectionReason && (
          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
            <span>Rejected: {evidence.rejectionReason}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2 pt-0">
        <Button variant="ghost" size="sm" onClick={() => onViewDetail(evidence)}>
          Details
        </Button>
        {evidence.status === 'proposed' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => onAccept(evidence.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Accept
            </Button>
            {!showRejectInput ? (
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => setShowRejectInput(true)}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            ) : (
              <div className="flex gap-2 flex-1">
                <Textarea
                  placeholder="Reason for rejection (required)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={1}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!rejectionReason.trim()}
                  onClick={() => {
                    onReject(evidence.id, rejectionReason);
                    setShowRejectInput(false);
                    setRejectionReason('');
                  }}
                >
                  Confirm
                </Button>
              </div>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
