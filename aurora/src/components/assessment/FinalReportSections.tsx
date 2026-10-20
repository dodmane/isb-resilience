'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SourceLink } from '@/components/assessment/SourceLink';
import { type Assessment } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { type DimensionScore } from '@/types/scoring';
import { type ScenarioAssessment } from '@/types/scenario';
import { type ResilienceGap } from '@/types/resilience';
import { type Dimension } from '@/lib/framework/dimensions';
import { type Scenario } from '@/lib/framework/scenarios';
import { scenarioAxisLabel } from '@/lib/framework/scenarios';

interface Props {
  assessment: Assessment;
  dimensions: Dimension[];
  scenarios: Scenario[];
  dimensionScores: DimensionScore[];
  scenarioAssessments: ScenarioAssessment[];
  gaps: ResilienceGap[];
  evidence: Evidence[];
  earlyWarnings: { dimensionKey: string; scenarioKey: string; indicator: string; trigger: string }[];
}

function suggestedOwner(dimensionKey: string): string {
  if (['liquidity_runway', 'capex_optionality', 'opex_elasticity'].includes(dimensionKey)) return 'CFO / Finance';
  if (['operational_continuity', 'technology_ai_cyber', 'erp_data_backbone'].includes(dimensionKey)) return 'CTO / CIO / CISO';
  if (['revenue_durability', 'market_development_sales'].includes(dimensionKey)) return 'CRO / Commercial leadership';
  if (dimensionKey === 'talent_culture_resilience') return 'CHRO / People leadership';
  if (['trust_regulation_reputation', 'sustainability_environmental'].includes(dimensionKey)) return 'Risk / Legal / Compliance';
  return 'Relevant dimension executive';
}

function rankGap(gap: ResilienceGap): number {
  return gap.classification === 'exposed' ? 0 : gap.classification === 'conditional' ? 1 : 2;
}

export function FinalReportSections({
  assessment, dimensions, scenarios, dimensionScores, scenarioAssessments, gaps, evidence, earlyWarnings,
}: Props) {
  const dimensionByKey = new Map<string, Dimension>(dimensions.map(dimension => [dimension.key, dimension]));
  const scenarioByKey = new Map<string, Scenario>(scenarios.map(scenario => [scenario.key, scenario]));
  const acceptedEvidence = evidence.filter(item => item.status === 'accepted');
  const nonMockEvidence = acceptedEvidence.filter(item => !item.isMock);
  const primarySources = nonMockEvidence.filter(item => ['annual_report', 'regulatory_filing'].includes(item.sourceType));
  const sourceGroups = [...new Set(nonMockEvidence.map(item => item.sourceType))];
  const prioritizedGaps = [...gaps].filter(gap => gap.classification !== 'strong')
    .sort((first, second) => rankGap(first) - rankGap(second));
  const scenariosWithScores = scenarios.map(scenario => {
    const assessments = scenarioAssessments.filter(item => item.scenarioKey === scenario.key &&
      dimensions.some(dimension => dimension.key === item.dimensionKey));
    return {
      scenario,
      strengthen: assessments.filter(item => item.direction === 'strengthens').length,
      stable: assessments.filter(item => item.direction === 'stable').length,
      weaken: assessments.filter(item => item.direction === 'weakens').length,
      missing: Math.max(0, dimensions.length - assessments.length),
    };
  });

  return (
    <section className="space-y-5 print:break-before-page" aria-labelledby="alp-final-report">
      <div className="border-b pb-3">
        <h3 id="alp-final-report" className="text-xl font-semibold">Final Report Submission</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {assessment.companyName} · {assessment.industry || 'Industry not recorded'} · Generated from this AURORA assessment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview of Methodology</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><strong>Research design:</strong> Mixed-method assessment combining reviewer-confirmed Level + Position ratings with qualitative scenario stress testing across {dimensions.length} selected dimensions.</div>
          <div><strong>Analysis techniques:</strong> AURORA maturity rubric, active sub-dimension aggregation (minimum two eligible ratings per dimension), four-scenario comparison, resilience classification, and early-warning indicator generation. This is not a SWOT, PESTEL, or statistical causal analysis.</div>
          <div><strong>Rationale:</strong> The {assessment.assessmentLens} lens evaluates operational, financial, technology, and organizational resilience using the scope selected for {assessment.companyName}. {assessment.companyDescription || 'A company description was not recorded, so company-specific strategic context is limited.'}</div>
          <div><strong>Interpretation:</strong> Scores represent rubric-based capability assessments, not probabilities or forecasts. Missing evidence is not treated as zero capability.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Sources</CardTitle>
          <CardDescription>{acceptedEvidence.length} accepted evidence items; {nonMockEvidence.length} are non-mock records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p><strong>Primary data:</strong> {acceptedEvidence.filter(item => item.sourceOrigin === 'user_provided' || item.sourceOrigin === 'user_uploaded').length} user-provided or uploaded evidence records. AURORA does not record interviews or surveys in this assessment.</p>
          <p><strong>Secondary data:</strong> {sourceGroups.length ? sourceGroups.join(', ').replaceAll('_', ' ') : 'No accepted non-mock secondary sources recorded.'}. {primarySources.length} records are categorized as annual reports or regulatory filings.</p>
          <p><strong>Data validity:</strong> Only accepted records support this report. {acceptedEvidence.filter(item => item.isMock).length} accepted mock records are excluded from the non-mock source count; {nonMockEvidence.filter(item => !item.sourceUrl || !item.urlResolved).length} accepted non-mock records have unresolved source links. Publication dates, reporting periods, and excerpts should be checked against source documents before external submission.</p>
          {nonMockEvidence.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-left"><th className="py-2 pr-3">Claim</th><th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Date</th><th className="py-2">Link</th></tr></thead>
                <tbody>{nonMockEvidence.map(item => <tr key={item.id} className="border-b align-top">
                  <td className="py-2 pr-3">{item.claim}</td><td className="py-2 pr-3">{item.sourceTitle || item.sourceType}</td>
                  <td className="py-2 pr-3">{item.publicationDate || 'Undated'}</td>
                  <td className="py-2"><SourceLink url={item.sourceUrl} urlResolved={item.urlResolved} /></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Final Recommendations</CardTitle>
          <CardDescription>Prioritized by exposure classification. These are framework-level actions for leadership review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {prioritizedGaps.length === 0 ? <p className="text-sm text-muted-foreground">No non-strong resilience gaps are recorded for the selected dimensions.</p> :
            prioritizedGaps.map((gap, index) => {
              const dimension = dimensionByKey.get(gap.dimensionKey);
              const score = dimensionScores.find(item => item.dimensionKey === gap.dimensionKey);
              const scenario = scenarioByKey.get(gap.scenarioKey);
              const scenarioLabel = scenario ? scenarioAxisLabel(scenario) : 'Base assessment';
              const recommendation = scenario ? gap.recommendation.replaceAll(scenario.name, scenarioLabel) : gap.recommendation;
              return <article key={gap.id} className="rounded border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><Badge variant={gap.classification === 'exposed' ? 'destructive' : 'outline'}>Priority {index + 1} · {gap.classification}</Badge>
                  <strong>{dimension?.name || gap.dimensionKey}</strong><span className="text-xs text-muted-foreground">{scenarioLabel} · {score?.normalizedScore ?? 'Not scored'}/100</span></div>
                <p className="mt-2">{recommendation}</p>
                <p className="mt-1 text-xs text-muted-foreground"><strong>Proposed owner:</strong> {suggestedOwner(gap.dimensionKey)} · <strong>Proposed horizon:</strong> validate and assign within 30 days; pilot within 90 days.</p>
                <p className="mt-1 text-xs text-muted-foreground"><strong>Risk / mitigation:</strong> Confirm the finding against source evidence, define a measurable baseline, and pilot changes with service, compliance, and cost guardrails before scaling.</p>
              </article>;
            })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Implementation of Findings</CardTitle>
          <CardDescription>Proposed rollout sequence; owners, budgets, and capacity must be confirmed by the organization.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2 pr-3">Phase</th><th className="py-2 pr-3">Activities</th><th className="py-2 pr-3">Accountable roles</th><th className="py-2">Resources / gate</th></tr></thead>
            <tbody>
              <tr className="border-b align-top"><td className="py-2 pr-3">1 · Validate (0–30 days)</td><td className="py-2 pr-3">Recheck priority gaps, source periods, and baseline KPIs; select one exposed area for a pilot.</td><td className="py-2 pr-3">Executive sponsor; risk lead; dimension owner</td><td className="py-2">Allocate staff time after sizing; approve scope, baseline, and risk controls.</td></tr>
              <tr className="border-b align-top"><td className="py-2 pr-3">2 · Pilot (30–90 days)</td><td className="py-2 pr-3">Run a bounded improvement pilot tied to the top recommendation and monitor early-warning triggers.</td><td className="py-2 pr-3">Proposed owner shown per recommendation; PMO / strategy office</td><td className="py-2">Budget and technology needs not captured by AURORA; estimate before approval.</td></tr>
              <tr className="align-top"><td className="py-2 pr-3">3 · Scale / adjust (90–180 days)</td><td className="py-2 pr-3">Expand only if pilot KPIs improve without breaching cost, service, or compliance guardrails.</td><td className="py-2 pr-3">Executive steering group and accountable business owner</td><td className="py-2">Release additional staffing and funding in stages; stop or redesign if gate criteria fail.</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proposed Impact Measurement</CardTitle>
          <CardDescription>Pair these indicators with owner-approved baselines and targets; targets are not inferred from the assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded border p-3"><strong>Assessment coverage</strong><p className="text-xs text-muted-foreground">Eligible sub-dimension ratings reviewed / active sub-dimensions. Check at baseline and each monthly review.</p></div>
            <div className="rounded border p-3"><strong>Priority capability KPI</strong><p className="text-xs text-muted-foreground">Select the metric attached to each top gap; record baseline, target, owner, and monthly actuals.</p></div>
            <div className="rounded border p-3"><strong>Risk triggers</strong><p className="text-xs text-muted-foreground">Monitor each early-warning trigger monthly; escalate threshold breaches at the next risk review.</p></div>
          </div>
          {earlyWarnings.length === 0 ? <p className="text-xs text-muted-foreground">No early-warning indicators were generated for current scores.</p> :
            <ul className="list-disc space-y-1 pl-5">{earlyWarnings.map(item => <li key={`${item.dimensionKey}:${item.scenarioKey}`}>
              <strong>{dimensionByKey.get(item.dimensionKey)?.name || item.dimensionKey}:</strong> {item.indicator} · trigger: {item.trigger}
            </li>)}</ul>}
          <p className="text-xs text-muted-foreground">Feedback loop: monthly review with dimension owners, quarterly executive review, and an update to this assessment when material evidence, controls, or assumptions change.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balanced Evaluation of Strategic Options</CardTitle>
          <CardDescription>The scenarios are stress-test futures, not mutually exclusive business strategies. Costs, returns, and approved organizational goals are not collected by AURORA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-2 pr-3">Scenario</th><th className="py-2 pr-3">Conditions</th><th className="py-2 pr-3">Strengthens / Stable / Weakens</th><th className="py-2">Cost / return</th></tr></thead>
              <tbody>{scenariosWithScores.map(({ scenario, strengthen, stable, weaken, missing }) => <tr key={scenario.key} className="border-b align-top">
                <td className="py-2 pr-3 font-medium">{scenarioAxisLabel(scenario)}</td><td className="py-2 pr-3">{scenario.description}</td>
                <td className="py-2 pr-3">{strengthen} / {stable} / {weaken}{missing ? ` · ${missing} not assessed` : ''}</td>
                <td className="py-2">Not quantified; estimate through finance and strategy review.</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-1 text-sm"><p><strong>Alignment:</strong> Compare the preferred response with {assessment.companyName}’s approved strategic objectives; those objectives are not separately recorded in this assessment.</p>
            <p><strong>Decision criteria:</strong> prioritize evidence-backed exposure reduction, regulatory obligations, service continuity, execution capacity, reversibility, and a measurable pilot return. Require finance and accountable executives to validate costs and benefits before commitment.</p></div>
        </CardContent>
      </Card>
    </section>
  );
}