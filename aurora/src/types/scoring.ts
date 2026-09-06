import { type MaturityLevel, type Confidence } from './assessment';

export type ScoringStatus = 'not_started' | 'insufficient_evidence' | 'scored' | 'overridden';

export interface SubdivisionScore {
  id: string;
  assessmentId: string;
  dimensionKey: string;
  subdivisionKey: string;
  maturityLevel: MaturityLevel | null;
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
