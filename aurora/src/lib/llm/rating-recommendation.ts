import { type Evidence } from '@/types/evidence';
import { type MaturityLevel, type Confidence } from '@/types/assessment';
import { isLLMConfigured, callLLMJSON } from './client';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';
import { isScoringPosition, type ScoringPosition } from '@/lib/framework/scoring';
import { assessConfidence } from './scoring-recommendation';

export interface RatingRecommendation {
  maturityLevel: MaturityLevel | null;
  position: ScoringPosition | null;
  confidence: Confidence;
  rationale: string;
  evidenceIds: string[];
  status: 'scored' | 'insufficient_evidence';
  isFallback: boolean;
}
export const RATING_PROMPT_VERSION = 'level-position-recommendation-1.0';

function unscored(message: string, evidence: Evidence[]): RatingRecommendation {
  return {
    maturityLevel: null,
    position: null,
    confidence: assessConfidence(evidence),
    rationale: message,
    evidenceIds: [],
    status: 'insufficient_evidence',
    isFallback: true,
  };
}

export async function recommendSubdivisionRatingAsync(
  dimensionKey: string,
  subdivisionKey: string,
  evidence: Evidence[]
): Promise<RatingRecommendation> {
  const accepted = evidence.filter(item => item.status === 'accepted' && !item.isMock &&
    item.dimensionKey === dimensionKey && item.subdivisionKey === subdivisionKey);
  if (accepted.length === 0) {
    return unscored('No accepted evidence is available. Enter a rating manually only after attaching supporting evidence, or leave this sub-dimension unscored.', accepted);
  }
  if (!isLLMConfigured()) {
    return unscored('AI suggestions are unavailable because no scoring LLM is configured. Enter Level and Position manually.', accepted);
  }

  const dimension = DIMENSIONS.find(item => item.key === dimensionKey);
  const subdivision = SUBDIVISIONS[dimensionKey as DimensionKey]?.find(item => item.key === subdivisionKey);
  const evidencePayload = accepted.map(item => ({
    id: item.id,
    claim: item.claim,
    extractedValue: item.extractedValue,
    excerpt: item.supportingExcerpt || item.claim,
    source: item.sourceTitle,
    publisher: item.publisher,
    sourceType: item.sourceType,
    publicationDate: item.publicationDate,
  }));
  const systemPrompt = `You are an AURORA SaaS resilience analyst. Recommend a Level and Position for the specified sub-dimension from the accepted evidence supplied.
Level 1: capability absent or weak. Level 2: some capability exists, but it is inconsistent or incomplete. Level 3: most capability requirements are met through reliable, repeatable processes. Level 4: capability is fully met and advanced, integrated or predictive.
Position Low means the evidence barely supports the selected Level; Mid means it clearly supports it; High means it strongly supports it but does not establish the next Level. For borderline cases, choose the lower Level with High Position.
Use only the supplied evidence. Do not invent facts, infer undisclosed performance, or treat missing disclosure as evidence of failure. If a defensible rating is not possible, return maturityLevel and position as null and explain what is missing.
Return only evidence IDs from the supplied list. Give a concise rationale. This is a recommendation for human review, not a final score.`;
  const userPrompt = `Dimension: ${dimension?.name || dimensionKey}
Sub-dimension: ${subdivision?.name || subdivisionKey}
Description: ${subdivision?.description || ''}

Accepted evidence:
${JSON.stringify(evidencePayload)}

Return JSON with maturityLevel (1-4 or null), position (Low/Mid/High or null), confidence (high/medium/low), evidenceIds (array of supplied IDs), and rationale.`;

  try {
    const result = await callLLMJSON<{
      maturityLevel?: unknown;
      position?: unknown;
      confidence?: unknown;
      evidenceIds?: unknown;
      rationale?: unknown;
    }>(systemPrompt, userPrompt);
    const noRating = result.maturityLevel === null && result.position === null;
    const validLevel = Number.isInteger(result.maturityLevel) && [1, 2, 3, 4].includes(result.maturityLevel as number);
    if (!(noRating || (validLevel && isScoringPosition(result.position))) || typeof result.rationale !== 'string') {
      throw new Error('The LLM response did not contain a valid Level/Position pair and rationale');
    }
    const acceptedIds = new Set(accepted.map(item => item.id));
    const evidenceIds = Array.isArray(result.evidenceIds)
      ? [...new Set(result.evidenceIds.filter((id): id is string => typeof id === 'string' && acceptedIds.has(id)))]
      : [];
    if (validLevel && evidenceIds.length === 0) throw new Error('The LLM did not reference an accepted evidence item');
    const maturityLevel = validLevel ? result.maturityLevel as MaturityLevel : null;
    const position = validLevel && isScoringPosition(result.position) ? result.position : null;
    return {
      maturityLevel,
      position,
      confidence: ['high', 'medium', 'low'].includes(result.confidence as string) ? result.confidence as Confidence : assessConfidence(accepted),
      rationale: result.rationale,
      evidenceIds,
      status: maturityLevel === null ? 'insufficient_evidence' : 'scored',
      isFallback: false,
    };
  } catch (error) {
    return unscored(`AI could not provide a usable Level/Position suggestion: ${error instanceof Error ? error.message : 'unknown extraction error'}. Enter it manually if the evidence supports a rating.`, accepted);
  }
}