import { SCENARIOS } from '@/lib/framework/scenarios';
import { isLLMConfigured, callLLMJSON } from './client';

export async function generateScenarioNarratives(
  companyName: string,
  industry: string,
  companySize: string
): Promise<Record<string, string>> {
  if (isLLMConfigured()) {
    try {
      return await generateWithLLM(companyName, industry, companySize);
    } catch (err) {
      console.error('LLM scenario generation failed, using mock:', err);
    }
  }

  const narratives: Record<string, string> = {};
  for (const scenario of SCENARIOS) {
    narratives[scenario.key] = generateNarrative(scenario.key, companyName, industry, companySize);
  }
  return narratives;
}

async function generateWithLLM(
  companyName: string,
  industry: string,
  companySize: string
): Promise<Record<string, string>> {
  const systemPrompt = `You are a strategic scenario planning analyst for the AURORA Enterprise Business Resilience Framework. Generate scenario narratives that are specific to the company being assessed. Each narrative should be 3-4 sentences, grounded in the company's industry and size context.`;

  const userPrompt = `Company: ${companyName}
Industry: ${industry}
Size: ${companySize}

Generate scenario narratives for these four AURORA futures. Return JSON:
{
  "autonomous_advantage": "narrative for High AI / Stable Macro scenario",
  "storm_and_signal": "narrative for High AI / High Macro Disruption scenario",
  "managed_modernization": "narrative for Low AI / Stable Macro scenario",
  "exposed_and_reactive": "narrative for Low AI / High Macro Disruption scenario"
}

Scenario definitions:
- Autonomous Advantage (High AI / Stable Macro): Measurable AI productivity, strong workflow automation, sufficient budgets.
- Storm and Signal (High AI / High Macro Disruption): AI is real but regulation, cyber, budget pressure complicate execution.
- Managed Modernization (Low AI / Stable Macro): Incremental AI, disciplined execution, traditional software economics.
- Exposed and Reactive (Low AI / High Macro Disruption): Limited AI lift + worsening external conditions.

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
    autonomous_advantage: `${sizeCtx}, ${companyName} operates in a future where AI-driven productivity gains are measurable and widely adopted. Customer workflows increasingly embed autonomous and agentic AI, creating competitive advantages for companies that integrate AI deeply into their products and operations. Customer budgets remain sufficient to fund technology investment. In ${industry}, this scenario rewards companies with strong AI readiness, product velocity and engineering capacity. ${companyName} would need to demonstrate that its platform can deliver AI-powered automation, that its data infrastructure supports AI workloads, and that its go-to-market motion can capitalize on customer willingness to invest in AI-driven transformation. The risk is falling behind competitors who move faster on AI integration. [MOCK AI — replace with real LLM research]`,

    storm_and_signal: `${sizeCtx}, ${companyName} faces a future where AI capability is real but execution is complicated by regulation, infrastructure constraints, cybersecurity threats, tightening customer budgets and capital-market pressure. In ${industry}, companies must balance AI investment against near-term financial pressure. ${companyName} would need resilience across multiple dimensions simultaneously — maintaining product relevance while managing costs, navigating new AI regulation, defending against increased cyber risk and retaining customers whose budgets are under pressure. The compound nature of this scenario tests whether the organization can manage complexity without losing strategic coherence. [MOCK AI — replace with real LLM research]`,

    managed_modernization: `${sizeCtx}, ${companyName} operates in a future of incremental AI adoption where traditional software economics and disciplined execution remain the primary drivers of value. In ${industry}, recurring-revenue economics, operational discipline and customer retention matter more than AI-led transformation. ${companyName} would benefit from strong fundamentals — reliable data, efficient operations, disciplined cost management and steady product improvement. The risk is under-investing in future capabilities while competitors gradually build AI advantages. [MOCK AI — replace with real LLM research]`,

    exposed_and_reactive: `${sizeCtx}, ${companyName} faces the most challenging future — limited AI productivity lift combined with worsening macro conditions including recession, geopolitical pressure, tighter customer budgets and regulatory burden. In ${industry}, this scenario tests fundamental survival: can ${companyName} maintain cash flow, retain customers, manage costs and sustain operations under prolonged stress? Liquidity, operational continuity, customer concentration and cost flexibility become the critical resilience factors. [MOCK AI — replace with real LLM research]`,
  };

  return narrativeMap[scenarioKey] || `Scenario narrative for ${companyName}. [MOCK AI]`;
}
