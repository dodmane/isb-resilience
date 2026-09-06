import { type DimensionScore } from '@/types/scoring';
import { type ScenarioAssessment } from '@/types/scenario';
import { type Evidence } from '@/types/evidence';
import { type ResilienceGap, type ResilienceClassification } from '@/types/resilience';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SCENARIOS } from '@/lib/framework/scenarios';
import { v4 as uuidv4 } from 'uuid';

export function classifyDimension(
  dimScore: DimensionScore,
  scenarioAssessments: ScenarioAssessment[]
): ResilienceClassification {
  if (!dimScore.maturityLevel) return 'exposed';
  const scenarioLevels = scenarioAssessments
    .filter(sa => sa.dimensionKey === dimScore.dimensionKey && sa.scenarioMaturity !== null)
    .map(sa => sa.scenarioMaturity!);

  if (scenarioLevels.length === 0) {
    return dimScore.maturityLevel >= 3 ? 'strong' : 'exposed';
  }

  const allAbove3 = scenarioLevels.every(l => l >= 3);
  const someBelow3 = scenarioLevels.some(l => l < 3);
  const allBelow3 = scenarioLevels.every(l => l < 3);

  if (dimScore.maturityLevel >= 3 && allAbove3) return 'strong';
  if (allBelow3 || dimScore.maturityLevel < 3) return 'exposed';
  if (someBelow3) return 'conditional';
  return 'strong';
}

export function generateResilienceGaps(
  assessmentId: string,
  dimScores: DimensionScore[],
  scenarioAssessments: ScenarioAssessment[],
  evidence: Evidence[]
): ResilienceGap[] {
  const gaps: ResilienceGap[] = [];
  const now = new Date().toISOString();

  for (const dimScore of dimScores) {
    if (!dimScore.maturityLevel) continue;
    const dim = DIMENSIONS.find(d => d.key === dimScore.dimensionKey);
    if (!dim) continue;

    const dimSAs = scenarioAssessments.filter(sa => sa.dimensionKey === dimScore.dimensionKey);
    const classification = classifyDimension(dimScore, dimSAs);

    for (const sa of dimSAs) {
      if (sa.scenarioMaturity === null || sa.direction !== 'weakens') continue;
      const scenario = SCENARIOS.find(s => s.key === sa.scenarioKey);
      const dimEvidence = evidence.filter(
        e => e.dimensionKey === dimScore.dimensionKey && e.status === 'accepted'
      );

      gaps.push({
        id: uuidv4(),
        assessmentId,
        dimensionKey: dimScore.dimensionKey,
        subdivisionKey: null,
        currentMaturity: dimScore.maturityLevel,
        scenarioKey: sa.scenarioKey,
        scenarioMaturity: sa.scenarioMaturity,
        gapDescription: `${dim.name} weakens from Level ${dimScore.maturityLevel} to Level ${sa.scenarioMaturity} under ${scenario?.name || sa.scenarioKey}. ${sa.rationale}`,
        businessImplication: generateImplication(dim.name, dimScore.maturityLevel, sa.scenarioMaturity, scenario?.name || ''),
        recommendation: generateRecommendation(dim.name, classification, scenario?.name || ''),
        supportingEvidenceIds: dimEvidence.map(e => e.id),
        classification,
        createdAt: now,
      });
    }

    // If no weakening scenarios but dimension is exposed at base
    if (dimScore.maturityLevel < 3 && !dimSAs.some(sa => sa.direction === 'weakens')) {
      const dimEvidence = evidence.filter(
        e => e.dimensionKey === dimScore.dimensionKey && e.status === 'accepted'
      );
      gaps.push({
        id: uuidv4(),
        assessmentId,
        dimensionKey: dimScore.dimensionKey,
        subdivisionKey: null,
        currentMaturity: dimScore.maturityLevel,
        scenarioKey: 'base',
        scenarioMaturity: dimScore.maturityLevel,
        gapDescription: `${dim.name} has base maturity Level ${dimScore.maturityLevel} (${dimScore.maturityLevel === 1 ? 'Basic / Not Met' : 'Developing / Partially Met'}), indicating a resilience gap independent of scenario conditions.`,
        businessImplication: `Low base maturity in ${dim.name} means the organization lacks established capability in this area, creating vulnerability regardless of which future scenario materializes.`,
        recommendation: generateRecommendation(dim.name, 'exposed', 'all scenarios'),
        supportingEvidenceIds: dimEvidence.map(e => e.id),
        classification: 'exposed',
        createdAt: now,
      });
    }
  }

  return gaps;
}

function generateImplication(dimName: string, base: number, scenario: number, scenarioName: string): string {
  const drop = base - scenario;
  if (drop >= 2) {
    return `Significant resilience exposure: ${dimName} drops ${drop} levels under ${scenarioName}, indicating that current capability may be insufficient to withstand this scenario. Leadership should prioritize understanding whether this exposure could cascade into broader operational or financial risk.`;
  }
  return `${dimName} weakens under ${scenarioName}, moving from established to developing maturity. This suggests current capability is partially dependent on favorable conditions and may not fully absorb the pressures of this scenario.`;
}

function generateRecommendation(dimName: string, classification: ResilienceClassification, scenarioName: string): string {
  if (classification === 'exposed') {
    return `Leadership should assess whether ${dimName} represents a strategic priority requiring attention before ${scenarioName} conditions materialize. Consider whether current evidence supports a path to stronger maturity or whether this gap requires structural change.`;
  }
  if (classification === 'conditional') {
    return `${dimName} demonstrates conditional resilience — strong under some scenarios but vulnerable under ${scenarioName}. Leadership should evaluate whether scenario-specific preparedness actions could reduce this conditional exposure.`;
  }
  return `${dimName} is classified as strong across scenarios. Maintain monitoring through early-warning indicators to ensure continued resilience.`;
}

export function generateEarlyWarningIndicators(
  dimScores: DimensionScore[],
  scenarioAssessments: ScenarioAssessment[]
): { dimensionKey: string; scenarioKey: string; indicator: string; trigger: string }[] {
  const indicators: { dimensionKey: string; scenarioKey: string; indicator: string; trigger: string }[] = [];

  const INDICATOR_MAP: Record<string, { indicator: string; trigger: string }> = {
    revenue_durability: { indicator: 'Net revenue retention rate trending below 100%', trigger: 'NRR drops below 95% for two consecutive quarters' },
    opex_elasticity: { indicator: 'Operating expense ratio increasing despite revenue pressure', trigger: 'OpEx/Revenue ratio increases >5pp YoY without corresponding growth' },
    capex_optionality: { indicator: 'Committed capex exceeding discretionary capex by >3:1', trigger: 'Unable to defer >30% of planned capex without material business impact' },
    liquidity_runway: { indicator: 'Free cash flow margin declining or turning negative', trigger: 'FCF margin negative for 2+ quarters or cash runway <12 months' },
    operational_continuity: { indicator: 'SLA breach frequency increasing', trigger: 'Uptime drops below 99.5% or >3 major incidents per quarter' },
    erp_data_backbone: { indicator: 'Decision-making delays due to data quality or integration gaps', trigger: 'Executive reporting lag >5 business days or audit control findings increasing' },
    innovation_rd_capacity: { indicator: 'Product release cadence declining or AI feature adoption lagging competitors', trigger: 'Release frequency drops >30% or key product roadmap items delayed >2 quarters' },
    market_development_sales: { indicator: 'Sales pipeline coverage ratio declining', trigger: 'Pipeline coverage drops below 3x or CAC payback exceeds 24 months' },
    business_development_ma: { indicator: 'Partnership pipeline thinning or M&A integration issues emerging', trigger: 'No new strategic partnerships in 12 months or integration milestones missed' },
    technology_ai_cyber: { indicator: 'Security incident frequency or severity increasing', trigger: 'Critical vulnerability count increases >50% or breach/near-miss event occurs' },
    sustainability_environmental: { indicator: 'Sustainability disclosure gaps or regulatory non-compliance risk', trigger: 'Mandatory disclosure deadline at risk or Scope emissions increasing >10% YoY' },
    trust_regulation_reputation: { indicator: 'Regulatory inquiries, privacy complaints or NPS declining', trigger: 'Regulatory fine, privacy breach or NPS drops >10 points' },
    decision_agility: { indicator: 'Signal-to-decision cycle time lengthening', trigger: 'Average decision cycle exceeds 2x historical norm' },
    talent_culture_resilience: { indicator: 'Key-person attrition or Glassdoor ratings declining', trigger: 'Critical role vacancy >90 days or voluntary attrition exceeds 20%' },
    ecosystem_partner_strength: { indicator: 'Cloud provider concentration increasing or partner-sourced revenue declining', trigger: 'Single cloud provider >80% of compute or partner revenue drops >15% YoY' },
  };

  for (const dimScore of dimScores) {
    if (!dimScore.maturityLevel) continue;
    const weakening = scenarioAssessments.filter(
      sa => sa.dimensionKey === dimScore.dimensionKey && sa.direction === 'weakens'
    );

    if (weakening.length > 0 || dimScore.maturityLevel < 3) {
      const mapEntry = INDICATOR_MAP[dimScore.dimensionKey];
      if (mapEntry) {
        const worstScenario = weakening.sort((a, b) => (a.scenarioMaturity ?? 4) - (b.scenarioMaturity ?? 4))[0];
        indicators.push({
          dimensionKey: dimScore.dimensionKey,
          scenarioKey: worstScenario?.scenarioKey || 'base',
          indicator: mapEntry.indicator,
          trigger: mapEntry.trigger,
        });
      }
    }
  }

  return indicators;
}
