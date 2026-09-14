import { type ScenarioKey, SCENARIOS } from '@/lib/framework/scenarios';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { type MaturityLevel, type Confidence } from '@/types/assessment';
import { type ScenarioDirection } from '@/types/scenario';
import { type DimensionScore } from '@/types/scoring';
import { type Evidence } from '@/types/evidence';
import { isLLMConfigured, callLLMJSON } from './client';

export interface ScenarioReasoningResult {
  scenarioMaturity: MaturityLevel | null;
  direction: ScenarioDirection;
  rationale: string;
  confidence: Confidence;
  isMock: boolean;
}

export async function generateScenarioReasoningAsync(
  scenarioKey: ScenarioKey,
  dimensionKey: string,
  baseScore: DimensionScore,
  relevantEvidence: Evidence[],
  useMockData: boolean = false
): Promise<ScenarioReasoningResult> {
  if (!baseScore.maturityLevel) {
    return {
      scenarioMaturity: null, direction: 'stable',
      rationale: 'Base maturity not scored — cannot assess scenario impact.',
      confidence: 'low', isMock: false,
    };
  }

  if (useMockData) {
    return generateScenarioReasoningMock(scenarioKey, dimensionKey, baseScore, relevantEvidence);
  }

  if (!isLLMConfigured()) {
    throw new Error('LLM API key is not configured (ANTHROPIC_API_KEY is missing). Enable "Use Mock Data" in settings if you wish to run without an LLM key.');
  }

  return reasonWithLLM(scenarioKey, dimensionKey, baseScore, relevantEvidence);
}

async function reasonWithLLM(
  scenarioKey: ScenarioKey,
  dimensionKey: string,
  baseScore: DimensionScore,
  relevantEvidence: Evidence[]
): Promise<ScenarioReasoningResult> {
  const scenario = SCENARIOS.find(s => s.key === scenarioKey);
  const dimension = DIMENSIONS.find(d => d.key === dimensionKey);
  const accepted = relevantEvidence.filter(e => e.status === 'accepted');
  const evidenceSummary = accepted.map(e => `- ${e.claim} (${e.sourceTitle})`).join('\n');

  const systemPrompt = `You are an AURORA resilience framework analyst performing scenario stress testing.

You evaluate how a company's current capability (base maturity Level ${baseScore.maturityLevel}) in a specific dimension would perform under a specific future scenario. 

AURORA Maturity Scale: 1=Basic/Not Met, 2=Developing/Partially Met, 3=Established/Mostly Met, 4=Advanced/Fully Met.

Rules:
- The scenario-adjusted maturity can go UP (strengthens), stay SAME (stable), or go DOWN (weakens) relative to base.
- Adjusted maturity must be 1-4.
- Every adjustment requires a clear rationale grounded in how the scenario conditions would affect this capability.
- Reference the specific evidence when explaining your reasoning.`;

  const userPrompt = `Dimension: ${dimension?.name || dimensionKey} — ${dimension?.description || ''}
Base Maturity: Level ${baseScore.maturityLevel}

Stress Shock Vector: ${scenario?.name || scenarioKey}
- Category: ${scenario?.category || ''}
- Trigger Condition: ${scenario?.triggerCondition || ''}
- Sensitivity Driver: ${scenario?.sensitivityDriver || ''}
- Description: ${scenario?.description || ''}

Accepted Evidence:
${evidenceSummary || 'No specific evidence available.'}

How would this dimension's maturity change under this targeted shock vector? Return JSON:
{
  "scenarioMaturity": 1|2|3|4,
  "direction": "strengthens"|"stable"|"weakens",
  "confidence": "high"|"medium"|"low",
  "rationale": "2-3 sentence explanation referencing the evidence and shock conditions"
}`;

  const result = await callLLMJSON<{
    scenarioMaturity: number;
    direction: ScenarioDirection;
    confidence: Confidence;
    rationale: string;
  }>(systemPrompt, userPrompt);

  const adjusted = Math.max(1, Math.min(4, result.scenarioMaturity)) as MaturityLevel;
  let direction: ScenarioDirection;
  if (adjusted > baseScore.maturityLevel!) direction = 'strengthens';
  else if (adjusted < baseScore.maturityLevel!) direction = 'weakens';
  else direction = 'stable';

  return {
    scenarioMaturity: adjusted,
    direction,
    rationale: result.rationale || '',
    confidence: result.confidence || 'medium',
    isMock: false,
  };
}

const IMPACT_MAP: Record<ScenarioKey, Record<string, { shift: number; reason: string }>> = {
  revenue_compression: {
    revenue_durability: { shift: -1, reason: 'Sudden NRR contraction and enterprise budget freezes directly erode recurring revenue.' },
    market_development_sales: { shift: -1, reason: 'Sales cycles lengthen and new pipeline conversion drops sharply.' },
    liquidity_runway: { shift: -1, reason: 'Revenue decline compresses operating cash flow and accelerates burn rate.' },
    opex_elasticity: { shift: -1, reason: 'Immediate pressure to reduce operating spend and sales commissions.' },
    ecosystem_partner_strength: { shift: -1, reason: 'Channel partners and platform co-selling revenue contract.' },
  },
  cloud_cyber_outage: {
    operational_continuity: { shift: -1, reason: 'Multi-region outage directly tests SLA commitments and disaster recovery protocols.' },
    technology_ai_cyber: { shift: -1, reason: 'Zero-day vulnerability or breach tests security posture and patch velocity.' },
    trust_regulation_reputation: { shift: -1, reason: 'Service unavailability and security incidents degrade customer trust and risk SLA penalties.' },
    erp_data_backbone: { shift: -1, reason: 'Data sync failure and operational logging interruptions create decision blind spots.' },
  },
  cogs_margin_squeeze: {
    opex_elasticity: { shift: -1, reason: 'Uncontrollable cloud/LLM hosting cost spikes compress gross margins.' },
    capex_optionality: { shift: -1, reason: 'Capital commitment to infrastructure optimization increases while discretionary spend is cut.' },
    liquidity_runway: { shift: -1, reason: 'Margin erosion reduces net cash generation and shortens cash runway.' },
    innovation_rd_capacity: { shift: -1, reason: 'Engineering capacity forced from new product R&D to cloud cost optimization.' },
  },
  talent_attrition: {
    talent_culture_resilience: { shift: -1, reason: 'Key technical leadership departure exposes bench depth gaps and demoralizes team.' },
    innovation_rd_capacity: { shift: -1, reason: 'Engineering velocity drops as critical domain knowledge is lost.' },
    decision_agility: { shift: -1, reason: 'Escalation and signal resolution slow down due to key-person absence.' },
    technology_ai_cyber: { shift: -1, reason: 'Security and AI architecture governance compromised by loss of lead architects.' },
  },
  capital_market_freeze: {
    liquidity_runway: { shift: -1, reason: 'Inability to access external capital and extended DSO severely strain cash buffer.' },
    business_development_ma: { shift: -1, reason: 'M&A appetite and partnership co-investments frozen due to liquidity conservation.' },
    capex_optionality: { shift: -1, reason: 'Software capitalization and infrastructure investments deferred or canceled.' },
    opex_elasticity: { shift: -1, reason: 'Rigid cost structures become existential risks without capital market backstop.' },
  },
  ai_disruption_commodity: {
    innovation_rd_capacity: { shift: -1, reason: 'Autonomous AI agents commoditize core product features, exposing R&D lag.' },
    revenue_durability: { shift: -1, reason: 'Per-seat pricing models collapse as clients deploy internal AI agents to replace human seats.' },
    market_development_sales: { shift: -1, reason: 'Traditional UI-focused sales value proposition loses traction against AI-native alternatives.' },
    ecosystem_partner_strength: { shift: -1, reason: 'Platform aggregators and AI copilots disintermediate traditional partner channels.' },
  },
};

export function generateScenarioReasoningMock(
  scenarioKey: ScenarioKey,
  dimensionKey: string,
  baseScore: DimensionScore,
  relevantEvidence: Evidence[]
): ScenarioReasoningResult {
  const scenario = SCENARIOS.find(s => s.key === scenarioKey);
  DIMENSIONS.find(d => d.key === dimensionKey);

  if (!baseScore.maturityLevel || baseScore.maturityLevel === null) {
    return {
      scenarioMaturity: null,
      direction: 'stable',
      rationale: 'Base maturity not scored — cannot assess scenario impact.',
      confidence: 'low',
      isMock: true,
    };
  }

  const impact = IMPACT_MAP[scenarioKey]?.[dimensionKey] || { shift: 0, reason: 'No specific scenario impact identified.' };
  const base = baseScore.maturityLevel;
  const adjusted = Math.max(1, Math.min(4, base + impact.shift)) as MaturityLevel;

  let direction: ScenarioDirection;
  if (adjusted > base) direction = 'strengthens';
  else if (adjusted < base) direction = 'weakens';
  else direction = 'stable';

  const evidenceSummary = relevantEvidence.length > 0
    ? ` Based on ${relevantEvidence.length} evidence item(s).`
    : ' No specific evidence linked.';

  const rationale =
    `Under ${scenario?.name || scenarioKey} (${scenario?.description || ''}): ` +
    `${impact.reason}` +
    ` Base maturity Level ${base} ${direction === 'weakens' ? 'weakens to' : direction === 'strengthens' ? 'strengthens to' : 'remains at'} Level ${adjusted}.` +
    evidenceSummary +
    ` [Heuristic-based — configure LLM API for AI-powered reasoning]`;

  const confidence: Confidence = relevantEvidence.length >= 2 ? 'medium' : 'low';

  return { scenarioMaturity: adjusted, direction, rationale, confidence, isMock: true };
}
