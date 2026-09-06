'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SourceLink } from './SourceLink';
import { type Evidence } from '@/types/evidence';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { FlaskConical } from 'lucide-react';

interface EvidenceDrawerProps {
  evidence: Evidence | null;
  open: boolean;
  onClose: () => void;
}

export function EvidenceDrawer({ evidence, open, onClose }: EvidenceDrawerProps) {
  if (!evidence) return null;

  const dimension = DIMENSIONS.find((d) => d.key === evidence.dimensionKey);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Evidence Detail
            {evidence.isMock && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-300 text-amber-600">
                <FlaskConical className="h-3 w-3" />
                Mock AI
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>{evidence.claim}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <Section label="Claim">{evidence.claim}</Section>
          <Section label="Extracted Value">{evidence.extractedValue}</Section>
          <Section label="Supporting Excerpt">
            <blockquote className="border-l-2 pl-3 italic text-sm text-muted-foreground">
              {evidence.supportingExcerpt}
            </blockquote>
          </Section>

          <Separator />

          <Section label="Source Title">{evidence.sourceTitle}</Section>
          <Section label="Publisher">{evidence.publisher}</Section>
          <Section label="Source Type">
            <Badge variant="outline" className="text-xs">{evidence.sourceType}</Badge>
          </Section>
          <Section label="Original Source">
            <SourceLink url={evidence.sourceUrl} urlResolved={evidence.urlResolved} title="Open Original Source" />
          </Section>
          {evidence.publicationDate && (
            <Section label="Publication Date">{evidence.publicationDate}</Section>
          )}
          <Section label="Retrieved">{new Date(evidence.retrievalTimestamp).toLocaleDateString()}</Section>
          {evidence.pageNumber && (
            <Section label="Page">{evidence.pageNumber}</Section>
          )}

          <Separator />

          <Section label="AURORA Dimension">
            {dimension ? `${dimension.number}. ${dimension.name}` : evidence.dimensionKey}
          </Section>
          {evidence.subdivisionKey && (
            <Section label="Subdivision">{evidence.subdivisionKey}</Section>
          )}
          <Section label="Status">
            <Badge
              className={
                evidence.status === 'accepted'
                  ? 'bg-green-100 text-green-800'
                  : evidence.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
              }
            >
              {evidence.status}
            </Badge>
          </Section>
          {evidence.rejectionReason && (
            <Section label="Rejection Reason">
              <p className="text-sm text-red-600">{evidence.rejectionReason}</p>
            </Section>
          )}
          <Section label="Origin">{evidence.sourceOrigin.replace(/_/g, ' ')}</Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
