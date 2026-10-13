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
import { SUBDIVISIONS, getAssessmentSubdivisions } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { type Assessment, type StageApproval, type EvidencePlanItem } from '@/types/assessment';
import { type AuditEntry } from '@/types/audit';
import { Plus, X, Search, FileText, Trash2 } from 'lucide-react';

const PLAN_ORIGIN_STYLES = {
  framework_default: { label: 'Framework default', className: 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300' },
  reviewer: { label: 'Reviewer edited', className: 'border-teal-300 text-teal-700 dark:border-teal-800 dark:text-teal-300' },
};

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
    if (assessment.evidencePlanInitialized || assessment.evidencePlan?.length) return assessment.evidencePlan || [];

    const items: EvidencePlanItem[] = [];
    for (const dim of deepDimensions) {
      const subs = getAssessmentSubdivisions(dim.key as DimensionKey, assessment.customSubdivisions, assessment.excludedSubdivisionKeys);
      for (const sub of subs) {
        items.push({
          dimensionKey: dim.key,
          subdivisionKey: sub.key,
          searchTargets: [...sub.evidenceHints],
          sourceTypes: ['annual_report', 'regulatory_filing', 'investor_relations'],
          notes: '',
          planOrigin: 'framework_default',
        });
      }
    }
    return items;
  });

  const [newTargetInputs, setNewTargetInputs] = useState<Record<string, string>>({});
  const [newSubdivisionSelections, setNewSubdivisionSelections] = useState<Record<string, string>>({});
  const [addingCustomDimension, setAddingCustomDimension] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customEvidenceHints, setCustomEvidenceHints] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState('');

  const stage4Approval = approvals.find(a => a.stage === 4);
  const isApproved = stage4Approval?.status === 'approved';

  function getPlanKey(item: EvidencePlanItem) {
    return `${item.dimensionKey}__${item.subdivisionKey}`;
  }

  async function addSubdimension(dimensionKey: string) {
    const subdivisionKey = newSubdivisionSelections[dimensionKey];
    const subdivision = getAssessmentSubdivisions(dimensionKey as DimensionKey, assessment.customSubdivisions, assessment.excludedSubdivisionKeys)
      .find(item => item.key === subdivisionKey);
    if (!subdivision || plan.some(item => item.dimensionKey === dimensionKey && item.subdivisionKey === subdivisionKey)) return;

    const nextPlan = [...plan, {
      dimensionKey,
      subdivisionKey: subdivision.key,
      searchTargets: [...subdivision.evidenceHints],
      sourceTypes: ['annual_report', 'regulatory_filing', 'investor_relations'],
      notes: '',
      planOrigin: 'reviewer' as const,
    }];
    setPlan(nextPlan);
    setNewSubdivisionSelections(prev => ({ ...prev, [dimensionKey]: '' }));
    await savePlan(nextPlan);
  }

  async function removeSubdimension(planKey: string) {
    const nextPlan = plan.filter(item => getPlanKey(item) !== planKey);
    setPlan(nextPlan);
    await savePlan(nextPlan);
  }

  async function addCustomSubdimension(dimensionKey: string) {
    const name = customName.trim();
    const description = customDescription.trim();
    if (!name || !description) return;
    const keyStem = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'subdimension';
    const usedKeys = new Set([
      ...(assessment.customSubdivisions || []).map(item => `${item.dimensionKey}:${item.key}`),
      ...Object.entries(SUBDIVISIONS).flatMap(([key, subdivisions]) => subdivisions.map(item => `${key}:${item.key}`)),
    ]);
    let key = `custom_${keyStem}`;
    let suffix = 2;
    while (usedKeys.has(`${dimensionKey}:${key}`)) key = `custom_${keyStem}_${suffix++}`;

    setSavingPlan(true);
    setPlanError('');
    try {
      const planResponse = await fetch(`/api/assessments/${assessment.id}/evidence-plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!planResponse.ok) throw new Error('Could not save existing evidence plan before adding the sub-dimension.');

      const response = await fetch(`/api/assessments/${assessment.id}/subdivisions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customSubdivisions: [...(assessment.customSubdivisions || []), {
            dimensionKey,
            key,
            name,
            description,
            evidenceHints: customEvidenceHints.split(',').map(hint => hint.trim()).filter(Boolean),
          }],
          excludedSubdivisionKeys: assessment.excludedSubdivisionKeys || [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add the custom sub-dimension.');
      setPlan(data.evidencePlan);
      setCustomName('');
      setCustomDescription('');
      setCustomEvidenceHints('');
      setAddingCustomDimension(null);
      await onRefresh();
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Could not add the custom sub-dimension.');
    } finally {
      setSavingPlan(false);
    }
  }

  function addSearchTarget(planKey: string) {
    const inputVal = newTargetInputs[planKey]?.trim();
    if (!inputVal) return;

    setPlan(prev => prev.map(item => {
      if (getPlanKey(item) === planKey && !item.searchTargets.includes(inputVal)) {
        return { ...item, searchTargets: [...item.searchTargets, inputVal], planOrigin: 'reviewer' };
      }
      return item;
    }));
    setNewTargetInputs(prev => ({ ...prev, [planKey]: '' }));
  }

  function removeSearchTarget(planKey: string, target: string) {
    setPlan(prev => prev.map(item => {
      if (getPlanKey(item) === planKey) {
        return { ...item, searchTargets: item.searchTargets.filter(t => t !== target), planOrigin: 'reviewer' };
      }
      return item;
    }));
  }

  function updateNotes(planKey: string, notes: string) {
    setPlan(prev => prev.map(item =>
      getPlanKey(item) === planKey ? { ...item, notes, planOrigin: 'reviewer' } : item
    ));
  }

  async function savePlan(planToSave: EvidencePlanItem[] = plan): Promise<boolean> {
    setSavingPlan(true);
    setPlanError('');
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/evidence-plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planToSave }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save evidence plan.');
      return true;
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Could not save evidence plan.');
      return false;
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleApprove(notes: string) {
    if (!(await savePlan())) return;
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

  const planSubdimensionCount = plan.filter(item => item.subdivisionKey).length;

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
          {deepDimensions.length} dimensions · {planSubdimensionCount} sub-dimensions
        </Badge>
      </div>

      <div aria-label="Evidence plan origin legend" className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Plan origin:</span>
        {Object.entries(PLAN_ORIGIN_STYLES).map(([origin, style]) => (
          <Badge key={origin} variant="outline" className={style.className}>{style.label}</Badge>
        ))}
        <Badge variant="outline" className="text-muted-foreground">Origin not tracked</Badge>
      </div>

      {deepDimensions.map(dim => {
        const dimKey = dim.key;
        const items = groupedPlan[dimKey] || [];
        const availableSubdivisions = getAssessmentSubdivisions(dimKey as DimensionKey, assessment.customSubdivisions, assessment.excludedSubdivisionKeys)
          .filter(subdivision => !items.some(item => item.subdivisionKey === subdivision.key));

        return (
          <Card key={dimKey}>
            <CardHeader>
              <CardTitle className="text-base">
                <span className="text-muted-foreground">{dim.number}.</span> {dim.name}
              </CardTitle>
              <CardDescription>{dim.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label={`Sub-dimension to add for ${dim.name}`}
                  className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                  value={newSubdivisionSelections[dimKey] || ''}
                  onChange={event => setNewSubdivisionSelections(prev => ({ ...prev, [dimKey]: event.target.value }))}
                  disabled={savingPlan || availableSubdivisions.length === 0}
                >
                  <option value="">Select sub-dimension to add</option>
                  {availableSubdivisions.map(subdivision => (
                    <option key={subdivision.key} value={subdivision.key}>{subdivision.name}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => addSubdimension(dimKey)}
                  disabled={savingPlan || !newSubdivisionSelections[dimKey]}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add sub-dimension
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-9"
                  onClick={() => setAddingCustomDimension(addingCustomDimension === dimKey ? null : dimKey)}
                  disabled={savingPlan}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add custom sub-dimension
                </Button>
              </div>

              {availableSubdivisions.length === 0 && (
                <p className="text-xs text-muted-foreground">All framework sub-dimensions are already in this evidence plan. Add a custom one or remove a planned item to add it again.</p>
              )}

              {addingCustomDimension === dimKey && (
                <div className="space-y-3 rounded border p-3">
                  <p className="text-sm font-medium">New custom sub-dimension</p>
                  <Input aria-label={`Custom sub-dimension name for ${dim.name}`} placeholder="Name" value={customName}
                    onChange={event => setCustomName(event.target.value)} />
                  <Textarea aria-label={`Custom sub-dimension description for ${dim.name}`} placeholder="What capability or risk should this assess?"
                    value={customDescription} onChange={event => setCustomDescription(event.target.value)} rows={2} />
                  <Input aria-label={`Custom sub-dimension evidence hints for ${dim.name}`} placeholder="Evidence hints, comma-separated (optional)"
                    value={customEvidenceHints} onChange={event => setCustomEvidenceHints(event.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => addCustomSubdimension(dimKey)}
                      disabled={savingPlan || !customName.trim() || !customDescription.trim()}>
                      {savingPlan ? 'Saving...' : 'Add sub-dimension'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAddingCustomDimension(null)} disabled={savingPlan}>Cancel</Button>
                  </div>
                </div>
              )}

              {planError && <p role="alert" className="text-sm text-destructive">{planError}</p>}

              {items.length === 0 && (
                <p className="text-xs text-muted-foreground">No sub-dimensions are in this evidence plan.</p>
              )}

              {items.map(item => {
                const sub = getAssessmentSubdivisions(dimKey as DimensionKey, assessment.customSubdivisions)
                  .find(s => s.key === item.subdivisionKey);
                const pk = getPlanKey(item);

                return (
                  <div key={pk} className="border rounded p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{sub?.name || item.subdivisionKey}</p>
                          {item.planOrigin ? (
                            <Badge variant="outline" className={`text-[10px] ${PLAN_ORIGIN_STYLES[item.planOrigin].className}`}>
                              {PLAN_ORIGIN_STYLES[item.planOrigin].label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">Origin not tracked</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{sub?.description}</p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${sub?.name || item.subdivisionKey} from evidence plan`}
                        title="Remove sub-dimension"
                        onClick={() => removeSubdimension(pk)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
