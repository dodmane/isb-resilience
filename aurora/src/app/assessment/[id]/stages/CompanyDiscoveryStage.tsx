'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { EvidenceCard } from '@/components/assessment/EvidenceCard';
import { EvidenceDrawer } from '@/components/assessment/EvidenceDrawer';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import {
  type Assessment,
  type StageApproval,
  type CompanySize,
} from '@/types/assessment';
import { type Evidence, type EvidenceSourceType } from '@/types/evidence';
import { type AuditEntry } from '@/types/audit';
import { Search, Building2, FlaskConical, CheckCheck } from 'lucide-react';

interface EvidenceEditDraft {
  claim: string;
  extractedValue: string;
  supportingExcerpt: string;
  sourceTitle: string;
  publisher: string;
  sourceUrl: string;
  sourceType: EvidenceSourceType;
  publicationDate: string;
  dimensionKey: string;
}

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  evidence: Evidence[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function CompanyDiscoveryStage({
  assessment,
  approvals,
  evidence,
  auditTrail,
  onRefresh,
}: Props) {
  const [companyName, setCompanyName] = useState(assessment.companyName);
  const [description, setDescription] = useState(assessment.companyDescription);
  const [industry, setIndustry] = useState(assessment.industry);
  const [companySize, setCompanySize] = useState<CompanySize | null>(assessment.companySize);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState(!!assessment.companyDescription);
  const [drawerEvidence, setDrawerEvidence] = useState<Evidence | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [editDraft, setEditDraft] = useState<EvidenceEditDraft | null>(null);
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [acceptingAll, setAcceptingAll] = useState(false);
  const [evidenceActionError, setEvidenceActionError] = useState('');

  function startEvidenceEdit(item: Evidence) {
    setEditingEvidence(item);
    setEditDraft({
      claim: item.claim,
      extractedValue: item.extractedValue,
      supportingExcerpt: item.supportingExcerpt,
      sourceTitle: item.sourceTitle,
      publisher: item.publisher,
      sourceUrl: item.sourceUrl || '',
      sourceType: item.sourceType,
      publicationDate: item.publicationDate || '',
      dimensionKey: item.dimensionKey,
    });
    setEvidenceActionError('');
  }

  async function saveEvidenceEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEvidence || !editDraft) return;
    setSavingEvidence(true);
    setEvidenceActionError('');
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/evidence/${editingEvidence.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editDraft,
          sourceUrl: editDraft.sourceUrl.trim() || null,
          publicationDate: editDraft.publicationDate || null,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not update evidence');
      setEditingEvidence(null);
      setEditDraft(null);
      await onRefresh();
    } catch (err) {
      setEvidenceActionError(err instanceof Error ? err.message : 'Could not update evidence');
    } finally {
      setSavingEvidence(false);
    }
  }

  const stage1Approval = approvals.find((a) => a.stage === 1);
  const isApproved = stage1Approval?.status === 'approved';
  const usedDiscoveryFallback = assessment.discoveryIsMock ?? evidence.some(item => item.isMock);

  async function runDiscovery() {
    setDiscovering(true);
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      });
      const data = await res.json();
      setDescription(data.profile.companyDescription);
      setIndustry(data.profile.industry);
      setCompanySize(data.profile.companySize);
      setDiscovered(true);
      await onRefresh();
    } catch (err) {
      console.error('Discovery failed:', err);
    } finally {
      setDiscovering(false);
    }
  }

  async function saveProfile() {
    await fetch(`/api/assessments/${assessment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName,
        companyDescription: description,
        industry,
        companySize,
      }),
    });
    await onRefresh();
  }

  async function handleApprove(notes: string) {
    await saveProfile();
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 1, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 1, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  async function handleEvidenceAccept(evidenceId: string) {
    const response = await fetch(`/api/assessments/${assessment.id}/evidence/${evidenceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    });
    if (!response.ok) {
      setEvidenceActionError('Could not accept this evidence. Please try again.');
      return;
    }
    setEvidenceActionError('');
    await onRefresh();
  }

  async function handleAcceptAllEvidence() {
    const pendingEvidence = evidence.filter(item => item.status === 'proposed');
    if (!pendingEvidence.length) return;

    setAcceptingAll(true);
    setEvidenceActionError('');
    try {
      const results = await Promise.allSettled(pendingEvidence.map(async item => {
        const response = await fetch(`/api/assessments/${assessment.id}/evidence/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'accepted' }),
        });
        if (!response.ok) throw new Error(`Could not accept evidence ${item.id}`);
      }));
      await onRefresh();
      const failedCount = results.filter(result => result.status === 'rejected').length;
      if (failedCount) setEvidenceActionError(`Could not accept ${failedCount} of ${pendingEvidence.length} evidence items. You can retry the remaining items.`);
    } catch {
      setEvidenceActionError('Could not refresh the evidence list after accepting items.');
    } finally {
      setAcceptingAll(false);
    }
  }

  async function handleEvidenceReject(evidenceId: string, reason: string) {
    await fetch(`/api/assessments/${assessment.id}/evidence/${evidenceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
    });
    await onRefresh();
  }

  const SIZES: { value: CompanySize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Company Discovery</h2>
        <p className="text-muted-foreground">
          Identify the company and gather initial profile information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Profile
          </CardTitle>
          <CardDescription>
            Enter the company name and run discovery, or fill in details manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={runDiscovery} disabled={discovering || !companyName.trim()}>
                <Search className="h-4 w-4 mr-1" />
                {discovering ? 'Discovering...' : 'Discover Company'}
              </Button>
            </div>
          </div>

          {discovered && usedDiscoveryFallback && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <FlaskConical className="h-3.5 w-3.5" />
                <span>
                  Some results used heuristic fallback. If unexpected, check that the API key or proxy token is valid for the configured base URL.
                </span>
              </div>
          )}

          {discovered && (
            <>
              <div>
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Company Size</Label>
                  <div className="flex gap-2 mt-2">
                    {SIZES.map((s) => (
                      <Button
                        key={s.value}
                        variant={companySize === s.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCompanySize(s.value)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">Lens: {assessment.assessmentLens}</Badge>
                <Badge variant="outline">Data: {assessment.dataSourceMode}</Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {discovered && (
        <Tabs defaultValue="evidence">
          <TabsList>
            <TabsTrigger value="evidence">
              Evidence ({evidence.length})
            </TabsTrigger>
            <TabsTrigger value="audit">
              Audit Trail ({auditTrail.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evidence" className="space-y-4">
            {evidenceActionError && <p role="alert" className="text-sm text-destructive">{evidenceActionError}</p>}
            {evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No evidence gathered yet. Run company discovery to generate initial evidence.
              </p>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={handleAcceptAllEvidence}
                    disabled={acceptingAll || !evidence.some(item => item.status === 'proposed')}>
                    <CheckCheck className="h-4 w-4 mr-1" />
                    {acceptingAll ? 'Accepting evidence...' : `Accept all pending (${evidence.filter(item => item.status === 'proposed').length})`}
                  </Button>
                </div>
                {evidence.map((ev) => (
                  <EvidenceCard
                    key={ev.id}
                    evidence={ev}
                    onAccept={handleEvidenceAccept}
                    onReject={handleEvidenceReject}
                    onViewDetail={setDrawerEvidence}
                    onEdit={startEvidenceEdit}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrail entries={auditTrail} />
          </TabsContent>
        </Tabs>
      )}

      {discovered && (
        <>
          <Separator />
          <ReviewCheckpoint
            stageName="Company Discovery"
            isApproved={isApproved}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </>
      )}

      <EvidenceDrawer
        evidence={drawerEvidence}
        open={!!drawerEvidence}
        onClose={() => setDrawerEvidence(null)}
      />

      <Dialog open={!!editingEvidence} onOpenChange={open => { if (!open && !savingEvidence) { setEditingEvidence(null); setEditDraft(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit accepted evidence</DialogTitle>
            <DialogDescription>Update the accepted claim or its supporting source details. The edit will be recorded in the audit trail.</DialogDescription>
          </DialogHeader>
          {editDraft && (
            <form className="space-y-4" onSubmit={saveEvidenceEdit}>
              <div className="space-y-2">
                <Label htmlFor="evidence-edit-claim">Claim</Label>
                <Input id="evidence-edit-claim" value={editDraft.claim} required
                  onChange={event => setEditDraft({ ...editDraft, claim: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidence-edit-value">Extracted value</Label>
                <Input id="evidence-edit-value" value={editDraft.extractedValue}
                  onChange={event => setEditDraft({ ...editDraft, extractedValue: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidence-edit-excerpt">Supporting excerpt</Label>
                <Textarea id="evidence-edit-excerpt" value={editDraft.supportingExcerpt} rows={3}
                  onChange={event => setEditDraft({ ...editDraft, supportingExcerpt: event.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="evidence-edit-source-title">Source title</Label>
                  <Input id="evidence-edit-source-title" value={editDraft.sourceTitle}
                    onChange={event => setEditDraft({ ...editDraft, sourceTitle: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evidence-edit-publisher">Publisher</Label>
                  <Input id="evidence-edit-publisher" value={editDraft.publisher}
                    onChange={event => setEditDraft({ ...editDraft, publisher: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="evidence-edit-url">Source URL</Label>
                  <Input id="evidence-edit-url" type="url" value={editDraft.sourceUrl} placeholder="https://..."
                    onChange={event => setEditDraft({ ...editDraft, sourceUrl: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evidence-edit-date">Publication date</Label>
                  <Input id="evidence-edit-date" type="date" value={editDraft.publicationDate}
                    onChange={event => setEditDraft({ ...editDraft, publicationDate: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="evidence-edit-source-type">Source type</Label>
                  <select id="evidence-edit-source-type" className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={editDraft.sourceType}
                    onChange={event => setEditDraft({ ...editDraft, sourceType: event.target.value as EvidenceSourceType })}>
                    <option value="annual_report">Annual report</option>
                    <option value="regulatory_filing">Regulatory filing</option>
                    <option value="investor_relations">Investor relations</option>
                    <option value="sustainability_report">Sustainability report</option>
                    <option value="risk_disclosure">Risk disclosure</option>
                    <option value="regulatory_publication">Regulatory publication</option>
                    <option value="research">Research</option>
                    <option value="uploaded_document">Uploaded document</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evidence-edit-dimension">AURORA dimension</Label>
                  <select id="evidence-edit-dimension" className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={editDraft.dimensionKey}
                    onChange={event => setEditDraft({ ...editDraft, dimensionKey: event.target.value })}>
                    {DIMENSIONS.map(dimension => <option key={dimension.key} value={dimension.key}>{dimension.name}</option>)}
                  </select>
                </div>
              </div>
              {evidenceActionError && <p role="alert" className="text-sm text-destructive">{evidenceActionError}</p>}
              <DialogFooter>
                <Button type="button" variant="ghost" disabled={savingEvidence} onClick={() => { setEditingEvidence(null); setEditDraft(null); }}>Cancel</Button>
                <Button type="submit" disabled={savingEvidence || !editDraft.claim.trim()}>{savingEvidence ? 'Saving...' : 'Save evidence'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
