import { type MaturityLevel, type Confidence } from './assessment';
import { type ScoringPosition } from '@/lib/framework/scoring';
import { type CriterionFinding, type ScoringPolicy, type CriterionValidationIssue } from '@/lib/framework/criteria';

export type ScoringStatus = 'not_started' | 'insufficient_evidence' | 'scored' | 'overridden' | 'needs_review' | 'stale';
export type RatingMethod = 'level_position' | 'criteria';

export interface SubdivisionScore {
  id: string;
  assessmentId: string;
  dimensionKey: string;
  subdivisionKey: string;
  maturityLevel: MaturityLevel | null;
  position?: ScoringPosition | null;
  ratingMethod?: RatingMethod;
  criteria?: CriterionFinding[];
  extractionIssue?: CriterionValidationIssue;
  policy?: ScoringPolicy;
  evidenceSnapshot?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  staleReason?: string;
  extractionModel?: string;
  promptVersion?: string;
  absoluteScore?: number | null;
  scoreOverride?: number | null;
  normalizedScore: number | null;
  confidence: Confidence;
  status: ScoringStatus;
  rationale: string;
  overrideReason: string | null;
  evidenceIds: string[];
  isMockRecommendation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DimensionScore {
  id: string;
  assessmentId: string;
  dimensionKey: string;
  maturityLevel: MaturityLevel | null;
  normalizedScore: number | null;
  confidence: Confidence;
  status: ScoringStatus;
  overrideReason: string | null;
  subdivisionScoreIds: string[];
  createdAt: string;
  updatedAt: string;
}
