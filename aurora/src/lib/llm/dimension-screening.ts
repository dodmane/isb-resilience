import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SAAS_MATERIALITY } from '@/lib/framework/materiality';
import { type DimensionSelection } from '@/types/assessment';
import { isLLMConfigured, callLLMJSON } from './client';

export async function recommendDimensionSelections(
  companyName: string,
  industry: string,
  companySize: string,
  companyDescription: string
): Promise<DimensionSelection[]> {
  if (isLLMConfigured()) {
    try {
      return await recommendWithLLM(companyName, industry, companySize, companyDescription);
    } catch (err) {
      console.error('LLM dimension recommendation failed, using defaults:', err);
    }
  }
  return getDefaultSelections();
}

async function recommendWithLLM(
  companyName: string,
  industry: string,
  companySize: string,
  companyDescription: string
): Promise<DimensionSelection[]> {
  const dimList = DIMENSIONS.map(d => `- ${d.key}: ${d.name} — ${d.description}`).join('\n');

  const systemPrompt = `You are an AURORA resilience framework analyst. Your job is to identify which of the 15 AURORA dimensions are most material to a specific company's business model for deeper SaaS/IT assessment. All 15 dimensions remain on the radar, but "deepAssessment: true" means the dimension gets 3 structured subdivisions for granular scoring.`;

  const userPrompt = `Company: ${companyName}
Industry: ${industry}
Size: ${companySize}
Description: ${companyDescription}

AURORA Dimensions:
${dimList}

Select which dimensions should receive deep SaaS/IT assessment (3 subdivisions) and explain why each is relevant to ${companyName}. Typically 10-13 of 15 are selected for deep assessment.

Return JSON array:
[
  {
    "dimensionKey": "revenue_durability",
    "selected": true,
    "deepAssessment": true,
    "relevanceRationale": "Why this dimension is material to the company..."
  }
]

Include ALL 15 dimensions. Set deepAssessment=false for dimensions less material to this specific company. Provide a company-specific relevance rationale for each.`;

  const result = await callLLMJSON<Array<{
    dimensionKey: string;
    selected: boolean;
    deepAssessment: boolean;
    relevanceRationale: string;
  }>>(systemPrompt, userPrompt);

  // Ensure all 15 dimensions are covered
  const resultMap = new Map(result.map(r => [r.dimensionKey, r]));
  return DIMENSIONS.map(d => {
    const r = resultMap.get(d.key);
    return {
      dimensionKey: d.key,
      selected: r?.selected ?? true,
      deepAssessment: r?.deepAssessment ?? SAAS_MATERIALITY[d.key].defaultSelected,
      relevanceRationale: r?.relevanceRationale || SAAS_MATERIALITY[d.key].saasRelevance,
    };
  });
}

function getDefaultSelections(): DimensionSelection[] {
  return DIMENSIONS.map(d => ({
    dimensionKey: d.key,
    selected: true,
    deepAssessment: SAAS_MATERIALITY[d.key].defaultSelected,
    relevanceRationale: SAAS_MATERIALITY[d.key].saasRelevance,
  }));
}
