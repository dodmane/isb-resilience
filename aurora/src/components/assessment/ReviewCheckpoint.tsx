'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Edit3 } from 'lucide-react';

interface ReviewCheckpointProps {
  stageName: string;
  isApproved: boolean;
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
  disabled?: boolean;
}

export function ReviewCheckpoint({
  stageName,
  isApproved,
  onApprove,
  onReject,
  disabled = false,
}: ReviewCheckpointProps) {
  const [notes, setNotes] = useState('');
  const [, setMode] = useState<'review' | 'editing'>('review');

  if (isApproved) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="flex items-center gap-3 pt-6">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            {stageName} — Approved
          </span>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setMode('editing')}>
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Review Checkpoint — {stageName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Review the information above. You may edit, then approve to proceed or reject to revise.
        </p>
        <Textarea
          placeholder="Optional notes or feedback..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={() => onApprove(notes)} disabled={disabled} className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Approve &amp; Continue
        </Button>
        <Button variant="destructive" onClick={() => onReject(notes)} disabled={disabled || !notes.trim()}>
          <XCircle className="h-4 w-4 mr-1" />
          Reject
        </Button>
      </CardFooter>
    </Card>
  );
}
