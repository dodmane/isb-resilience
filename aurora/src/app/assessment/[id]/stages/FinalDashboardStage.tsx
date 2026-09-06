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
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { classifyDimension } from '@/lib/framework/resilience';
import { generateEarlyWarningIndicators } from '@/lib/framework/resilience';
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
  Building2, Shield, ShieldAlert, ShieldQuestion,
  TrendingDown, AlertTriangle, Printer,
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
  assessment, evidence,
  dimensionScores, scenarioAssessments, resilienceGaps, auditTrail,
}: Props) {
  const deepDimensions = useMemo(() => {
    const selected = (assessment.dimensionSelections || [])
      .filter(s => s.deepAssessment).map(s => s.dimensionKey);
    return DIMENSIONS.filter(d => selected.includes(d.key));
  }, [assessment.dimensionSelections]);

  // Radar chart data
  const radarData = useMemo(() => {
    return deepDimensions.map(dim => {
      const score = dimensionScores.find(s => s.dimensionKey === dim.key);
      const entry: Record<string, string | number> = {
        dimension: dim.name.length > 20 ? dim.name.substring(0, 18) + '…' : dim.name,
        base: score?.normalizedScore ?? 0,
      };
      for (const sc of SCENARIOS) {
        const sa = scenarioAssessments.find(a => a.scenarioKey === sc.key && a.dimensionKey === dim.key);
        entry[sc.key] = sa?.scenarioMaturity ? Math.round(((sa.scenarioMaturity - 1) / 3) * 75 + 25) : 0;
      }
      return entry;
    });
  }, [deepDimensions, dimensionScores, scenarioAssessments]);

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
    () => generateEarlyWarningIndicators(dimensionScores, scenarioAssessments),
    [dimensionScores, scenarioAssessments]
  );

  // Evidence register
  const acceptedEvidence = useMemo(() => evidence.filter(e => e.status === 'accepted'), [evidence]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-8 print:space-y-4" id="aurora-dashboard">
      {/* Header */}
      <div className="flex items-start justify-between print:block">
        <div>
          <h2 className="text-2xl font-bold">AURORA Executive Resilience Profile</h2>
          <p className="text-muted-foreground">
            {assessment.companyName} — {assessment.assessmentLens} Lens
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Company Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Company Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Company:</span> <strong>{assessment.companyName}</strong></div>
          <div><span className="text-muted-foreground">Industry:</span> {assessment.industry}</div>
          <div><span className="text-muted-foreground">Size:</span> {assessment.companySize || 'Not set'}</div>
          <div><span className="text-muted-foreground">Lens:</span> <Badge variant="outline">{assessment.assessmentLens}</Badge></div>
          <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {assessment.companyDescription}</div>
        </CardContent>
      </Card>

      {/* 15-Dimension Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">15-Dimension Resilience Radar</CardTitle>
          <CardDescription>Base maturity and scenario-adjusted profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[450px] print:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="Base" dataKey="base" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Autonomous Advantage" dataKey="autonomous_advantage" stroke="#22c55e" fill="none" strokeWidth={1} strokeDasharray="4 4" />
                <Radar name="Storm & Signal" dataKey="storm_and_signal" stroke="#f59e0b" fill="none" strokeWidth={1} strokeDasharray="4 4" />
                <Radar name="Exposed & Reactive" dataKey="exposed_and_reactive" stroke="#ef4444" fill="none" strokeWidth={1} strokeDasharray="4 4" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-start gap-2 mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Normalized 0–100 values are an interpretive representation of the 1–4 maturity scale and do not imply mathematical precision.
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
                {SCENARIOS.map(s => <th key={s.key} className="text-center py-2">{s.name}</th>)}
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

      {/* Capability Classification */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'strong' as const, icon: <Shield className="h-5 w-5 text-green-600" />, label: 'Strong Capabilities', color: 'border-green-200' },
          { key: 'conditional' as const, icon: <ShieldQuestion className="h-5 w-5 text-amber-600" />, label: 'Conditional Capabilities', color: 'border-amber-200' },
          { key: 'exposed' as const, icon: <ShieldAlert className="h-5 w-5 text-red-600" />, label: 'Exposed Capabilities', color: 'border-red-200' },
        ].map(cat => (
          <Card key={cat.key} className={cat.color}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">{cat.icon} {cat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {classifications[cat.key].length === 0 ? (
                <p className="text-xs text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-1">
                  {classifications[cat.key].map(dk => {
                    const dim = DIMENSIONS.find(d => d.key === dk);
                    return <li key={dk} className="text-xs">{dim?.number}. {dim?.name}</li>;
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
                      <Badge variant="outline" className="text-[10px]">{scenario?.name || 'Base'}</Badge>
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
          {resilienceGaps.filter(g => g.classification !== 'strong').length === 0 ? (
            <p className="text-sm text-muted-foreground">No resilience gaps identified.</p>
          ) : (
            <div className="space-y-3">
              {resilienceGaps.filter(g => g.classification !== 'strong').map(gap => {
                const dim = DIMENSIONS.find(d => d.key === gap.dimensionKey);
                const scenario = SCENARIOS.find(s => s.key === gap.scenarioKey);
                return (
                  <div key={gap.id} className="border rounded p-3 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      {gap.classification === 'exposed'
                        ? <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                        : <ShieldQuestion className="h-3.5 w-3.5 text-amber-600" />}
                      <span className="font-medium">{dim?.name}</span>
                      <Badge variant="outline" className="text-[10px]">{scenario?.name || 'Base'}</Badge>
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
