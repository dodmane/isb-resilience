'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MaturityBadge } from '@/components/assessment/MaturityBadge';
import { ConfidenceBadge } from '@/components/assessment/ConfidenceBadge';
import { SourceLink } from '@/components/assessment/SourceLink';
import { AuditTrail } from '@/components/assessment/AuditTrail';
import { EvaluationReadiness, SubdimensionScoringReport } from '@/components/assessment/ScoringGovernance';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SCENARIOS, scenarioAxisLabel } from '@/lib/framework/scenarios';
import { classifyDimension } from '@/lib/framework/resilience';
import { generateEarlyWarningIndicators } from '@/lib/framework/resilience';
import { summarizeAssessment } from '@/lib/framework/scoring';
import { getAssessmentSubdivisionMap } from '@/lib/framework/subdivisions';
import { type Assessment, type StageApproval } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type SubdivisionScore, type DimensionScore } from '@/types/scoring';
import { type ScenarioAssessment } from '@/types/scenario';
import { type ResilienceGap } from '@/types/resilience';
import { type AuditEntry } from '@/types/audit';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Activity, Building2, CheckCheck, Files, Gauge, LayoutDashboard,
  Shield, ShieldAlert, ShieldQuestion, TrendingDown, AlertTriangle,
  Printer, TriangleAlert,
  Info,
} from 'lucide-react';

interface Props {
  assessment: Assessment;
  approvals: StageApproval[];
  evidence: Evidence[];
  subdivisionScores: SubdivisionScore[];
  dimensionScores: DimensionScore[];
  scenarioAssessments: ScenarioAssessment[];
  resilienceGaps: ResilienceGap[];
  auditTrail: AuditEntry[];
  onRefresh: () => Promise<void>;
}

export function FinalDashboardStage({
  assessment, evidence, subdivisionScores,
  dimensionScores, scenarioAssessments, resilienceGaps, auditTrail,
}: Props) {
  const deepDimensions = useMemo(() => {
    const selected = (assessment.dimensionSelections || [])
      .filter(s => s.deepAssessment).map(s => s.dimensionKey);
    return DIMENSIONS.filter(d => selected.includes(d.key));
  }, [assessment.dimensionSelections]);
  const selectedDimensionKeys = useMemo(
    () => new Set<string>(deepDimensions.map(dimension => dimension.key)),
    [deepDimensions]
  );
  const assessmentSummary = useMemo(
    () => summarizeAssessment(subdivisionScores, getAssessmentSubdivisionMap(assessment.customSubdivisions, assessment.excludedSubdivisionKeys)),
    [assessment.customSubdivisions, assessment.excludedSubdivisionKeys, subdivisionScores]
  );
  const qualifyingDimensions = deepDimensions.filter(dimension =>
    dimensionScores.some(score => score.dimensionKey === dimension.key && score.normalizedScore !== null)
  ).length;

  // Radar chart data
  const radarData = useMemo(() => {
    return deepDimensions.map(dim => {
      const score = dimensionScores.find(s => s.dimensionKey === dim.key);
      const entry: Record<string, string | number | null> = {
        dimension: dim.name.length > 20 ? dim.name.substring(0, 18) + '…' : dim.name,
        base: score?.normalizedScore ?? null,
      };
      return entry;
    });
  }, [deepDimensions, dimensionScores]);

  // Classifications
  const classifications = useMemo(() => {
    const strong: string[] = [];
    const conditional: string[] = [];
    const exposed: string[] = [];
    for (const dim of deepDimensions) {
      const ds = dimensionScores.find(s => s.dimensionKey === dim.key);
      if (!ds) { exposed.push(dim.key); continue; }
      const cls = classifyDimension(ds, scenarioAssessments);
      if (cls === 'strong') strong.push(dim.key);
      else if (cls === 'conditional') conditional.push(dim.key);
      else exposed.push(dim.key);
    }
    return { strong, conditional, exposed };
  }, [deepDimensions, dimensionScores, scenarioAssessments]);

  // Early warning indicators
  const earlyWarnings = useMemo(
    () => generateEarlyWarningIndicators(
      dimensionScores.filter(score => selectedDimensionKeys.has(score.dimensionKey)),
      scenarioAssessments.filter(item => selectedDimensionKeys.has(item.dimensionKey))
    ),
    [dimensionScores, scenarioAssessments, selectedDimensionKeys]
  );

  // Evidence register
  const acceptedEvidence = useMemo(
    () => evidence.filter(e => e.status === 'accepted' && selectedDimensionKeys.has(e.dimensionKey)),
    [evidence, selectedDimensionKeys]
  );
  const selectedGaps = useMemo(
    () => resilienceGaps.filter(gap => selectedDimensionKeys.has(gap.dimensionKey)),
    [resilienceGaps, selectedDimensionKeys]
  );
  const summaryMetrics = [
    {
      label: 'Composite score', value: assessmentSummary.composite.normalizedScore?.toFixed(1) ?? '—', suffix: '/100',
      detail: 'Evidence-based score', icon: Gauge,
      color: 'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30', iconColor: 'text-sky-700 dark:text-sky-300',
    },
    {
      label: 'Rated dimensions', value: qualifyingDimensions, suffix: `/ ${deepDimensions.length}`,
      detail: 'Dimensions with scores', icon: Activity,
      color: 'border-teal-200 bg-teal-50/70 dark:border-teal-900 dark:bg-teal-950/30', iconColor: 'text-teal-700 dark:text-teal-300',
    },
    {
      label: 'Scoring coverage', value: `${assessmentSummary.coveragePercent.toFixed(0)}%`, suffix: '',
      detail: `${assessmentSummary.scoredCount} of ${assessmentSummary.totalCount} sub-dimensions rated`, icon: CheckCheck,
      color: 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30', iconColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Accepted evidence', value: acceptedEvidence.length, suffix: '',
      detail: `${acceptedEvidence.filter(item => !item.isMock).length} non-mock records`, icon: Files,
      color: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30', iconColor: 'text-emerald-700 dark:text-emerald-300',
    },
  ];

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-4" id="aurora-dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5 print:block">
        <div className="border-l-4 border-cyan-600 pl-4 dark:border-cyan-400">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">Final Assessment</p>
          <h2 className="mt-1 text-2xl font-bold tracking-normal">{assessment.companyName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{assessment.industry || 'Industry not set'} <span aria-hidden="true">·</span> {assessment.assessmentLens} lens <span aria-hidden="true">·</span> {assessment.companySize || 'Size not set'}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print / PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList variant="line" className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 print:hidden">
          <TabsTrigger value="overview" className="flex-none gap-2 rounded-t-md px-3 py-3 text-cyan-800 hover:bg-cyan-50 data-[active]:bg-cyan-50 data-[active]:text-cyan-950 data-[active]:after:bg-cyan-600 dark:text-cyan-300 dark:hover:bg-cyan-950/30 dark:data-[active]:bg-cyan-950/50 dark:data-[active]:text-cyan-100 dark:data-[active]:after:bg-cyan-300"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="scenarios" className="flex-none gap-2 rounded-t-md px-3 py-3 text-amber-800 hover:bg-amber-50 data-[active]:bg-amber-50 data-[active]:text-amber-950 data-[active]:after:bg-amber-600 dark:text-amber-300 dark:hover:bg-amber-950/30 dark:data-[active]:bg-amber-950/50 dark:data-[active]:text-amber-100 dark:data-[active]:after:bg-amber-300"><TriangleAlert className="h-4 w-4" /> Scenarios &amp; Gaps</TabsTrigger>
          <TabsTrigger value="evidence" className="flex-none gap-2 rounded-t-md px-3 py-3 text-emerald-800 hover:bg-emerald-50 data-[active]:bg-emerald-50 data-[active]:text-emerald-950 data-[active]:after:bg-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30 dark:data-[active]:bg-emerald-950/50 dark:data-[active]:text-emerald-100 dark:data-[active]:after:bg-emerald-300"><Files className="h-4 w-4" /> Scoring &amp; Evidence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map(metric => {
              const MetricIcon = metric.icon;
              return (
                <Card key={metric.label} className={`border ${metric.color}`}>
                  <CardContent className="flex min-h-28 items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground/70">{metric.label}</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                        {metric.value}<span className="ml-1 text-xs font-normal text-muted-foreground">{metric.suffix}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                    </div>
                    <MetricIcon className={`mt-0.5 h-5 w-5 shrink-0 ${metric.iconColor}`} aria-hidden="true" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <EvaluationReadiness assessment={assessment} scores={subdivisionScores} />

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Company Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">Company:</span> <strong>{assessment.companyName}</strong></div>
          <div><span className="text-muted-foreground">Industry:</span> {assessment.industry}</div>
          <div><span className="text-muted-foreground">Size:</span> {assessment.companySize || 'Not set'}</div>
          <div><span className="text-muted-foreground">Lens:</span> <Badge variant="outline">{assessment.assessmentLens}</Badge></div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Description:</span> {assessment.companyDescription || 'No company description provided.'}</div>
        </CardContent>
      </Card>

      {/* Selected-Dimension Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{deepDimensions.length}-Dimension Resilience Radar</CardTitle>
          <CardDescription>Selected dimensions only. Evidence-based base scores; scenario maturity is reported separately.</CardDescription>
        </CardHeader>
        <CardContent>
          {deepDimensions.length === 0 ? <p className="text-sm text-muted-foreground">No dimensions are selected for deep assessment.</p> :
          radarData.every(item => item.base !== null) ? <div className="h-[320px] sm:h-[400px] print:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="Base" dataKey="base" stroke="#0f766e" fill="#14b8a6" fillOpacity={0.2} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div> : <p className="text-sm text-muted-foreground">Radar unavailable: selected dimensions have missing scores.</p>}
          <div className="flex items-start gap-2 mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Rubric scores are policy-based capability indicators, not probabilities of resilience. Missing evidence is not plotted as zero.
          </div>
        </CardContent>
      </Card>

      {/* Maturity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maturity Levels &amp; Assessment Confidence</CardTitle>
          <CardDescription>Confidence is tracked separately and does not influence maturity scores.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Dimension</th>
                  <th className="text-center py-2">Maturity</th>
                  <th className="text-center py-2">Normalized</th>
                  <th className="text-center py-2">Confidence</th>
                  <th className="text-center py-2">Classification</th>
                </tr>
              </thead>
              <tbody>
                {deepDimensions.map(dim => {
                  const ds = dimensionScores.find(s => s.dimensionKey === dim.key);
                  const cls = ds ? classifyDimension(ds, scenarioAssessments) : 'exposed';
                  const clsConf = cls === 'strong'
                    ? { color: 'bg-green-100 text-green-800', label: 'Strong' }
                    : cls === 'conditional'
                      ? { color: 'bg-amber-100 text-amber-800', label: 'Conditional' }
                      : { color: 'bg-red-100 text-red-800', label: 'Exposed' };
                  return (
                    <tr key={dim.key} className="border-b">
                      <td className="py-2"><span className="text-muted-foreground">{dim.number}.</span> {dim.name}</td>
                      <td className="text-center py-2"><MaturityBadge level={ds?.maturityLevel ?? null} /></td>
                      <td className="text-center py-2 font-mono">{ds?.normalizedScore ?? '—'}</td>
                      <td className="text-center py-2">{ds ? <ConfidenceBadge confidence={ds.confidence} /> : '—'}</td>
                      <td className="text-center py-2"><Badge className={`text-[10px] ${clsConf.color}`}>{clsConf.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Capability Classification */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { key: 'strong' as const, icon: <Shield className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />, label: 'Strong', description: 'Capabilities holding up under stress', color: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20', countColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' },
          { key: 'conditional' as const, icon: <ShieldQuestion className="h-5 w-5 text-amber-700 dark:text-amber-300" />, label: 'Conditional', description: 'Capabilities with dependencies or limits', color: 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20', countColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' },
          { key: 'exposed' as const, icon: <ShieldAlert className="h-5 w-5 text-rose-700 dark:text-rose-300" />, label: 'Exposed', description: 'Capabilities needing attention', color: 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20', countColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' },
        ].map(cat => (
          <Card key={cat.key} className={`border ${cat.color}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">{cat.icon} {cat.label}</CardTitle>
                  <CardDescription className="mt-1 text-xs">{cat.description}</CardDescription>
                </div>
                <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold tabular-nums ${cat.countColor}`}>
                  {classifications[cat.key].length}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {classifications[cat.key].length === 0 ? (
                <p className="text-xs text-muted-foreground">No dimensions in this category.</p>
              ) : (
                <ul className="space-y-2">
                  {classifications[cat.key].map(dk => {
                    const dim = DIMENSIONS.find(d => d.key === dk);
                    return <li key={dk} className="border-t border-current/10 pt-2 text-xs font-medium">{dim?.number}. {dim?.name}</li>;
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leadership Focus Map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leadership Focus Map</CardTitle>
          <CardDescription>Dimensions requiring leadership attention, prioritized by exposure severity.</CardDescription>
        </CardHeader>
        <CardContent>
          {[...classifications.exposed, ...classifications.conditional].length === 0 ? (
            <p className="text-sm text-muted-foreground">No dimensions require immediate leadership attention.</p>
          ) : (
            <div className="space-y-3">
              {[...classifications.exposed, ...classifications.conditional].map((dk, i) => {
                const dim = DIMENSIONS.find(d => d.key === dk);
                const ds = dimensionScores.find(s => s.dimensionKey === dk);
                const isExposed = classifications.exposed.includes(dk);
                const relatedGaps = resilienceGaps.filter(g => g.dimensionKey === dk);
                return (
                  <div key={dk} className={`border rounded p-3 ${isExposed ? 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/20' : 'border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                      {isExposed ? <ShieldAlert className="h-4 w-4 text-red-600" /> : <ShieldQuestion className="h-4 w-4 text-amber-600" />}
                      <span className="text-sm font-medium">{dim?.name}</span>
                      <MaturityBadge level={ds?.maturityLevel ?? null} />
                    </div>
                    {relatedGaps.length > 0 && (
                      <p className="text-xs text-muted-foreground">{relatedGaps[0].recommendation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
      {/* Scenario Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenario Resilience</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Dimension</th>
                <th className="text-center py-2">Base</th>
                {SCENARIOS.map(s => <th key={s.key} className="text-center py-2">{scenarioAxisLabel(s)}</th>)}
              </tr>
            </thead>
            <tbody>
              {deepDimensions.map(dim => {
                const ds = dimensionScores.find(s => s.dimensionKey === dim.key);
                return (
                  <tr key={dim.key} className="border-b">
                    <td className="py-2">{dim.number}. {dim.name}</td>
                    <td className="text-center py-2"><MaturityBadge level={ds?.maturityLevel ?? null} /></td>
                    {SCENARIOS.map(sc => {
                      const sa = scenarioAssessments.find(a => a.scenarioKey === sc.key && a.dimensionKey === dim.key);
                      return <td key={sc.key} className="text-center py-2"><MaturityBadge level={sa?.scenarioMaturity ?? null} /></td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Early Warning Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Early Warning Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earlyWarnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No early-warning indicators generated.</p>
          ) : (
            <div className="space-y-2">
              {earlyWarnings.map((ew, i) => {
                const dim = DIMENSIONS.find(d => d.key === ew.dimensionKey);
                const scenario = SCENARIOS.find(s => s.key === ew.scenarioKey);
                return (
                  <div key={i} className="border rounded p-3 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{dim?.name}</span>
                      <Badge variant="outline" className="text-[10px]">{scenario ? scenarioAxisLabel(scenario) : 'Base'}</Badge>
                    </div>
                    <p className="text-muted-foreground"><span className="font-medium">Monitor:</span> {ew.indicator}</p>
                    <p className="text-red-600 dark:text-red-400"><span className="font-medium">Trigger:</span> {ew.trigger}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resilience Gaps Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" /> Resilience Gaps
          </CardTitle>
          <CardDescription>Each gap traces back to approved evidence. Recommendations are framework-level only.</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedGaps.filter(g => g.classification !== 'strong').length === 0 ? (
            <p className="text-sm text-muted-foreground">No resilience gaps identified.</p>
          ) : (
            <div className="space-y-3">
              {selectedGaps.filter(g => g.classification !== 'strong').map(gap => {
                const dim = DIMENSIONS.find(d => d.key === gap.dimensionKey);
                const scenario = SCENARIOS.find(s => s.key === gap.scenarioKey);
                const scenarioLabel = scenario ? scenarioAxisLabel(scenario) : 'Base';
                return (
                  <div key={gap.id} className="border rounded p-3 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      {gap.classification === 'exposed'
                        ? <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                        : <ShieldQuestion className="h-3.5 w-3.5 text-amber-600" />}
                      <span className="font-medium">{dim?.name}</span>
                      <Badge variant="outline" className="text-[10px]">{scenarioLabel}</Badge>
                      <span className="ml-auto">
                        <MaturityBadge level={gap.currentMaturity as 1|2|3|4|null} /> → <MaturityBadge level={gap.scenarioMaturity as 1|2|3|4|null} />
                      </span>
                    </div>
                    <p className="text-muted-foreground">{gap.gapDescription}</p>
                    <p className="text-blue-700 dark:text-blue-300">{gap.recommendation}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="evidence" className="space-y-6">
      <SubdimensionScoringReport assessment={assessment} scores={subdivisionScores} evidence={evidence} />

      <Tabs defaultValue="evidence-register">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="evidence-register">Evidence Register ({acceptedEvidence.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail ({auditTrail.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="evidence-register">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evidence Register</CardTitle>
              <CardDescription>All accepted evidence used in this assessment. Click source links to open original documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Claim</th>
                      <th className="text-left py-2">Dimension</th>
                      <th className="text-left py-2">Source</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-center py-2">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acceptedEvidence.map(ev => {
                      const dim = DIMENSIONS.find(d => d.key === ev.dimensionKey);
                      return (
                        <tr key={ev.id} className="border-b">
                          <td className="py-2 max-w-[200px] truncate">{ev.claim}</td>
                          <td className="py-2">{dim?.name || ev.dimensionKey}</td>
                          <td className="py-2">{ev.sourceTitle}</td>
                          <td className="py-2">{ev.sourceType}</td>
                          <td className="py-2 text-center">
                            <SourceLink url={ev.sourceUrl} urlResolved={ev.urlResolved} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTrail entries={auditTrail} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </TabsContent>
      </Tabs>

      <Separator />
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          This assessment was produced using the AURORA Enterprise Business Resilience Framework with a SaaS/IT lens.
          It is not investment advice, a company-specific implementation plan, or a consulting recommendation.
          All normalized scores (0–100) are interpretive representations of 1–4 maturity levels and do not imply mathematical precision.
        </p>
      </div>
    </div>
  );
}
