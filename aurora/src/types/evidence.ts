export type EvidenceSourceType =
  | 'annual_report'
  | 'regulatory_filing'
  | 'investor_relations'
  | 'sustainability_report'
  | 'risk_disclosure'
  | 'regulatory_publication'
  | 'research'
  | 'uploaded_document'
  | 'other';

export type EvidenceStatus = 'proposed' | 'accepted' | 'rejected';

export type EvidenceOrigin = 'llm_research' | 'user_provided' | 'user_uploaded';

export interface Evidence {
  id: string;
  assessmentId: string;
  claim: string;
  extractedValue: string;
  supportingExcerpt: string;
  sourceTitle: string;
  publisher: string;
  sourceUrl: string | null;
  sourceType: EvidenceSourceType;
  publicationDate: string | null;
  retrievalTimestamp: string;
  pageNumber: string | null;
  dimensionKey: string;
  subdivisionKey: string | null;
  urlResolved: boolean;
  status: EvidenceStatus;
  rejectionReason: string | null;
  sourceOrigin: EvidenceOrigin;
  isMock: boolean;
  createdAt: string;
}
