'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { SAAS_MATERIALITY } from '@/lib/framework/materiality';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval, type DimensionSelection } from '@/types/assessment';
import { type AuditEntry } from '@/types/audit';
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function DimensionScreeningStage({ assessment, approvals, auditTrail, onRefresh }: Props) {
  const existingSelections = assessment.dimensionSelections || [];

  const [selections, setSelections] = useState<Record<string, DimensionSelection>>(() => {
    const initial: Record<string, DimensionSelection> = {};
    for (const dim of DIMENSIONS) {
      const existing = existingSelections.find(s => s.dimensionKey === dim.key);
      const mat = SAAS_MATERIALITY[dim.key];
      initial[dim.key] = existing || {
        dimensionKey: dim.key,
        selected: true,
        deepAssessment: mat.defaultSelected,
        relevanceRationale: mat.saasRelevance,
      };
    }
    return initial;
  });

  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [recommending, setRecommending] = useState(false);

  const stage3Approval = approvals.find(a => a.stage === 3);
  const isApproved = stage3Approval?.status === 'approved';

  const selectedCount = useMemo(
    () => Object.values(selections).filter(s => s.deepAssessment).length,
    [selections]
  );

  async function getAIRecommendations() {
    setRecommending(true);
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/dimensions`, { method: 'POST' });
      const recommended = await res.json();
      if (Array.isArray(recommended)) {
        const updated: Record<string, DimensionSelection> = {};
        for (const r of recommended) {
          updated[r.dimensionKey] = r;
        }
        setSelections(updated);
      }
      await onRefresh();
    } catch (err) { console.error(err); }
    finally { setRecommending(false); }
  }

  function toggleDeep(key: string) {
    setSelections(prev => ({
      ...prev,
      [key]: { ...prev[key], deepAssessment: !prev[key].deepAssessment },
    }));
  }

  function updateRationale(key: string, rationale: string) {
    setSelections(prev => ({
      ...prev,
      [key]: { ...prev[key], relevanceRationale: rationale },
    }));
  }

  async function saveSelections() {
    const selectionsArray = Object.values(selections);
    await fetch(`/api/assessments/${assessment.id}/dimensions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections: selectionsArray }),
    });
  }

  async function handleApprove(notes: string) {
    await saveSelections();
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 3, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 3, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dimension Screening</h2>
        <p className="text-muted-foreground">
          Select which of the 15 AURORA dimensions receive deeper SaaS/IT assessment
          (3 structured subdivisions). All dimensions appear on the radar; deep assessment
          provides subdivision-level evidence and scoring.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={getAIRecommendations} disabled={recommending} variant="outline" size="sm">
          {recommending ? 'Analyzing...' : 'AI: Recommend Dimensions'}
        </Button>
        <Badge variant="outline" className="text-sm">
          {selectedCount} of 15 selected for deep assessment
        </Badge>
        <Badge variant="outline" className="text-sm">
          {selectedCount * 3} subdivisions
        </Badge>
      </div>

      <div className="space-y-3">
        {DIMENSIONS.map(dim => {
          const sel = selections[dim.key];
          const mat = SAAS_MATERIALITY[dim.key];
          const isExpanded = expandedDim === dim.key;
          const subs = SUBDIVISIONS[dim.key as DimensionKey];
          const sizeNote = assessment.companySize === 'small'
            ? mat.smallCompanyNote
            : assessment.companySize === 'large'
              ? mat.largeCompanyNote
              : mat.smallCompanyNote;

          return (
            <Card key={dim.key} className={sel.deepAssessment ? 'border-primary/50' : ''}>
              <CardHeader className="py-3 cursor-pointer" onClick={() => setExpandedDim(isExpanded ? null : dim.key)}>
                <div className="flex items-center gap-3">
                  <Button
                    variant={sel.deepAssessment ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={e => { e.stopPropagation(); toggleDeep(dim.key); }}
                  >
                    {sel.deepAssessment ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-muted-foreground">{dim.number}.</span>
                      {dim.name}
                      {sel.deepAssessment && (
                        <Badge className="text-[10px] bg-primary/10 text-primary">Deep</Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {dim.description}
                    </p>
                  </div>

                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">SaaS/IT Relevance</p>
                    <Textarea
                      value={sel.relevanceRationale}
                      onChange={e => updateRationale(dim.key, e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>

                  {sizeNote && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <span className="font-medium">
                        {assessment.companySize || 'Medium'} company note:
                      </span>{' '}
                      {sizeNote}
                    </div>
                  )}

                  {sel.deepAssessment && subs && (
                    <div>
                      <p className="text-sm font-medium mb-2">Three Structured Subdivisions</p>
                      <div className="space-y-2">
                        {subs.map((sub, i) => (
                          <div key={sub.key} className="border rounded p-3">
                            <p className="text-sm font-medium">
                              <span className="text-muted-foreground">{dim.number}.{i + 1}</span>{' '}
                              {sub.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{sub.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {sub.evidenceHints.map(hint => (
                                <Badge key={hint} variant="outline" className="text-[10px]">
                                  {hint}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>
        <TabsContent value="audit">
          <AuditTrail entries={auditTrail} />
        </TabsContent>
      </Tabs>

      <Separator />
      <ReviewCheckpoint
        stageName="Dimension Screening"
        isApproved={isApproved}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
