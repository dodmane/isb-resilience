export type ResilienceClassification = 'strong' | 'conditional' | 'exposed';

export interface ResilienceGap {
  id: string;
  assessmentId: string;
  dimensionKey: string;
  subdivisionKey: string | null;
  currentMaturity: number | null;
  scenarioKey: string;
  scenarioMaturity: number | null;
  gapDescription: string;
  businessImplication: string;
  recommendation: string;
  supportingEvidenceIds: string[];
  classification: ResilienceClassification;
  createdAt: string;
}
