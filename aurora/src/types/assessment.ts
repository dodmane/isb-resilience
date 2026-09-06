export type MaturityLevel = 1 | 2 | 3 | 4;

export type Confidence = 'high' | 'medium' | 'low';

export type DataSourceMode = 'public' | 'uploaded' | 'both';

export type CompanySize = 'small' | 'medium' | 'large';

export type AssessmentStage =
  | 1  // Company Discovery
  | 2  // Scenario Context
  | 3  // Dimension Screening
  | 4  // Evidence Plan
  | 5  // Gathered Evidence
  | 6  // Subdivision Scoring
  | 7  // Dimension Scoring
  | 8  // Scenario Stress Test
  | 9  // Resilience Gaps
  | 10; // Final Assessment

export const STAGE_LABELS: Record<AssessmentStage, string> = {
  1: 'Company Discovery',
  2: 'Scenario Context',
  3: 'Dimension Screening',
  4: 'Evidence Plan',
  5: 'Gathered Evidence',
  6: 'Subdivision Scoring',
  7: 'Dimension Scoring',
  8: 'Scenario Stress Test',
  9: 'Resilience Gaps',
  10: 'Final Assessment',
};

export interface Assessment {
  id: string;
  companyName: string;
  companyDescription: string;
  industry: string;
  companySize: CompanySize | null;
  dataSourceMode: DataSourceMode;
  currentStage: AssessmentStage;
  assessmentLens: string;
  scenarioNarratives: Record<string, string>;
  dimensionSelections: DimensionSelection[];
  evidencePlan: EvidencePlanItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DimensionSelection {
  dimensionKey: string;
  selected: boolean;
  deepAssessment: boolean;
  relevanceRationale: string;
}

export interface EvidencePlanItem {
  dimensionKey: string;
  subdivisionKey: string | null;
  searchTargets: string[];
  sourceTypes: string[];
  notes: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface StageApproval {
  id: string;
  assessmentId: string;
  stage: AssessmentStage;
  status: ApprovalStatus;
  approvedAt: string | null;
  notes: string;
}
