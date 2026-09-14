import { type Evidence } from '@/types/evidence';
import { type MaturityLevel, type Confidence } from '@/types/assessment';
import { isLLMConfigured, callLLMJSON } from './client';
import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { type DimensionKey } from '@/lib/framework/dimensions';

export interface ScoringRecommendation {
  maturityLevel: MaturityLevel | null;
  confidence: Confidence;
  rationale: string;
  status: 'scored' | 'insufficient_evidence';
}

export async function recommendSubdivisionScoreAsync(
  dimensionKey: string,
  subdivisionKey: string,
  evidence: Evidence[],
  useMockData: boolean = false
): Promise<ScoringRecommendation> {
  const accepted = evidence.filter(e => e.status === 'accepted');
  if (accepted.length === 0) {
    return {
      maturityLevel: null, confidence: 'low',
      rationale: 'NOT SCORED — INSUFFICIENT EVIDENCE. No accepted evidence available for this subdivision.',
      status: 'insufficient_evidence',
    };
  }

  if (useMockData) {
    return recommendSubdivisionScore(dimensionKey, subdivisionKey, evidence);
  }

  if (!isLLMConfigured()) {
    throw new Error('LLM API key is not configured (ANTHROPIC_API_KEY is missing). Enable "Use Mock Data" in settings if you wish to run without an LLM key.');
  }

  const dim = DIMENSIONS.find(d => d.key === dimensionKey);
  const sub = SUBDIVISIONS[dimensionKey as DimensionKey]?.find(s => s.key === subdivisionKey);

  const systemPrompt = `You are an AURORA resilience assessment analyst. Score subdivisions on a 1-4 maturity scale:
1 = Basic / Not Met
2 = Developing / Partially Met
3 = Established / Mostly Met
4 = Advanced / Fully Met
Base your score ONLY on the provided evidence. If evidence is insufficient, return null.`;

  const evidenceSummary = accepted.map(e => `- ${e.claim} (Source: ${e.sourceTitle}, ${e.publisher})`).join('\n');

  const userPrompt = `Dimension: ${dim?.name || dimensionKey}
Subdivision: ${sub?.name || subdivisionKey} — ${sub?.description || ''}

Evidence:
${evidenceSummary}

Return JSON:
{
  "maturityLevel": 1|2|3|4|null,
  "confidence": "high"|"medium"|"low",
  "rationale": "2-3 sentence explanation of the score based on the evidence"
}`;

  const result = await callLLMJSON<{ maturityLevel: number | null; confidence: Confidence; rationale: string }>(systemPrompt, userPrompt);
  return {
    maturityLevel: result.maturityLevel as MaturityLevel | null,
    confidence: result.confidence || 'medium',
    rationale: result.rationale || '',
    status: result.maturityLevel ? 'scored' : 'insufficient_evidence',
  };
}

// Mock scoring — used as fallback
export function recommendSubdivisionScore(
  dimensionKey: string,
  subdivisionKey: string,
  evidence: Evidence[]
): ScoringRecommendation {
  const accepted = evidence.filter(e => e.status === 'accepted');

  if (accepted.length === 0) {
    return {
      maturityLevel: null,
      confidence: 'low',
      rationale: 'NOT SCORED — INSUFFICIENT EVIDENCE. No accepted evidence available for this subdivision.',
      status: 'insufficient_evidence',
    };
  }

  // Mock heuristic: score based on evidence quality signals
  const hasPrimary = accepted.some(e =>
    ['annual_report', 'regulatory_filing'].includes(e.sourceType)
  );
  const hasUrl = accepted.some(e => e.urlResolved);
  const isRecent = accepted.some(e => {
    if (!e.publicationDate) return false;
    const age = Date.now() - new Date(e.publicationDate).getTime();
    return age < 2 * 365 * 24 * 60 * 60 * 1000;
  });

  let level: MaturityLevel;
  let confidence: Confidence;

  if (accepted.length >= 3 && hasPrimary && hasUrl) {
    level = 3;
    confidence = 'high';
  } else if (accepted.length >= 2 && (hasPrimary || hasUrl)) {
    level = 3;
    confidence = 'medium';
  } else if (accepted.length >= 1 && hasUrl) {
    level = 2;
    confidence = 'medium';
  } else {
    level = 2;
    confidence = 'low';
  }

  const sourceList = accepted.map(e => e.sourceTitle).join('; ');
  const rationale = `Based on ${accepted.length} accepted evidence item(s) (${sourceList}). ` +
    `Primary source: ${hasPrimary ? 'Yes' : 'No'}. ` +
    `Verified URL: ${hasUrl ? 'Yes' : 'No'}. ` +
    `Recent (<2yr): ${isRecent ? 'Yes' : 'No'}. ` +
    `[Heuristic scoring — configure LLM API for AI-powered analysis]`;

  return { maturityLevel: level, confidence, rationale, status: 'scored' };
}

export function assessConfidence(evidence: Evidence[]): Confidence {
  const accepted = evidence.filter(e => e.status === 'accepted');
  if (accepted.length === 0) return 'low';

  const hasPrimary = accepted.some(e =>
    ['annual_report', 'regulatory_filing'].includes(e.sourceType)
  );
  const isRecent = accepted.some(e => {
    if (!e.publicationDate) return false;
    const age = Date.now() - new Date(e.publicationDate).getTime();
    return age < 365 * 24 * 60 * 60 * 1000;
  });
  const multiSource = accepted.length >= 2;

  if (multiSource && hasPrimary && isRecent) return 'high';
  if (hasPrimary || (multiSource && isRecent)) return 'medium';
  return 'low';
}

export function aggregateConfidence(confidences: Confidence[]): Confidence {
  if (confidences.length === 0) return 'low';
  const vals = confidences.map(c => c === 'high' ? 3 : c === 'medium' ? 2 : 1);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  if (avg >= 2.5) return 'high';
  if (avg >= 1.5) return 'medium';
  return 'low';
}
