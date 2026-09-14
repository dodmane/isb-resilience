import { SCENARIOS } from '@/lib/framework/scenarios';
import { isLLMConfigured, callLLMJSON } from './client';

export async function generateScenarioNarratives(
  companyName: string,
  industry: string,
  companySize: string,
  useMockData: boolean = false
): Promise<Record<string, string>> {
  if (useMockData) {
    const narratives: Record<string, string> = {};
    for (const scenario of SCENARIOS) {
      narratives[scenario.key] = generateNarrative(scenario.key, companyName, industry, companySize);
    }
    return narratives;
  }

  if (!isLLMConfigured()) {
    throw new Error('LLM API key is not configured (ANTHROPIC_API_KEY is missing). Enable "Use Mock Data" in settings if you wish to run without an LLM key.');
  }

  return generateWithLLM(companyName, industry, companySize);
}

async function generateWithLLM(
  companyName: string,
  industry: string,
  companySize: string
): Promise<Record<string, string>> {
  const systemPrompt = `You are a strategic scenario planning analyst for the AURORA Enterprise Business Resilience Framework. Generate scenario narratives for factor-based shock vectors that are specific to the company being assessed. Each narrative should be 3-4 sentences, grounded in the company's industry and size context.`;

  const userPrompt = `Company: ${companyName}
Industry: ${industry}
Size: ${companySize}

Generate stress narratives for these six AURORA Factor-Based Shock Injection Vectors. Return JSON:
{
  "revenue_compression": "narrative for Revenue & NRR Compression Shock",
  "cloud_cyber_outage": "narrative for Cloud Outage & Zero-Day Cyber Breach Shock",
  "cogs_margin_squeeze": "narrative for COGS & LLM Hosting Inflation Squeeze",
  "talent_attrition": "narrative for Key Technical Leadership Attrition Shock",
  "capital_market_freeze": "narrative for Capital Market & Refinancing Freeze Shock",
  "ai_disruption_commodity": "narrative for AI Disruption & Commodity Shock"
}

Shock vector definitions:
- Revenue & NRR Compression Shock: 25% sudden NRR contraction and enterprise budget freeze.
- Cloud Outage & Zero-Day Cyber Breach: Major multi-region active cloud outage and security breach.
- COGS & LLM Hosting Inflation Squeeze: 40% spike in cloud infrastructure and AI inference costs under locked customer pricing.
- Key Technical Leadership Attrition: Sudden departure of critical engineering, security, and AI leadership.
- Capital Market & Refinancing Freeze: Lockup in equity/debt markets with +60 day extension in customer payment terms.
- AI Disruption & Commodity Shock: Autonomous AI agents commoditize legacy workflows; seat-based pricing collapses as clients deploy internal LLM agents.

Make each narrative specific to ${companyName}'s business model in ${industry}.`;

  return await callLLMJSON<Record<string, string>>(systemPrompt, userPrompt);
}

function generateNarrative(
  scenarioKey: string,
  companyName: string,
  industry: string,
  companySize: string
): string {
  const sizeCtx = companySize === 'large'
    ? 'As a large enterprise'
    : companySize === 'small'
      ? 'As a smaller company'
      : 'As a mid-sized company';

  const narrativeMap: Record<string, string> = {
    revenue_compression: `${sizeCtx} in ${industry}, ${companyName} faces an acute revenue compression shock with Net Revenue Retention dropping 25% due to client spending freezes. Testing customer concentration, pricing power, and contract lock-in.`,
    cloud_cyber_outage: `${sizeCtx} in ${industry}, ${companyName} experiences a major cloud region failure combined with a critical zero-day security incident. Testing SLA commitments, disaster recovery protocols, and customer trust.`,
    cogs_margin_squeeze: `${sizeCtx} in ${industry}, ${companyName} experiences a 40% spike in cloud hosting and LLM inference costs while enterprise pricing contracts remain locked. Testing gross margins and cost structure elasticity.`,
    talent_attrition: `${sizeCtx} in ${industry}, ${companyName} suffers sudden voluntary attrition of key engineering and AI architects. Testing bench depth, R&D momentum, and decision agility.`,
    capital_market_freeze: `${sizeCtx} in ${industry}, ${companyName} faces a freeze in external debt/equity financing combined with extended DSO (+60 days). Testing cash buffer, burn rate, and runway.`,
    ai_disruption_commodity: `${sizeCtx} in ${industry}, ${companyName} is hit by rapid proliferation of autonomous AI agents that commoditize legacy workflows and dismantle seat-based pricing models. Testing proprietary data moats, outcome-based monetization, and AI architectural agility.`,
  };

  return narrativeMap[scenarioKey] || `Stress test narrative for ${companyName} under ${scenarioKey}.`;
}
