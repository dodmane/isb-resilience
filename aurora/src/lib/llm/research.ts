import { type Evidence, type EvidenceSourceType } from '@/types/evidence';
import { type EvidencePlanItem } from '@/types/assessment';
import { SUBDIVISIONS } from '@/lib/framework/subdivisions';
import { DIMENSIONS, type DimensionKey } from '@/lib/framework/dimensions';
import { v4 as uuidv4 } from 'uuid';
import { isLLMConfigured, callLLMJSON } from './client';

export interface ResearchResult {
  evidence: Evidence[];
  searchSummary: string;
}

export async function researchEvidence(
  assessmentId: string,
  companyName: string,
  plan: EvidencePlanItem[],
  existingEvidence: Evidence[]
): Promise<ResearchResult> {
  if (isLLMConfigured()) {
    try {
      return await researchWithLLM(assessmentId, companyName, plan, existingEvidence);
    } catch (err) {
      console.error('LLM research failed, falling back to mock:', err);
    }
  }
  return researchMock(assessmentId, companyName, plan, existingEvidence);
}

async function researchWithLLM(
  assessmentId: string,
  companyName: string,
  plan: EvidencePlanItem[],
  existingEvidence: Evidence[]
): Promise<ResearchResult> {
  const allEvidence: Evidence[] = [];
  const now = new Date().toISOString();

  // Group plan by dimension for efficient LLM calls
  const dimGroups: Record<string, EvidencePlanItem[]> = {};
  for (const item of plan) {
    if (!dimGroups[item.dimensionKey]) dimGroups[item.dimensionKey] = [];
    dimGroups[item.dimensionKey].push(item);
  }

  for (const [dimKey, items] of Object.entries(dimGroups)) {
    const dim = DIMENSIONS.find(d => d.key === dimKey);
    const subs = SUBDIVISIONS[dimKey as DimensionKey] || [];
    const targetSubs = items.flatMap(item => {
      if (item.subdivisionKey) {
        const sub = subs.find(s => s.key === item.subdivisionKey);
        return sub ? [sub] : [];
      }
      return subs;
    }).filter(sub => {
      return !existingEvidence.some(
        e => e.dimensionKey === dimKey && e.subdivisionKey === sub.key && e.status !== 'rejected'
      );
    });

    if (targetSubs.length === 0) continue;

    const subDescriptions = targetSubs.map(s =>
      `- ${s.name} (key: ${s.key}): ${s.description}\n  Look for: ${s.evidenceHints.join(', ')}`
    ).join('\n');

    const systemPrompt = `You are a public-data research analyst for the AURORA Enterprise Business Resilience Framework.

RULES:
- Use ONLY well-known, credible public sources: SEC filings (10-K, 10-Q, proxy), annual reports, investor presentations, official company pages, trust/security pages, sustainability reports.
- Prefer primary sources (Tier 1: SEC filings, audited reports; Tier 2: official company documentation).
- Every claim must have a specific supporting excerpt from the source.
- Every URL must be a real, verifiable public URL. If you are NOT confident a URL exists, set sourceUrl to null.
- NEVER fabricate URLs, data points, or quotes.
- Extract specific numbers, percentages, dates where available.
- If evidence is not publicly available for a subdivision, skip it — do not guess.`;

    const userPrompt = `Research "${companyName}" for AURORA dimension: ${dim?.name || dimKey}
Description: ${dim?.description || ''}

For each of the following subdivisions, find 1-2 pieces of credible public evidence:

${subDescriptions}

Return JSON array:
[
  {
    "subdivisionKey": "the_key",
    "claim": "specific factual claim with numbers/dates",
    "extractedValue": "the key metric or data point",
    "supportingExcerpt": "verbatim or near-verbatim excerpt from the source",
    "sourceTitle": "exact document title (e.g. 'DocuSign FY2026 Annual Report (10-K)')",
    "publisher": "publisher name",
    "sourceUrl": "actual URL or null if unsure",
    "sourceType": "annual_report" | "regulatory_filing" | "investor_relations" | "sustainability_report" | "research" | "other",
    "publicationDate": "YYYY-MM-DD or null"
  }
]

Return ONLY evidence you can back with a real public source. Skip subdivisions where no credible evidence exists.`;

    try {
      const results = await callLLMJSON<Array<{
        subdivisionKey: string;
        claim: string;
        extractedValue: string;
        supportingExcerpt: string;
        sourceTitle: string;
        publisher: string;
        sourceUrl: string | null;
        sourceType: EvidenceSourceType;
        publicationDate: string | null;
      }>>(systemPrompt, userPrompt);

      for (const r of results) {
        const validSub = targetSubs.find(s => s.key === r.subdivisionKey);
        if (!validSub) continue;

        allEvidence.push({
          id: uuidv4(),
          assessmentId,
          claim: r.claim,
          extractedValue: r.extractedValue || '',
          supportingExcerpt: r.supportingExcerpt || '',
          sourceTitle: r.sourceTitle || '',
          publisher: r.publisher || '',
          sourceUrl: r.sourceUrl || null,
          sourceType: r.sourceType || 'other',
          publicationDate: r.publicationDate || null,
          retrievalTimestamp: now,
          pageNumber: null,
          dimensionKey: dimKey,
          subdivisionKey: r.subdivisionKey,
          urlResolved: r.sourceUrl !== null,
          status: 'proposed',
          rejectionReason: null,
          sourceOrigin: 'llm_research',
          isMock: false,
          createdAt: now,
        });
      }
    } catch (err) {
      console.error(`LLM research failed for dimension ${dimKey}:`, err);
    }
  }

  return {
    evidence: allEvidence,
    searchSummary: `LLM research generated ${allEvidence.length} evidence items for ${companyName} across ${Object.keys(dimGroups).length} dimensions.`,
  };
}

function researchMock(
  assessmentId: string,
  companyName: string,
  plan: EvidencePlanItem[],
  existingEvidence: Evidence[]
): ResearchResult {
  const evidence: Evidence[] = [];
  const now = new Date().toISOString();

  const key = companyName.toLowerCase().trim();
  const isSalesforce = key.includes('salesforce');
  const isDocusign = key.includes('docusign');

  for (const item of plan) {
    const dimKey = item.dimensionKey as DimensionKey;
    const subs = SUBDIVISIONS[dimKey] || [];

    if (item.subdivisionKey) {
      const sub = subs.find(s => s.key === item.subdivisionKey);
      if (!sub) continue;
      const alreadyHas = existingEvidence.some(
        e => e.dimensionKey === dimKey && e.subdivisionKey === item.subdivisionKey && e.status !== 'rejected'
      );
      if (alreadyHas) continue;

      if (isSalesforce) {
        evidence.push(...generateSalesforceEvidence(assessmentId, dimKey, item.subdivisionKey, sub.name, now));
      } else if (isDocusign) {
        evidence.push(...generateDocusignEvidence(assessmentId, dimKey, item.subdivisionKey, sub.name, now));
      } else {
        evidence.push(createGenericMockEvidence(assessmentId, companyName, dimKey, item.subdivisionKey, sub.name, now));
      }
    } else {
      for (const sub of subs) {
        const alreadyHas = existingEvidence.some(
          e => e.dimensionKey === dimKey && e.subdivisionKey === sub.key && e.status !== 'rejected'
        );
        if (alreadyHas) continue;

        if (isSalesforce) {
          evidence.push(...generateSalesforceEvidence(assessmentId, dimKey, sub.key, sub.name, now));
        } else if (isDocusign) {
          evidence.push(...generateDocusignEvidence(assessmentId, dimKey, sub.key, sub.name, now));
        } else {
          evidence.push(createGenericMockEvidence(assessmentId, companyName, dimKey, sub.key, sub.name, now));
        }
      }
    }
  }

  return {
    evidence,
    searchSummary: `Mock research generated ${evidence.length} evidence items for ${companyName}. [Replace with real LLM research]`,
  };
}

function makeEvidence(params: {
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
  subdivisionKey: string;
  now: string;
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
    retrievalTimestamp: params.now,
    pageNumber: null,
    dimensionKey: params.dimensionKey,
    subdivisionKey: params.subdivisionKey,
    urlResolved: params.sourceUrl !== null,
    status: 'proposed',
    rejectionReason: null,
    sourceOrigin: 'llm_research',
    isMock: true,
    createdAt: params.now,
  };
}

function generateSalesforceEvidence(
  assessmentId: string, dimensionKey: string, subdivisionKey: string, subdivisionName: string, now: string
): Evidence[] {
  const SALESFORCE_EVIDENCE: Record<string, Record<string, Array<{
    claim: string; value: string; excerpt: string; title: string; url: string; type: EvidenceSourceType; date: string;
  }>>> = {
    revenue_durability: {
      retention_nrr: [{
        claim: 'Salesforce maintains dollar-based net revenue retention rate exceeding 100%',
        value: 'NRR > 100%',
        excerpt: 'Our dollar-based net revenue retention rate has consistently remained above 100%, reflecting strong customer expansion and renewal rates across our product portfolio.',
        title: 'Salesforce FY2024 Annual Report (10-K)',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
      pricing_power_mix: [{
        claim: 'Salesforce subscription revenue represents approximately 94% of total revenue',
        value: '~94% subscription revenue',
        excerpt: 'Subscription and support revenue was $32.5 billion, representing approximately 94% of total revenue for fiscal year 2024.',
        title: 'Salesforce FY2024 10-K Filing',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
      customer_concentration_demand: [{
        claim: 'Salesforce serves over 150,000 customers with no single customer exceeding 10% of revenue',
        value: '150,000+ customers, no >10% concentration',
        excerpt: 'We serve more than 150,000 customers across virtually every industry and geography. No single customer represented more than 10% of total revenue.',
        title: 'Salesforce FY2024 Annual Report',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
    },
    opex_elasticity: {
      cloud_hosting_flex: [{
        claim: 'Salesforce operates a multi-cloud infrastructure with significant hyperscaler commitments',
        value: 'Multi-cloud with hyperscaler contracts',
        excerpt: 'We continue to invest in our infrastructure, including our use of third-party cloud infrastructure services from major hyperscale providers.',
        title: 'Salesforce FY2024 10-K Filing',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
      payroll_workforce_flex: [{
        claim: 'Salesforce executed significant workforce restructuring in FY2024, reducing headcount by approximately 10%',
        value: '~10% headcount reduction FY2024',
        excerpt: 'In January 2023, we announced a restructuring plan to reduce our workforce by approximately 10% and close select offices to reduce operating costs.',
        title: 'Salesforce FY2024 10-K Filing',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
      vendor_sm_control: [{
        claim: 'Salesforce S&M expense as percentage of revenue declined from 45% to 37% over two years',
        value: 'S&M declined from 45% to ~37% of revenue',
        excerpt: 'Sales and marketing expense decreased as a percentage of revenue, reflecting improved efficiency and restructuring benefits.',
        title: 'Salesforce Q4 FY2024 Earnings',
        url: 'https://investor.salesforce.com/events-and-presentations',
        type: 'investor_relations',
        date: '2024-02-28',
      }],
    },
    technology_ai_cyber: {
      cyber_maturity_data_security: [{
        claim: 'Salesforce maintains SOC 1, SOC 2, ISO 27001 and multiple industry-specific security certifications',
        value: 'SOC 1/2, ISO 27001 certified',
        excerpt: 'Salesforce maintains independent third-party certifications including SOC 1, SOC 2, ISO 27001, ISO 27018, and CSA STAR across our cloud services.',
        title: 'Salesforce Trust & Compliance Documentation',
        url: 'https://trust.salesforce.com/en/trust-and-compliance-documentation/',
        type: 'regulatory_publication',
        date: '2024-01-01',
      }],
      ai_governance: [{
        claim: 'Salesforce established an Office of Ethical and Humane Use of Technology and published AI acceptable use policy',
        value: 'Dedicated AI ethics office + AI AUP',
        excerpt: 'Our Office of Ethical and Humane Use leads our responsible AI program, developing guidelines for trustworthy AI development and use across our platform.',
        title: 'Salesforce Responsible AI Principles',
        url: 'https://www.salesforce.com/company/ethical-and-humane-use/',
        type: 'research',
        date: '2024-06-01',
      }],
      cloud_dependency_concentration: [{
        claim: 'Salesforce operates its own data center infrastructure supplemented by hyperscale cloud providers',
        value: 'Hybrid: owned DCs + hyperscale',
        excerpt: 'Our technical infrastructure consists of our own data centers and third-party cloud computing platforms, providing resilience across our deployment footprint.',
        title: 'Salesforce FY2024 10-K Filing',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
    },
    innovation_rd_capacity: {
      product_relevance_roadmap: [{
        claim: 'Salesforce launched Einstein GPT and Data Cloud as core AI platform capabilities',
        value: 'Einstein GPT + Data Cloud launched',
        excerpt: 'We introduced Einstein GPT, the world\'s first generative AI CRM technology, and expanded Data Cloud to unify customer data across the Salesforce platform.',
        title: 'Salesforce FY2024 Annual Report',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
      engineering_capacity_cadence: [{
        claim: 'Salesforce R&D spend represents approximately 15% of revenue with three major release cycles per year',
        value: 'R&D ~15% of revenue, 3 releases/year',
        excerpt: 'Research and development expense was approximately $5.2 billion in fiscal 2024. We deliver three major platform releases per year.',
        title: 'Salesforce FY2024 10-K Filing',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
      ai_readiness_innovation: [{
        claim: 'Salesforce invested significantly in AI R&D and acquired companies to strengthen AI capabilities',
        value: 'Significant AI R&D + AI acquisitions',
        excerpt: 'Our AI investments span internal R&D, strategic acquisitions and partnerships designed to embed artificial intelligence across all Salesforce clouds.',
        title: 'Salesforce FY2024 Annual Report',
        url: 'https://investor.salesforce.com/annual-reports',
        type: 'annual_report',
        date: '2024-03-06',
      }],
    },
  };

  const dimEvidence = SALESFORCE_EVIDENCE[dimensionKey]?.[subdivisionKey];
  if (dimEvidence) {
    return dimEvidence.map(e => makeEvidence({
      assessmentId, claim: e.claim, extractedValue: e.value, supportingExcerpt: e.excerpt,
      sourceTitle: e.title, publisher: 'Salesforce, Inc.', sourceUrl: e.url,
      sourceType: e.type, publicationDate: e.date, dimensionKey, subdivisionKey, now,
    }));
  }

  return [createGenericMockEvidence(assessmentId, 'Salesforce', dimensionKey, subdivisionKey, subdivisionName, now)];
}

function generateDocusignEvidence(
  assessmentId: string, dimensionKey: string, subdivisionKey: string, subdivisionName: string, now: string
): Evidence[] {
  const DOCUSIGN_EVIDENCE: Record<string, Record<string, Array<{
    claim: string; value: string; excerpt: string; title: string; url: string; type: EvidenceSourceType; date: string;
  }>>> = {
    revenue_durability: {
      retention_nrr: [{
        claim: 'DocuSign reported dollar-based net retention rate of approximately 101% in FY2024',
        value: 'NRR ~101%',
        excerpt: 'Our dollar-based net retention rate was approximately 101% as of January 31, 2024, reflecting stable expansion within our existing customer base.',
        title: 'DocuSign FY2024 Annual Report (10-K)',
        url: 'https://investor.docusign.com/financial-information/sec-filings',
        type: 'annual_report',
        date: '2024-03-15',
      }],
      pricing_power_mix: [{
        claim: 'DocuSign subscription revenue represents approximately 97% of total revenue',
        value: '~97% subscription revenue',
        excerpt: 'Subscription revenue represented approximately 97% of total revenue for fiscal year 2024.',
        title: 'DocuSign FY2024 10-K Filing',
        url: 'https://investor.docusign.com/financial-information/sec-filings',
        type: 'annual_report',
        date: '2024-03-15',
      }],
      customer_concentration_demand: [{
        claim: 'DocuSign serves approximately 1.5 million total customers with broad industry diversification',
        value: '~1.5M customers',
        excerpt: 'We have approximately 1.5 million total customers, with approximately 222,000 enterprise and commercial customers.',
        title: 'DocuSign FY2024 Annual Report',
        url: 'https://investor.docusign.com/financial-information/sec-filings',
        type: 'annual_report',
        date: '2024-03-15',
      }],
    },
    technology_ai_cyber: {
      cyber_maturity_data_security: [{
        claim: 'DocuSign maintains SOC 1/2, ISO 27001 and FedRAMP security certifications',
        value: 'SOC 1/2, ISO 27001, FedRAMP',
        excerpt: 'DocuSign maintains SOC 1 Type II, SOC 2 Type II, ISO 27001, ISO 27017, ISO 27018, and FedRAMP Authorized certifications.',
        title: 'DocuSign Trust Center',
        url: 'https://www.docusign.com/trust',
        type: 'regulatory_publication',
        date: '2024-01-01',
      }],
      ai_governance: [{
        claim: 'DocuSign integrating AI into Intelligent Agreement Management platform',
        value: 'AI-powered IAM platform',
        excerpt: 'DocuSign is embedding AI capabilities into its Intelligent Agreement Management platform to automate agreement workflows.',
        title: 'DocuSign IAM Platform',
        url: 'https://www.docusign.com/products/platform',
        type: 'research',
        date: '2024-06-01',
      }],
      cloud_dependency_concentration: [{
        claim: 'DocuSign operates primarily on AWS and Microsoft Azure cloud infrastructure',
        value: 'Primary cloud: AWS + Azure',
        excerpt: 'Our platform infrastructure is primarily hosted on Amazon Web Services and Microsoft Azure cloud computing platforms.',
        title: 'DocuSign FY2024 10-K Filing',
        url: 'https://investor.docusign.com/financial-information/sec-filings',
        type: 'annual_report',
        date: '2024-03-15',
      }],
    },
  };

  const dimEvidence = DOCUSIGN_EVIDENCE[dimensionKey]?.[subdivisionKey];
  if (dimEvidence) {
    return dimEvidence.map(e => makeEvidence({
      assessmentId, claim: e.claim, extractedValue: e.value, supportingExcerpt: e.excerpt,
      sourceTitle: e.title, publisher: 'DocuSign, Inc.', sourceUrl: e.url,
      sourceType: e.type, publicationDate: e.date, dimensionKey, subdivisionKey, now,
    }));
  }

  return [createGenericMockEvidence(assessmentId, 'DocuSign', dimensionKey, subdivisionKey, subdivisionName, now)];
}

function createGenericMockEvidence(
  assessmentId: string, companyName: string, dimensionKey: string,
  subdivisionKey: string, subdivisionName: string, now: string
): Evidence {
  return makeEvidence({
    assessmentId,
    claim: `Evidence for ${companyName}: ${subdivisionName} assessment pending real research`,
    extractedValue: 'Pending real AI research',
    supportingExcerpt: `Mock evidence placeholder for ${subdivisionName}. This item was generated by the mock AI research engine and should be replaced with real evidence from public sources when AI integration is configured.`,
    sourceTitle: 'AURORA Mock Research',
    publisher: 'AURORA System',
    sourceUrl: null,
    sourceType: 'other',
    publicationDate: null,
    dimensionKey,
    subdivisionKey,
    now,
  });
}
