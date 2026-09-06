'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewCheckpoint } from '@/components/assessment/ReviewCheckpoint';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval, type EvidencePlanItem } from '@/types/assessment';
import { type AuditEntry } from '@/types/audit';
import { Plus, X, Search, FileText } from 'lucide-react';

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function EvidencePlanStage({ assessment, approvals, auditTrail, onRefresh }: Props) {
  const deepDimensions = useMemo(() => {
    const selected = (assessment.dimensionSelections || [])
      .filter(s => s.deepAssessment)
      .map(s => s.dimensionKey);
    return DIMENSIONS.filter(d => selected.includes(d.key));
  }, [assessment.dimensionSelections]);

  const [plan, setPlan] = useState<EvidencePlanItem[]>(() => {
    if (assessment.evidencePlan?.length) return assessment.evidencePlan;

    const items: EvidencePlanItem[] = [];
    for (const dim of deepDimensions) {
      const subs = SUBDIVISIONS[dim.key as DimensionKey];
      for (const sub of subs) {
        items.push({
          dimensionKey: dim.key,
          subdivisionKey: sub.key,
          searchTargets: [...sub.evidenceHints],
          sourceTypes: ['annual_report', 'regulatory_filing', 'investor_relations'],
          notes: '',
        });
      }
    }
    return items;
  });

  const [newTargetInputs, setNewTargetInputs] = useState<Record<string, string>>({});

  const stage4Approval = approvals.find(a => a.stage === 4);
  const isApproved = stage4Approval?.status === 'approved';

  function getPlanKey(item: EvidencePlanItem) {
    return `${item.dimensionKey}__${item.subdivisionKey}`;
  }

  function addSearchTarget(planKey: string) {
    const inputVal = newTargetInputs[planKey]?.trim();
    if (!inputVal) return;

    setPlan(prev => prev.map(item => {
      if (getPlanKey(item) === planKey && !item.searchTargets.includes(inputVal)) {
        return { ...item, searchTargets: [...item.searchTargets, inputVal] };
      }
      return item;
    }));
    setNewTargetInputs(prev => ({ ...prev, [planKey]: '' }));
  }

  function removeSearchTarget(planKey: string, target: string) {
    setPlan(prev => prev.map(item => {
      if (getPlanKey(item) === planKey) {
        return { ...item, searchTargets: item.searchTargets.filter(t => t !== target) };
      }
      return item;
    }));
  }

  function updateNotes(planKey: string, notes: string) {
    setPlan(prev => prev.map(item =>
      getPlanKey(item) === planKey ? { ...item, notes } : item
    ));
  }

  async function savePlan() {
    await fetch(`/api/assessments/${assessment.id}/evidence-plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
  }

  async function handleApprove(notes: string) {
    await savePlan();
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 4, status: 'approved', notes }),
    });
    await onRefresh();
  }

  async function handleReject(notes: string) {
    await fetch(`/api/assessments/${assessment.id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 4, status: 'rejected', notes }),
    });
    await onRefresh();
  }

  const groupedPlan = useMemo(() => {
    const groups: Record<string, EvidencePlanItem[]> = {};
    for (const item of plan) {
      if (!groups[item.dimensionKey]) groups[item.dimensionKey] = [];
      groups[item.dimensionKey].push(item);
    }
    return groups;
  }, [plan]);

  const SOURCE_TYPE_LABELS: Record<string, string> = {
    annual_report: 'Annual Reports',
    regulatory_filing: 'Regulatory Filings',
    investor_relations: 'Investor Relations',
    sustainability_report: 'Sustainability Reports',
    risk_disclosure: 'Risk Disclosures',
    regulatory_publication: 'Regulatory Publications',
    research: 'Research',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Evidence Plan</h2>
        <p className="text-muted-foreground">
          Define what evidence to gather for each dimension and subdivision.
          Review search targets and source types before proceeding to research.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-sm">
          <Search className="h-3 w-3 mr-1" />
          {plan.reduce((sum, p) => sum + p.searchTargets.length, 0)} search targets
        </Badge>
        <Badge variant="outline" className="text-sm">
          <FileText className="h-3 w-3 mr-1" />
          {deepDimensions.length} dimensions × 3 subdivisions
        </Badge>
      </div>

      {Object.entries(groupedPlan).map(([dimKey, items]) => {
        const dim = DIMENSIONS.find(d => d.key === dimKey);
        if (!dim) return null;

        return (
          <Card key={dimKey}>
            <CardHeader>
              <CardTitle className="text-base">
                <span className="text-muted-foreground">{dim.number}.</span> {dim.name}
              </CardTitle>
              <CardDescription>{dim.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map(item => {
                const sub = SUBDIVISIONS[dimKey as DimensionKey]?.find(s => s.key === item.subdivisionKey);
                const pk = getPlanKey(item);

                return (
                  <div key={pk} className="border rounded p-3 space-y-3">
                    <div>
                      <p className="text-sm font-medium">{sub?.name || item.subdivisionKey}</p>
                      <p className="text-xs text-muted-foreground">{sub?.description}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium mb-1">Search Targets</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {item.searchTargets.map(target => (
                          <Badge key={target} variant="secondary" className="text-xs gap-1 pr-1">
                            {target}
                            <button
                              onClick={() => removeSearchTarget(pk, target)}
                              className="ml-0.5 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add search target..."
                          value={newTargetInputs[pk] || ''}
                          onChange={e => setNewTargetInputs(prev => ({ ...prev, [pk]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addSearchTarget(pk)}
                          className="text-xs h-8"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => addSearchTarget(pk)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium mb-1">Source Types</p>
                      <div className="flex flex-wrap gap-1">
                        {item.sourceTypes.map(st => (
                          <Badge key={st} variant="outline" className="text-[10px]">
                            {SOURCE_TYPE_LABELS[st] || st}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      placeholder="Additional notes..."
                      value={item.notes}
                      onChange={e => updateNotes(pk, e.target.value)}
                      rows={1}
                      className="text-xs"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

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
        stageName="Evidence Plan"
        isApproved={isApproved}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
