'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import {
  type Assessment,
  type StageApproval,
  type CompanySize,
} from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type AuditEntry } from '@/types/audit';
import { Search, Building2, FlaskConical } from 'lucide-react';

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

  const stage1Approval = approvals.find((a) => a.stage === 1);
  const isApproved = stage1Approval?.status === 'approved';

  async function runDiscovery() {
    setDiscovering(true);
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Discovery failed');
        return;
      }
      setDescription(data.profile.companyDescription);
      setIndustry(data.profile.industry);
      setCompanySize(data.profile.companySize);
      setDiscovered(true);
      await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Discovery failed');
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

          {discovered && (assessment.companyDescription?.includes('mock') || evidence.some(e => e.isMock)) && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <FlaskConical className="h-3.5 w-3.5" />
                <span>
                  Some results from heuristic fallback — real AI research is available when LLM is configured.
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
            {evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No evidence gathered yet. Run company discovery to generate initial evidence.
              </p>
            ) : (
              evidence.map((ev) => (
                <EvidenceCard
                  key={ev.id}
                  evidence={ev}
                  onAccept={handleEvidenceAccept}
                  onReject={handleEvidenceReject}
                  onViewDetail={setDrawerEvidence}
                />
              ))
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
    </div>
  );
}
