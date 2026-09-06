import { type Evidence, type EvidenceSourceType } from '@/types/evidence';
import { v4 as uuidv4 } from 'uuid';
import { isLLMConfigured, callLLMJSON } from './client';

export interface CompanyProfile {
  companyName: string;
  companyDescription: string;
  industry: string;
  companySize: 'small' | 'medium' | 'large';
  isMock: boolean;
}

export interface DiscoveryResult {
  profile: CompanyProfile;
  evidence: Evidence[];
}

export async function discoverCompany(
  companyName: string,
  assessmentId: string
): Promise<DiscoveryResult> {
  if (isLLMConfigured()) {
    return discoverCompanyWithLLM(companyName, assessmentId);
  }
  return discoverCompanyMock(companyName, assessmentId);
}

async function discoverCompanyWithLLM(
  companyName: string,
  assessmentId: string
): Promise<DiscoveryResult> {
  const systemPrompt = `You are a business research analyst for the AURORA Enterprise Business Resilience Framework. Your job is to discover factual company profile information using ONLY well-known public information. Do NOT fabricate URLs or data. If you are unsure, say so.`;

  const userPrompt = `Research "${companyName}" and return a JSON object with:
{
  "companyName": "official company name",
  "companyDescription": "2-3 sentence description of the business, including approximate revenue if publicly known",
  "industry": "primary industry classification",
  "companySize": "small" | "medium" | "large" (small: <$500M rev, medium: $500M-$5B, large: >$5B),
  "evidence": [
    {
      "claim": "specific factual claim about the company",
      "extractedValue": "the key data point",
      "supportingExcerpt": "brief supporting text",
      "sourceTitle": "name of the source document",
      "publisher": "publisher name",
      "sourceUrl": "actual URL to the source or null if unknown",
      "sourceType": "annual_report" | "regulatory_filing" | "investor_relations" | "research" | "other",
      "publicationDate": "YYYY-MM-DD or null",
      "dimensionKey": "revenue_durability" | "opex_elasticity" | "technology_ai_cyber" | "market_development_sales" | etc.
    }
  ]
}
Return 3-5 evidence items covering different AURORA dimensions. Only include URLs you are confident are real. Set sourceUrl to null if unsure.`;

  try {
    const result = await callLLMJSON<{
      companyName: string;
      companyDescription: string;
      industry: string;
      companySize: 'small' | 'medium' | 'large';
      evidence: Array<{
        claim: string;
        extractedValue: string;
        supportingExcerpt: string;
        sourceTitle: string;
        publisher: string;
        sourceUrl: string | null;
        sourceType: EvidenceSourceType;
        publicationDate: string | null;
        dimensionKey: string;
      }>;
    }>(systemPrompt, userPrompt);

    const now = new Date().toISOString();
    const profile: CompanyProfile = {
      companyName: result.companyName || companyName,
      companyDescription: result.companyDescription || '',
      industry: result.industry || 'Technology',
      companySize: result.companySize || 'medium',
      isMock: false,
    };

    const evidence: Evidence[] = (result.evidence || []).map(ev => ({
      id: uuidv4(),
      assessmentId,
      claim: ev.claim,
      extractedValue: ev.extractedValue || '',
      supportingExcerpt: ev.supportingExcerpt || '',
      sourceTitle: ev.sourceTitle || '',
      publisher: ev.publisher || '',
      sourceUrl: ev.sourceUrl || null,
      sourceType: ev.sourceType || 'other',
      publicationDate: ev.publicationDate || null,
      retrievalTimestamp: now,
      pageNumber: null,
      dimensionKey: ev.dimensionKey || 'revenue_durability',
      subdivisionKey: null,
      urlResolved: ev.sourceUrl !== null,
      status: 'proposed' as const,
      rejectionReason: null,
      sourceOrigin: 'llm_research' as const,
      isMock: false,
      createdAt: now,
    }));

    return { profile, evidence };
  } catch (err) {
    console.error('LLM discovery failed, falling back to mock:', err);
    return discoverCompanyMock(companyName, assessmentId);
  }
}

function discoverCompanyMock(
  companyName: string,
  assessmentId: string
): DiscoveryResult {
  const knownCompanies: Record<string, Omit<CompanyProfile, 'isMock'>> = {
    salesforce: {
      companyName: 'Salesforce, Inc.',
      companyDescription:
        'Enterprise cloud computing company specializing in CRM, marketing automation, analytics, and application development platforms. Revenue ~$34.9B (FY2024). Operates a multi-cloud SaaS platform serving 150,000+ customers globally.',
      industry: 'SaaS / Enterprise Software',
      companySize: 'large',
    },
    docusign: {
      companyName: 'DocuSign, Inc.',
      companyDescription:
        'Agreement management and electronic signature platform. Revenue ~$2.8B (FY2024). Core product enables digital transaction management across industries with ~1.5M customers.',
      industry: 'SaaS / Agreement Management',
      companySize: 'medium',
    },
  };

  const key = companyName.toLowerCase().trim();
  const match = Object.entries(knownCompanies).find(([k]) => key.includes(k));

  const profile: CompanyProfile = match
    ? { ...match[1], isMock: true }
    : {
        companyName,
        companyDescription: `${companyName} — company profile discovered via mock AI. Replace with real research when AI integration is configured.`,
        industry: 'Technology',
        companySize: 'medium',
        isMock: true,
      };

  const mockEvidence: Evidence[] = match
    ? generateMockEvidence(match[0], assessmentId)
    : generateGenericMockEvidence(companyName, assessmentId);

  return { profile, evidence: mockEvidence };
}

function generateMockEvidence(companyKey: string, assessmentId: string): Evidence[] {
  const now = new Date().toISOString();

  if (companyKey === 'salesforce') {
    return [
      createMockEvidence({
        assessmentId,
        claim: 'Salesforce reported $34.9 billion in revenue for fiscal year 2024',
        extractedValue: '$34.9B revenue FY2024',
        supportingExcerpt: 'Revenue was $34.857 billion for the fiscal year ended January 31, 2024, an increase of 11% year-over-year.',
        sourceTitle: 'Salesforce FY2024 Annual Report (10-K)',
        publisher: 'Salesforce, Inc.',
        sourceUrl: 'https://investor.salesforce.com/annual-reports',
        sourceType: 'annual_report',
        publicationDate: '2024-03-06',
        dimensionKey: 'revenue_durability',
        retrievalTimestamp: now,
      }),
      createMockEvidence({
        assessmentId,
        claim: 'Salesforce maintains a net revenue retention rate above 100%',
        extractedValue: 'NRR > 100%',
        supportingExcerpt: 'Dollar-based net revenue retention rate remained strong, reflecting expansion within existing customer accounts.',
        sourceTitle: 'Salesforce Q4 FY2024 Earnings Call Transcript',
        publisher: 'Salesforce, Inc.',
        sourceUrl: 'https://investor.salesforce.com/events-and-presentations',
        sourceType: 'investor_relations',
        publicationDate: '2024-02-28',
        dimensionKey: 'revenue_durability',
        subdivisionKey: 'retention_nrr',
        retrievalTimestamp: now,
      }),
      createMockEvidence({
        assessmentId,
        claim: 'Salesforce operates a multi-cloud SaaS platform with 150,000+ customers',
        extractedValue: '150,000+ customers',
        supportingExcerpt: 'Our customer base of more than 150,000 companies spans virtually every industry and geography.',
        sourceTitle: 'Salesforce FY2024 Annual Report',
        publisher: 'Salesforce, Inc.',
        sourceUrl: 'https://investor.salesforce.com/annual-reports',
        sourceType: 'annual_report',
        publicationDate: '2024-03-06',
        dimensionKey: 'market_development_sales',
        retrievalTimestamp: now,
      }),
    ];
  }

  if (companyKey === 'docusign') {
    return [
      createMockEvidence({
        assessmentId,
        claim: 'DocuSign reported approximately $2.8 billion in total revenue for fiscal year 2024',
        extractedValue: '$2.8B revenue FY2024',
        supportingExcerpt: 'Total revenue for fiscal 2024 was $2.762 billion, an increase of 8% compared to fiscal 2023.',
        sourceTitle: 'DocuSign FY2024 Annual Report (10-K)',
        publisher: 'DocuSign, Inc.',
        sourceUrl: 'https://investor.docusign.com/financial-information/sec-filings',
        sourceType: 'annual_report',
        publicationDate: '2024-03-15',
        dimensionKey: 'revenue_durability',
        retrievalTimestamp: now,
      }),
      createMockEvidence({
        assessmentId,
        claim: 'DocuSign serves approximately 1.5 million customers across industries',
        extractedValue: '~1.5M customers',
        supportingExcerpt: 'We have approximately 1.5 million total customers across virtually every industry.',
        sourceTitle: 'DocuSign FY2024 Annual Report',
        publisher: 'DocuSign, Inc.',
        sourceUrl: 'https://investor.docusign.com/financial-information/sec-filings',
        sourceType: 'annual_report',
        publicationDate: '2024-03-15',
        dimensionKey: 'market_development_sales',
        retrievalTimestamp: now,
      }),
    ];
  }

  return [];
}

function generateGenericMockEvidence(companyName: string, assessmentId: string): Evidence[] {
  const now = new Date().toISOString();
  return [
    createMockEvidence({
      assessmentId,
      claim: `${companyName} operates in the technology sector`,
      extractedValue: 'Technology sector company',
      supportingExcerpt: `Based on available public information, ${companyName} is identified as a technology company. This is a mock evidence item — replace with real research.`,
      sourceTitle: 'Mock Company Research',
      publisher: 'AURORA Mock Research',
      sourceUrl: null,
      sourceType: 'other',
      publicationDate: null,
      dimensionKey: 'revenue_durability',
      retrievalTimestamp: now,
      urlResolved: false,
    }),
  ];
}

function createMockEvidence(params: {
  assessmentId: string;
  claim: string;
  extractedValue: string;
  supportingExcerpt: string;
  sourceTitle: string;
  publisher: string;
  sourceUrl: string | null;
  sourceType: EvidenceSourceType;
  publicationDate: string | null;
  dimensionKey: string;
  subdivisionKey?: string;
  retrievalTimestamp: string;
  urlResolved?: boolean;
}): Evidence {
  return {
    id: uuidv4(),
    assessmentId: params.assessmentId,
    claim: params.claim,
    extractedValue: params.extractedValue,
    supportingExcerpt: params.supportingExcerpt,
    sourceTitle: params.sourceTitle,
    publisher: params.publisher,
    sourceUrl: params.sourceUrl,
    sourceType: params.sourceType,
    publicationDate: params.publicationDate,
    retrievalTimestamp: params.retrievalTimestamp,
    pageNumber: null,
    dimensionKey: params.dimensionKey,
    subdivisionKey: params.subdivisionKey ?? null,
    urlResolved: params.urlResolved ?? (params.sourceUrl !== null),
    status: 'proposed',
    rejectionReason: null,
    sourceOrigin: 'llm_research',
    isMock: true,
    createdAt: params.retrievalTimestamp,
  };
}
