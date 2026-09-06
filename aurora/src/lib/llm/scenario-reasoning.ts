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
  relevantEvidence: Evidence[]
): Promise<ScenarioReasoningResult> {
  if (!baseScore.maturityLevel) {
    return {
      scenarioMaturity: null, direction: 'stable',
      rationale: 'Base maturity not scored — cannot assess scenario impact.',
      confidence: 'low', isMock: false,
    };
  }

  if (isLLMConfigured() && relevantEvidence.length > 0) {
    try {
      return await reasonWithLLM(scenarioKey, dimensionKey, baseScore, relevantEvidence);
    } catch (err) {
      console.error('LLM scenario reasoning failed, using heuristic:', err);
    }
  }

  return generateScenarioReasoningMock(scenarioKey, dimensionKey, baseScore, relevantEvidence);
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

Scenario: ${scenario?.name || scenarioKey}
- AI Depth: ${scenario?.aiDepth === 'high' ? 'High' : 'Low'}
- Macro Disruption: ${scenario?.macroDisruption === 'stable' ? 'Stable' : 'Disruptive/High'}
- Description: ${scenario?.description || ''}

Accepted Evidence:
${evidenceSummary || 'No specific evidence available.'}

How would this dimension's maturity change under this scenario? Return JSON:
{
  "scenarioMaturity": 1|2|3|4,
  "direction": "strengthens"|"stable"|"weakens",
  "confidence": "high"|"medium"|"low",
  "rationale": "2-3 sentence explanation referencing the evidence and scenario conditions"
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
  autonomous_advantage: {
    revenue_durability: { shift: 0, reason: 'Stable customer budgets support retention; AI-driven value may increase NRR if product integrates AI effectively.' },
    opex_elasticity: { shift: 0, reason: 'Stable conditions maintain cost flexibility; AI automation may reduce certain operating costs.' },
    capex_optionality: { shift: 0, reason: 'AI investment requirements may increase capex commitment, but sufficient budgets mitigate risk.' },
    liquidity_runway: { shift: 0, reason: 'Stable macro conditions and sufficient customer budgets support cash generation.' },
    operational_continuity: { shift: 0, reason: 'AI workloads increase infrastructure complexity but stable conditions allow managed scaling.' },
    erp_data_backbone: { shift: 0, reason: 'AI adoption increases demand for data quality and integration; data backbone becomes more critical.' },
    innovation_rd_capacity: { shift: 1, reason: 'High AI adoption rewards companies with strong AI readiness and innovation capacity. Companies investing in AI see competitive advantage.' },
    market_development_sales: { shift: 0, reason: 'Sufficient customer budgets maintain healthy pipeline; AI-enhanced sales tools may improve conversion.' },
    business_development_ma: { shift: 0, reason: 'AI ecosystem creates new partnership opportunities in stable conditions.' },
    technology_ai_cyber: { shift: 0, reason: 'AI adoption increases both capability and attack surface; governance and cyber maturity become more important.' },
    sustainability_environmental: { shift: 0, reason: 'AI compute increases energy demands; sustainability programs face growing scrutiny.' },
    trust_regulation_reputation: { shift: 0, reason: 'AI regulation emerging but manageable in stable conditions; trust remains important.' },
    decision_agility: { shift: 0, reason: 'AI provides better signals for faster decision-making in favorable conditions.' },
    talent_culture_resilience: { shift: 0, reason: 'AI talent demand increases competition; stable conditions support retention.' },
    ecosystem_partner_strength: { shift: 0, reason: 'AI ecosystem partnerships become more valuable; platform stickiness may increase.' },
  },
  storm_and_signal: {
    revenue_durability: { shift: -1, reason: 'Customer budget pressure, regulatory friction and competitive disruption challenge retention and demand.' },
    opex_elasticity: { shift: -1, reason: 'Tighter budgets demand rapid cost flexing while maintaining AI investment creates tension.' },
    capex_optionality: { shift: -1, reason: 'AI investment pressure conflicts with capital constraints; deferrability becomes critical.' },
    liquidity_runway: { shift: -1, reason: 'Capital-market pressure, tighter customer budgets and increased costs strain liquidity.' },
    operational_continuity: { shift: -1, reason: 'Cybersecurity threats increase, infrastructure strain from AI + disruption compounds continuity risk.' },
    erp_data_backbone: { shift: 0, reason: 'Data backbone importance increases under pressure; existing capability tested but not typically degraded.' },
    innovation_rd_capacity: { shift: 0, reason: 'AI capability is real but regulatory and budget constraints limit execution speed.' },
    market_development_sales: { shift: -1, reason: 'Customer budget tightening, regulatory complexity and competitive pressure challenge pipeline.' },
    business_development_ma: { shift: -1, reason: 'Capital constraints and execution complexity reduce M&A appetite and integration capacity.' },
    technology_ai_cyber: { shift: -1, reason: 'Cyber threats intensify, AI governance under regulatory pressure, cloud concentration risk increases.' },
    sustainability_environmental: { shift: 0, reason: 'Regulatory disclosure requirements persist regardless of macro conditions.' },
    trust_regulation_reputation: { shift: -1, reason: 'AI regulation tightens, compliance burden increases, reputation risk from AI missteps rises.' },
    decision_agility: { shift: 0, reason: 'Signal complexity increases; companies with strong decision agility are advantaged.' },
    talent_culture_resilience: { shift: -1, reason: 'Talent competition for AI skills intensifies while budget constraints limit retention tools.' },
    ecosystem_partner_strength: { shift: 0, reason: 'Partner dependencies tested but ecosystem resilience may provide stability.' },
  },
  managed_modernization: {
    revenue_durability: { shift: 0, reason: 'Traditional SaaS economics remain strong; recurring-revenue fundamentals tested on their own merit.' },
    opex_elasticity: { shift: 0, reason: 'Stable conditions maintain cost flexibility; traditional operating models remain viable.' },
    capex_optionality: { shift: 0, reason: 'Lower AI investment pressure allows more traditional capex management.' },
    liquidity_runway: { shift: 0, reason: 'Stable macro conditions support steady cash generation.' },
    operational_continuity: { shift: 0, reason: 'Lower AI complexity reduces infrastructure strain; traditional continuity measures sufficient.' },
    erp_data_backbone: { shift: 0, reason: 'Existing data infrastructure tested at current scale without AI-driven transformation pressure.' },
    innovation_rd_capacity: { shift: -1, reason: 'Limited AI adoption means potential competitive gap if rivals invest more in AI. Risk of falling behind.' },
    market_development_sales: { shift: 0, reason: 'Disciplined execution and customer economics remain the primary growth drivers.' },
    business_development_ma: { shift: 0, reason: 'Traditional partnership and M&A models continue to operate effectively.' },
    technology_ai_cyber: { shift: 0, reason: 'Lower AI adoption reduces AI-specific risks; traditional cyber threats remain the focus.' },
    sustainability_environmental: { shift: 0, reason: 'Stable conditions allow measured sustainability program development.' },
    trust_regulation_reputation: { shift: 0, reason: 'Regulatory environment stable; compliance obligations manageable.' },
    decision_agility: { shift: 0, reason: 'Lower disruption intensity means fewer urgent decisions required.' },
    talent_culture_resilience: { shift: 0, reason: 'AI talent pressure lower; traditional talent management approaches remain effective.' },
    ecosystem_partner_strength: { shift: 0, reason: 'Ecosystem dynamics stable; traditional partner relationships maintained.' },
  },
  exposed_and_reactive: {
    revenue_durability: { shift: -1, reason: 'Worsening conditions increase churn risk, budget cuts and demand contraction. Customer concentration becomes critical.' },
    opex_elasticity: { shift: -1, reason: 'Urgency to cut costs while maintaining capability creates difficult trade-offs. Rigidity exposed.' },
    capex_optionality: { shift: -1, reason: 'Capital constraints force deferrals; sunk-cost risk from committed projects increases.' },
    liquidity_runway: { shift: -1, reason: 'Revenue pressure, cost rigidity and capital-market tightening strain cash position and runway.' },
    operational_continuity: { shift: -1, reason: 'Infrastructure under-investment risk; continuity tested by budget cuts and operational pressure.' },
    erp_data_backbone: { shift: 0, reason: 'Data backbone importance increases for visibility during crisis; existing capability tested.' },
    innovation_rd_capacity: { shift: -1, reason: 'R&D budgets under pressure; limited AI lift means product competitiveness relies on fundamentals.' },
    market_development_sales: { shift: -1, reason: 'Demand contraction, longer sales cycles and customer churn pressure pipeline economics.' },
    business_development_ma: { shift: -1, reason: 'M&A activity constrained by capital pressure; partnership leverage reduced.' },
    technology_ai_cyber: { shift: 0, reason: 'Cyber threats persist regardless of macro conditions; limited AI adoption reduces AI-specific risks.' },
    sustainability_environmental: { shift: 0, reason: 'Sustainability programs may be deprioritized under financial pressure but obligations remain.' },
    trust_regulation_reputation: { shift: 0, reason: 'Regulatory obligations persist; reputational risk from cost-cutting decisions.' },
    decision_agility: { shift: -1, reason: 'Crisis decision pressure increases; companies without trigger discipline react too slowly.' },
    talent_culture_resilience: { shift: -1, reason: 'Layoffs, morale pressure and key-person attrition risk under prolonged stress.' },
    ecosystem_partner_strength: { shift: -1, reason: 'Partner ecosystem under stress; switching risk and dependency exposure increase.' },
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
