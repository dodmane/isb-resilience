import { type MaturityLevel } from '@/types/assessment';
import { type Evidence } from '@/types/evidence';
import { SUBDIVISIONS } from './subdivisions';

export const RUBRIC_VERSION = 'saas-criteria-1.0';
export const RUBRIC_STATUS = 'provisional_academic_policy';
export type SaaSProfile = 'standard' | 'critical';
export type CriterionReviewMode = 'manual' | 'llm_assisted';

export function isCriterionReviewMode(value: unknown): value is CriterionReviewMode {
  return value === 'manual' || value === 'llm_assisted';
}

export interface ScoringPolicy {
  rubricVersion: string;
  profile: SaaSProfile;
  reviewMode?: CriterionReviewMode;
  periodStart: string;
  periodEnd: string;
  approvedAt: string;
  approvalReason: string;
}
export interface CriterionFinding {
  criterionId: string;
  status: 'met' | 'not_met' | 'unknown';
  value: number | null;
  evidenceId: string | null;
  quote: string;
  observedAt: string | null;
  rationale: string;
  basis: 'record' | 'claim' | 'unknown';
  observationDates?: string[];
}
export type CriterionInputField = 'finding' | 'supportingRecord' | 'measuredValue' | 'observationDate' |
  'repeatabilityDates' | 'exactExcerpt' | 'criterionRationale' | 'endpointException' | 'reviewer' | 'reviewReason';

export interface CriterionValidationIssue {
  criterionId: string | null;
  criterionIds?: string[];
  fields: CriterionInputField[];
  message: string;
  code?: 'evidence' | 'excerpt' | 'observation_date' | 'reporting_window';
  observedAt?: string | null;
}

export class CriterionValidationError extends Error {
  constructor(public issue: CriterionValidationIssue) {
    super(issue.message);
    this.name = 'CriterionValidationError';
  }
}
export interface Criterion {
  id: string;
  level: MaturityLevel | 'position';
  requirement: string;
  unit?: string;
  operator?: '>=' | '<=';
  threshold?: number;
}

type Outcome = { measure: string; operator?: '>=' | '<='; threshold?: number; criticalThreshold?: number; unit?: string };

const OUTCOMES: Record<string, Outcome> = {
  retention_nrr: { measure: 'Trailing 12-month net revenue retention for the same opening customer cohort, excluding new customers', operator: '>=', threshold: 100, unit: '%' },
  pricing_power_mix: { measure: 'Gross margin on recurring software revenue, excluding pass-through services', operator: '>=', threshold: 70, unit: '%' },
  customer_concentration_demand: { measure: 'Largest customer share of trailing 12-month revenue', operator: '<=', threshold: 10, unit: '%' },
  cloud_hosting_flex: { measure: 'A documented downscale test or contract exercise reduces hosting expense without breaching the approved service objective' },
  payroll_workforce_flex: { measure: 'A documented redeployment or cross-training exercise preserves critical service coverage without assuming layoffs are a positive outcome' },
  vendor_sm_control: { measure: 'A documented discretionary vendor or marketing spend reduction preserves renewal and pipeline service objectives' },
  software_capitalization: { measure: 'A reviewed capitalization and impairment schedule reconciles to financial statements with no unresolved material exception' },
  infrastructure_investment: { measure: 'A tested capacity plan covers committed infrastructure and lease obligations under a documented demand downside' },
  deferrability_reversibility: { measure: 'Share of planned next-12-month capital spending contractually deferrable without material service interruption', operator: '>=', threshold: 30, unit: '%' },
  cash_generation_buffers: { measure: 'Unrestricted liquid reserves divided by average monthly cash operating expenditure over the reporting window', operator: '>=', threshold: 6, unit: 'months' },
  financing_access: { measure: 'Current signed financing agreements and a reconciled maturity schedule show no uncovered funding need or covenant breach in the next 12 months' },
  burn_shock_absorption: { measure: 'Runway under a documented 20% revenue decline, assuming unchanged committed costs and no uncommitted financing; nonnegative stressed cash flow satisfies the test without division by zero', operator: '>=', threshold: 12, unit: 'months' },
  sla_uptime: { measure: 'Measured production availability including customer-impacting incidents, with calculation and exclusions disclosed', operator: '>=', threshold: 99.9, criticalThreshold: 99.95, unit: '%' },
  disaster_recovery_bcp: { measure: 'Maximum observed recovery time in a representative end-to-end production-service restoration test', operator: '<=', threshold: 4, criticalThreshold: 1, unit: 'hours' },
  redundancy_recovery: { measure: 'A witnessed regional or dependency failover test restores service and demonstrates data loss within the approved contractual recovery-point objective' },
  data_quality_integration: { measure: 'Accuracy of sampled critical records reconciled across billing, CRM and financial reporting, with sample definition disclosed', operator: '>=', threshold: 99, unit: '%' },
  reporting_controls: { measure: 'An independent control review finds no unresolved material reporting weakness, with reconciliation and remediation records' },
  decision_visibility: { measure: 'Age of financial and operating data in the executive decision dashboard', operator: '<=', threshold: 5, criticalThreshold: 1, unit: 'business days' },
  product_relevance_roadmap: { measure: 'A completed customer-outcome review links shipped roadmap commitments to observed adoption or retention, including failed commitments' },
  engineering_capacity_cadence: { measure: 'Production changes requiring rollback or incident remediation divided by all production changes', operator: '<=', threshold: 15, unit: '%' },
  ai_readiness_innovation: { measure: 'A deployed AI or innovation experiment meets pre-registered customer-value and safety tests; a documented non-AI experiment is permitted where AI is not appropriate' },
  pipeline_conversion: { measure: 'Absolute quarterly revenue forecast error divided by actual quarterly revenue', operator: '<=', threshold: 20, unit: '%' },
  cac_ltv_economics: { measure: 'Fully loaded acquisition cost divided by monthly gross profit from the same new-customer cohort', operator: '<=', threshold: 18, unit: 'months' },
  geographic_channel_diversification: { measure: 'A documented segment or channel stress test demonstrates continued operating liquidity when the largest demand channel weakens' },
  partnership_strategy: { measure: 'An active signed partnership delivers documented customer or capability outcomes against a pre-agreed review objective' },
  acquisition_integration: { measure: 'An executed acquisition integration review or a documented representative integration drill meets pre-agreed milestones; acquisition volume is not required' },
  build_buy_partner: { measure: 'An executed capability decision compares lifecycle cost and dependency risks across build, buy and partner options and reviews its outcome' },
  cyber_maturity_data_security: { measure: 'Maximum remediation time for critical internet-exposed vulnerabilities, supported by an inventory and dated closure records', operator: '<=', threshold: 14, criticalThreshold: 7, unit: 'days' },
  ai_governance: { measure: 'A complete AI-use inventory has an approved risk assessment, tested safeguards and accountable owners; an independently checked no-AI inventory is acceptable' },
  cloud_dependency_concentration: { measure: 'A representative primary-cloud outage or exit exercise demonstrates recoverability, with measured time, data-loss and contractual constraints' },
  energy_emissions: { measure: 'An emissions inventory discloses calculation boundaries, energy data and supplier estimates, with a reconciled baseline and measured progress against a prior target' },
  climate_exposure: { measure: 'A documented physical and transition risk assessment maps hosting regions and suppliers to tested adaptation or continuity controls' },
  disclosure_compliance_readiness: { measure: 'A dated applicability review and disclosure-control test demonstrate completeness of required sustainability disclosures, including a justified non-applicability determination' },
  compliance_privacy: { measure: 'A tested privacy request and incident-response process meets applicable statutory deadlines with no unresolved material compliance exception' },
  security_assurance_quality: { measure: 'A scoped independent security assessment covers the production service and has verified closure of all critical findings' },
  stakeholder_confidence_reputation: { measure: 'A representative customer-trust survey and complaint register show delivery against a pre-registered service objective, including adverse findings' },
  signal_to_decision_speed: { measure: 'Median elapsed time from a recorded material operational signal to an authorized decision across the reporting window', operator: '<=', threshold: 5, criticalThreshold: 1, unit: 'business days' },
  escalation_trigger_discipline: { measure: 'A representative escalation drill follows pre-approved incident thresholds, named decision rights and response deadlines' },
  resource_reallocation: { measure: 'A completed reallocation exercise moves budget or staff to a critical priority within a pre-approved deadline while preserving service objectives' },
  leadership_depth_succession: { measure: 'Share of named critical leadership responsibilities with a tested deputy or succession arrangement', operator: '>=', threshold: 100, unit: '%' },
  critical_skills_retention: { measure: 'Trailing 12-month regretted voluntary turnover among a pre-defined critical-role cohort', operator: '<=', threshold: 15, unit: '%' },
  adaptability_knowledge_continuity: { measure: 'A substitute operator successfully executes a representative critical process using maintained documentation without relying on its original owner' },
  cloud_technology_partners: { measure: 'A tested joint incident-response procedure demonstrates working support escalation and access to current partner service commitments' },
  channel_strategic_partners: { measure: 'A signed active channel or alliance arrangement delivers measurable agreed outcomes, with a tested replacement or direct-sales contingency' },
  switching_cost_ecosystem_resilience: { measure: 'A representative customer-data export and integration migration exercise meets documented portability and continuity objectives; lock-in alone does not qualify' },
};

export function getCriteria(subdivisionKey: string, profile: SaaSProfile = 'standard'): Criterion[] {
  const outcome = OUTCOMES[subdivisionKey];
  const sub = Object.values(SUBDIVISIONS).flat().find(item => item.key === subdivisionKey);
  if (!outcome || !sub) throw new Error('Unknown SaaS sub-dimension');
  return [
    { id: 'defined', level: 2, requirement: `${sub.name}: a dated process or control specifies scope, accountable owner, measurement method and response thresholds.` },
    { id: 'operating', level: 2, requirement: `${sub.name}: dated execution records demonstrate the defined process is in place, not only a plan or claim.` },
    { id: 'outcome', level: 3, requirement: outcome.measure, unit: outcome.unit, operator: outcome.operator,
      threshold: profile === 'critical' ? outcome.criticalThreshold ?? outcome.threshold : outcome.threshold },
    { id: 'repeatable', level: 3, requirement: 'Number of distinct successful operating reviews or representative tests at least 90 days apart, with results and material failures disclosed.', unit: 'observations', operator: '>=', threshold: 2 },
    { id: 'adaptive', level: 4, requirement: `${sub.name}: an operating automated or predictive control detects deviations and initiates a documented response, demonstrated by dated execution records.` },
    { id: 'integrated', level: 4, requirement: `${sub.name}: a representative cross-system or cross-team disruption test demonstrates integrated control execution and closure of critical findings.` },
    { id: 'assured', level: 'position', requirement: 'An independent reviewer, auditor or witnessed internal assurance function validates the capability outcomes, including adverse evidence; a company assertion alone is not sufficient.' },
    { id: 'scope', level: 'position', requirement: 'Percentage of pre-defined applicable critical scope covered by documented controls and tests, with numerator and denominator disclosed.', unit: '%', operator: '>=', threshold: 100 },
  ];
}

export function validPolicy(policy: ScoringPolicy | undefined): policy is ScoringPolicy {
  return !!policy && policy.rubricVersion === RUBRIC_VERSION && ['standard', 'critical'].includes(policy.profile) &&
    (policy.reviewMode === undefined || ['manual', 'llm_assisted'].includes(policy.reviewMode)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(policy.periodStart) && /^\d{4}-\d{2}-\d{2}$/.test(policy.periodEnd) &&
    validDate(policy.periodStart) && validDate(policy.periodEnd) &&
    policy.periodStart <= policy.periodEnd && !!policy.approvedAt && !!policy.approvalReason?.trim();
}

export function getCriterionReviewMode(policy?: ScoringPolicy): CriterionReviewMode {
  return policy?.reviewMode === 'manual' ? 'manual' : 'llm_assisted';
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function quoteContainsDate(quote: string, isoDate: string): boolean {
  if (quote.includes(isoDate)) return true;
  const [yearText, , dayText] = isoDate.split('-');
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const shortMonth = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = String(Number(dayText));
  const year = yearText;
  const normalizedQuote = quote.toLocaleLowerCase('en-US');
  return [
    `${month} ${day}, ${year}`,
    `${month} ${day} ${year}`,
    `${shortMonth} ${day}, ${year}`,
    `${shortMonth} ${day} ${year}`,
    `${day} ${month} ${year}`,
    `${day} ${shortMonth} ${year}`,
  ].some(formattedDate => normalizedQuote.includes(formattedDate.toLocaleLowerCase('en-US')));
}

export function evidenceSnapshot(evidence: Evidence[]): string {
  return JSON.stringify([...evidence].sort((first, second) => first.id.localeCompare(second.id)).map(item => ({
    id: item.id, status: item.status, claim: item.claim, value: item.extractedValue, excerpt: item.supportingExcerpt,
    date: item.publicationDate, source: item.sourceType, url: item.sourceUrl, mock: item.isMock,
    title: item.sourceTitle, publisher: item.publisher, page: item.pageNumber, origin: item.sourceOrigin, resolved: item.urlResolved,
  })));
}

export function evaluateCriteria(subdivisionKey: string, findings: CriterionFinding[], evidence: Evidence[], policy: ScoringPolicy) {
  if (!validPolicy(policy)) throw new Error('Approve a current rubric and reporting window first');
  const criteria = getCriteria(subdivisionKey, policy.profile);
  if (!Array.isArray(findings) || findings.length !== criteria.length || new Set(findings.map(item => item.criterionId)).size !== criteria.length) {
    throw new CriterionValidationError({ criterionId: null, fields: [], message: 'Provide exactly one finding for each of the eight criteria.' });
  }
  const resolved = criteria.map(criterion => {
    const finding = findings.find(item => item.criterionId === criterion.id);
    if (!finding || !['met', 'not_met', 'unknown'].includes(finding.status)) {
      throw new CriterionValidationError({ criterionId: criterion.id, fields: ['finding'], message: `Criterion ${criterion.id}: choose Met, Not Met or Unknown.` });
    }
    if (typeof finding.rationale !== 'string') {
      throw new CriterionValidationError({ criterionId: criterion.id, fields: ['criterionRationale'], message: `Criterion ${criterion.id}: enter a rationale for this finding.` });
    }
    if (finding.status === 'unknown') return 'unknown';
    if (finding.basis !== 'record') {
      throw new CriterionValidationError({ criterionId: criterion.id, fields: ['finding', 'supportingRecord'], message: `Criterion ${criterion.id}: unsupported claims cannot establish a definite finding. Cite a documented record or set the finding to Unknown.` });
    }
    const source = evidence.find(item => item.id === finding.evidenceId && item.status === 'accepted' && !item.isMock && item.subdivisionKey === subdivisionKey);
    if (!source) {
      throw new CriterionValidationError({ criterionId: criterion.id, fields: ['supportingRecord'], code: 'evidence', observedAt: finding.observedAt || null,
        message: `Criterion ${criterion.id}: the cited evidence ID does not identify an accepted, non-mock record for this sub-dimension. Choose a valid supporting record or mark the finding unknown.` });
    }
    if (typeof finding.quote !== 'string' || finding.quote.trim().length < 12 || !(source.supportingExcerpt || source.claim).includes(finding.quote)) {
      throw new CriterionValidationError({ criterionId: criterion.id, fields: ['exactExcerpt'], code: 'excerpt', observedAt: finding.observedAt || null,
        message: `Criterion ${criterion.id}: the quotation must be copied exactly from the supporting record and contain at least 12 characters. A paraphrase cannot validate the finding.` });
    }
    if (!finding.observedAt || !validDate(finding.observedAt)) {
      throw new CriterionValidationError({ criterionId: criterion.id, fields: ['observationDate'], code: 'observation_date', observedAt: null,
        message: `Criterion ${criterion.id}: a valid measurement or observation date is missing. Establish it from the source or mark the finding unknown; do not substitute the extraction date or assume a fiscal-year label is a calendar date.` });
    }
    if (finding.observedAt < policy.periodStart || finding.observedAt > policy.periodEnd) {
      throw new CriterionValidationError({ criterionId: criterion.id, fields: ['observationDate'], code: 'reporting_window', observedAt: finding.observedAt,
        message: `Criterion ${criterion.id}: extracted observation date ${finding.observedAt} is outside reporting window ${policy.periodStart} to ${policy.periodEnd}. Verify the source date. For a historical evaluation, create a new assessment with a window covering that observation; for this evaluation, collect evidence inside the frozen window. Do not edit the evidence date to make it qualify.` });
    }
    if (criterion.operator && criterion.threshold !== undefined) {
      if (typeof finding.value !== 'number' || !Number.isFinite(finding.value) || finding.value < 0) {
        throw new CriterionValidationError({ criterionId: criterion.id, fields: ['measuredValue'], message: `Criterion ${criterion.id}: enter a nonnegative numeric ${criterion.unit} value supported by the cited excerpt.` });
      }
      if (criterion.id === 'repeatable') {
        const dates = finding.observationDates;
        if (!Array.isArray(dates) || new Set(dates).size !== dates.length || dates.length !== finding.value ||
          dates.some(date => !validDate(date) || date < policy.periodStart || date > policy.periodEnd || !quoteContainsDate(finding.quote, date))) {
          throw new CriterionValidationError({ criterionId: criterion.id, fields: ['repeatabilityDates', 'exactExcerpt'], message: 'Criterion repeatable: provide distinct ISO observation dates within the reporting window. Each date must match a calendar date stated in the exact cited excerpt; prose dates such as October 31, 2024 are accepted.' });
        }
        const span = dates.length ? Math.max(...dates.map(Date.parse)) - Math.min(...dates.map(Date.parse)) : 0;
        return dates.length >= 2 && span >= 90 * 86400000 ? 'met' : 'not_met';
      }
      const quotedNumbers = finding.quote.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
      if (!quotedNumbers.includes(finding.value)) {
        throw new CriterionValidationError({ criterionId: criterion.id, fields: ['measuredValue', 'exactExcerpt'], message: `Criterion ${criterion.id}: the numeric value must appear in the exact cited excerpt. Check the value and quotation.` });
      }
      if (criterion.id === 'scope' && finding.value > 100) {
        throw new CriterionValidationError({ criterionId: criterion.id, fields: ['measuredValue'], message: 'Criterion scope: coverage cannot exceed 100%.' });
      }
      return (criterion.operator === '>=' ? finding.value >= criterion.threshold : finding.value <= criterion.threshold) ? 'met' : 'not_met';
    }
    return finding.status;
  });
  let maturityLevel: MaturityLevel = 1;
  for (const level of [2, 3, 4] as const) {
    const gate = resolved.filter((_, index) => criteria[index].level === level);
    if (gate.includes('not_met')) break;
    if (gate.includes('unknown')) return { maturityLevel: null, position: null, resolved, reason: `Level ${level} eligibility is unknown` };
    maturityLevel = level;
  }
  const strength = resolved.slice(6);
  if (strength.includes('unknown')) return { maturityLevel: null, position: null, resolved, reason: 'Position criteria are unknown' };
  const met = strength.filter(item => item === 'met').length;
  const position = met === 2 ? 'High' as const : met === 1 ? 'Mid' as const : 'Low' as const;
  return { maturityLevel, position, resolved, reason: `Cumulative gates support Level ${maturityLevel}; ${met}/2 Position criteria met` };
}