'use client';

import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { EvidenceCard } from '@/components/assessment/EvidenceCard';
import { EvidenceDrawer } from '@/components/assessment/EvidenceDrawer';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval } from '@/types/assessment';
import { type Evidence, type EvidenceSourceType } from '@/types/evidence';
import { type AuditEntry } from '@/types/audit';
import {
  Search, Upload, Plus, AlertTriangle, CheckCircle2, XCircle, FlaskConical, FileText,
} from 'lucide-react';

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  evidence: Evidence[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function EvidenceGatheringStage({ assessment, approvals, evidence, auditTrail, onRefresh }: Props) {
  const [researching, setResearching] = useState(false);
  const [drawerEvidence, setDrawerEvidence] = useState<Evidence | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [addDimension, setAddDimension] = useState('');
  const [addSubdivision, setAddSubdivision] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add evidence form state
  const [newClaim, setNewClaim] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<EvidenceSourceType>('other');

  // Upload form state
  const [uploadClaim, setUploadClaim] = useState('');
  const [uploadDimension, setUploadDimension] = useState('');
  const [uploadSubdivision, setUploadSubdivision] = useState('');

  const stage5Approval = approvals.find(a => a.stage === 5);
  const isApproved = stage5Approval?.status === 'approved';

  const deepDimensions = useMemo(() => {
    const selected = (assessment.dimensionSelections || [])
      .filter(s => s.deepAssessment)
      .map(s => s.dimensionKey);
    return DIMENSIONS.filter(d => selected.includes(d.key));
  }, [assessment.dimensionSelections]);

  const evidenceByDimension = useMemo(() => {
    const grouped: Record<string, Evidence[]> = {};
    for (const dim of deepDimensions) {
      grouped[dim.key] = evidence.filter(e => e.dimensionKey === dim.key);
    }
    return grouped;
  }, [evidence, deepDimensions]);

  const stats = useMemo(() => {
    const total = evidence.length;
    const accepted = evidence.filter(e => e.status === 'accepted').length;
    const rejected = evidence.filter(e => e.status === 'rejected').length;
    const pending = evidence.filter(e => e.status === 'proposed').length;
    const mock = evidence.filter(e => e.isMock).length;
    return { total, accepted, rejected, pending, mock };
  }, [evidence]);

  async function runResearch() {
    setResearching(true);
    try {
      await fetch(`/api/assessments/${assessment.id}/research`, { method: 'POST' });
      await onRefresh();
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setResearching(false);
    }
  }

  async function handleEvidenceAccept(evidenceId: string) {
    await fetch(`/api/assessments/${assessment.id}/evidence/${evidenceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    });
    await onRefresh();
  }

  async function handleEvidenceReject(evidenceId: string, reason: string) {
    await fetch(`/api/assessments/${assessment.id}/evidence/${evidenceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
    });
    await onRefresh();
  }

  async function handleAddEvidence() {
    if (!newClaim.trim() || !addDimension) return;
    await fetch(`/api/assessments/${assessment.id}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: newClaim,
        extractedValue: newValue,
        supportingExcerpt: newExcerpt,
        sourceTitle: newSourceTitle,
        publisher: newPublisher,
        sourceUrl: newSourceUrl || null,
        sourceType: newSourceType,
        dimensionKey: addDimension,
        subdivisionKey: addSubdivision || null,
      }),
    });
    resetAddForm();
    setShowAddDialog(false);
    await onRefresh();
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !uploadDimension) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dimensionKey', uploadDimension);
    if (uploadSubdivision) formData.append('subdivisionKey', uploadSubdivision);
    if (uploadClaim) formData.append('claim', uploadClaim);

    await fetch(`/api/assessments/${assessment.id}/upload`, {
      method: 'POST',
      body: formData,
    });
    resetUploadForm();
    setShowUploadDialog(false);
    await onRefresh();
  }

  function resetAddForm() {
    setNewClaim(''); setNewValue(''); setNewExcerpt('');
    setNewSourceTitle(''); setNewPublisher(''); setNewSourceUrl('');
    setNewSourceType('other'); setAddDimension(''); setAddSubdivision('');
  }

  function resetUploadForm() {
    setUploadClaim(''); setUploadDimension(''); setUploadSubdivision('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleApprove(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 5, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 5, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  const hasMissingEvidence = deepDimensions.some(dim => {
    const subs = SUBDIVISIONS[dim.key as DimensionKey];
    return subs.some(sub => {
      const subEvidence = evidence.filter(
        e => e.dimensionKey === dim.key && e.subdivisionKey === sub.key && e.status !== 'rejected'
      );
      return subEvidence.length === 0;
    });
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Evidence Gathering</h2>
        <p className="text-muted-foreground">
          Gather, review and classify evidence for each dimension and subdivision.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runResearch} disabled={researching}>
          <Search className="h-4 w-4 mr-1" />
          {researching ? 'Researching...' : 'Find More Evidence'}
        </Button>
        <Button variant="outline" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Evidence
        </Button>
        <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-1" />
          Upload Document
        </Button>

        <div className="ml-auto flex gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            {stats.accepted} accepted
          </Badge>
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            {stats.rejected} rejected
          </Badge>
          <Badge variant="outline" className="gap-1">
            {stats.pending} pending
          </Badge>
          {stats.mock > 0 && (
            <Badge variant="outline" className="gap-1 border-amber-300 text-amber-600">
              <FlaskConical className="h-3 w-3" />
              {stats.mock} mock
            </Badge>
          )}
        </div>
      </div>

      {hasMissingEvidence && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Missing Evidence</p>
            <p className="text-amber-700 dark:text-amber-300 text-xs">
              Some subdivisions have no evidence. Use &ldquo;Find More Evidence&rdquo;, add manually,
              or leave unscored if insufficient evidence exists.
            </p>
          </div>
        </div>
      )}

      {/* Evidence grouped by dimension → subdivision */}
      {deepDimensions.map(dim => {
        const dimEvidence = evidenceByDimension[dim.key] || [];
        const subs = SUBDIVISIONS[dim.key as DimensionKey];

        return (
          <Card key={dim.key}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-muted-foreground">{dim.number}.</span>
                {dim.name}
                <Badge variant="outline" className="ml-auto text-xs">
                  {dimEvidence.length} items
                </Badge>
              </CardTitle>
              <CardDescription>{dim.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subs.map(sub => {
                const subEvidence = dimEvidence.filter(e => e.subdivisionKey === sub.key);
                const activeEvidence = subEvidence.filter(e => e.status !== 'rejected');
                const hasEvidence = activeEvidence.length > 0;

                return (
                  <div key={sub.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{sub.name}</p>
                      {!hasEvidence && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          No evidence
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {activeEvidence.length} active
                      </Badge>
                    </div>

                    {subEvidence.length > 0 ? (
                      <div className="space-y-2 ml-6">
                        {subEvidence.map(ev => (
                          <EvidenceCard
                            key={ev.id}
                            evidence={ev}
                            onAccept={handleEvidenceAccept}
                            onReject={handleEvidenceReject}
                            onViewDetail={setDrawerEvidence}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="ml-6 p-3 border border-dashed rounded text-sm text-muted-foreground">
                        No evidence gathered for this subdivision.
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              setAddDimension(dim.key);
                              setAddSubdivision(sub.key);
                              setShowAddDialog(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Evidence
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              setUploadDimension(dim.key);
                              setUploadSubdivision(sub.key);
                              setShowUploadDialog(true);
                            }}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Evidence not assigned to a specific subdivision */}
              {dimEvidence.filter(e => !e.subdivisionKey).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">General (no subdivision)</p>
                  <div className="space-y-2 ml-6">
                    {dimEvidence.filter(e => !e.subdivisionKey).map(ev => (
                      <EvidenceCard
                        key={ev.id}
                        evidence={ev}
                        onAccept={handleEvidenceAccept}
                        onReject={handleEvidenceReject}
                        onViewDetail={setDrawerEvidence}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add Evidence Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Evidence</DialogTitle>
            <DialogDescription>
              Manually add an evidence item with source details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Dimension</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-background"
                value={addDimension}
                onChange={e => { setAddDimension(e.target.value); setAddSubdivision(''); }}
              >
                <option value="">Select dimension...</option>
                {deepDimensions.map(d => (
                  <option key={d.key} value={d.key}>{d.number}. {d.name}</option>
                ))}
              </select>
            </div>
            {addDimension && (
              <div>
                <Label>Subdivision</Label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                  value={addSubdivision}
                  onChange={e => setAddSubdivision(e.target.value)}
                >
                  <option value="">General (no subdivision)</option>
                  {SUBDIVISIONS[addDimension as DimensionKey]?.map(s => (
                    <option key={s.key} value={s.key}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Claim</Label>
              <Textarea value={newClaim} onChange={e => setNewClaim(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Extracted Value</Label>
              <Input value={newValue} onChange={e => setNewValue(e.target.value)} />
            </div>
            <div>
              <Label>Supporting Excerpt</Label>
              <Textarea value={newExcerpt} onChange={e => setNewExcerpt(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Source Title</Label>
                <Input value={newSourceTitle} onChange={e => setNewSourceTitle(e.target.value)} />
              </div>
              <div>
                <Label>Publisher</Label>
                <Input value={newPublisher} onChange={e => setNewPublisher(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Source URL</Label>
              <Input
                value={newSourceUrl}
                onChange={e => setNewSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Source Type</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-background"
                value={newSourceType}
                onChange={e => setNewSourceType(e.target.value as EvidenceSourceType)}
              >
                <option value="annual_report">Annual Report</option>
                <option value="regulatory_filing">Regulatory Filing</option>
                <option value="investor_relations">Investor Relations</option>
                <option value="sustainability_report">Sustainability Report</option>
                <option value="risk_disclosure">Risk Disclosure</option>
                <option value="regulatory_publication">Regulatory Publication</option>
                <option value="research">Research</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { resetAddForm(); setShowAddDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAddEvidence} disabled={!newClaim.trim() || !addDimension}>
              Add Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document as evidence for a specific dimension/subdivision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>File</Label>
              <Input type="file" ref={fileInputRef} />
            </div>
            <div>
              <Label>Dimension</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-background"
                value={uploadDimension}
                onChange={e => { setUploadDimension(e.target.value); setUploadSubdivision(''); }}
              >
                <option value="">Select dimension...</option>
                {deepDimensions.map(d => (
                  <option key={d.key} value={d.key}>{d.number}. {d.name}</option>
                ))}
              </select>
            </div>
            {uploadDimension && (
              <div>
                <Label>Subdivision</Label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                  value={uploadSubdivision}
                  onChange={e => setUploadSubdivision(e.target.value)}
                >
                  <option value="">General</option>
                  {SUBDIVISIONS[uploadDimension as DimensionKey]?.map(s => (
                    <option key={s.key} value={s.key}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Claim / Description</Label>
              <Input
                value={uploadClaim}
                onChange={e => setUploadClaim(e.target.value)}
                placeholder="What does this document evidence?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { resetUploadForm(); setShowUploadDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!uploadDimension}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit Trail ({auditTrail.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="audit">
          <AuditTrail entries={auditTrail} />
        </TabsContent>
      </Tabs>

      <Separator />
      <ReviewCheckpoint
        stageName="Gathered Evidence"
        isApproved={isApproved}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <EvidenceDrawer
        evidence={drawerEvidence}
        open={!!drawerEvidence}
        onClose={() => setDrawerEvidence(null)}
      />
    </div>
  );
}
