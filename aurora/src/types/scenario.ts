import { type MaturityLevel, type Confidence } from './assessment';
import { type ScenarioKey } from '@/lib/framework/scenarios';

export type ScenarioDirection = 'strengthens' | 'stable' | 'weakens';

export interface ScenarioAssessment {
  id: string;
  assessmentId: string;
  scenarioKey: ScenarioKey;
  dimensionKey: string;
  baseMaturity: MaturityLevel | null;
  scenarioMaturity: MaturityLevel | null;
  direction: ScenarioDirection;
  rationale: string;
  confidence: Confidence;
  relevantEvidenceIds: string[];
  userApproved: boolean;
  overrideReason: string | null;
  isMockRecommendation: boolean;
  createdAt: string;
  updatedAt: string;
}
