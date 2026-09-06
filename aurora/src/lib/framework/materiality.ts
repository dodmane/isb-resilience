import { type DimensionKey } from './dimensions';

export interface MaterialityInfo {
  saasRelevance: string;
  smallCompanyNote: string;
  largeCompanyNote: string;
  defaultSelected: boolean;
}

export const SAAS_MATERIALITY: Record<DimensionKey, MaterialityInfo> = {
  revenue_durability: {
    saasRelevance: 'Recurring revenue is the economic foundation of every SaaS business. Retention, NRR and customer concentration directly determine whether the business can sustain itself through disruption. A decline in NRR or a loss of a concentrated customer base can rapidly erode financial resilience.',
    smallCompanyNote: 'Higher customer concentration risk; single enterprise customer loss can be existential.',
    largeCompanyNote: 'Lower individual customer risk but portfolio-level demand shifts can materially impact growth rates.',
    defaultSelected: true,
  },
  opex_elasticity: {
    saasRelevance: 'SaaS companies carry significant operating costs in cloud hosting, payroll and sales & marketing. The ability to flex these costs without destroying core capability is critical when customer budgets tighten or growth slows.',
    smallCompanyNote: 'Limited cost structure flexibility; cloud and payroll often represent majority of spend.',
    largeCompanyNote: 'Larger fixed-cost base and complex vendor relationships create inertia in cost adjustment.',
    defaultSelected: true,
  },
  capex_optionality: {
    saasRelevance: 'Capitalized software development and infrastructure investment are central to SaaS. The ability to defer, phase or redirect these investments provides strategic flexibility under disruption.',
    smallCompanyNote: 'Lower absolute capex but higher relative impact of investment decisions.',
    largeCompanyNote: 'Large committed infrastructure and software capitalization portfolios create deferrability constraints.',
    defaultSelected: true,
  },
  liquidity_runway: {
    saasRelevance: 'Cash generation and liquidity buffers determine how long a SaaS business can sustain operations under adverse conditions. Subscription billing visibility aids forecasting but does not eliminate cash flow risk.',
    smallCompanyNote: 'Cash runway is often the primary survival constraint; burn rate management is existential.',
    largeCompanyNote: 'Stronger cash reserves but more complex capital allocation and financing obligations.',
    defaultSelected: true,
  },
  operational_continuity: {
    saasRelevance: 'SaaS customers expect continuous availability. Service disruptions directly impact customer trust, retention and contractual SLA obligations. Disaster recovery and business continuity are operationally critical.',
    smallCompanyNote: 'Limited redundancy and DR capability; single-region deployments are common.',
    largeCompanyNote: 'Complex multi-region infrastructure increases continuity management complexity.',
    defaultSelected: true,
  },
  erp_data_backbone: {
    saasRelevance: 'Data quality, system integration and reporting controls determine whether leadership can see, trust and act on operational signals. Poor data backbone slows decision-making and increases risk of misallocation.',
    smallCompanyNote: 'Often rely on basic tooling with limited integration; data silos emerge early.',
    largeCompanyNote: 'Multiple ERP/CRM systems create integration complexity; data quality at scale is challenging.',
    defaultSelected: true,
  },
  innovation_rd_capacity: {
    saasRelevance: 'Product relevance and engineering velocity determine competitive position. AI readiness is increasingly material as AI transforms customer workflows and competitive dynamics.',
    smallCompanyNote: 'Speed advantage but limited engineering bench; single product dependency.',
    largeCompanyNote: 'Broader engineering capacity but innovation speed can lag due to portfolio complexity.',
    defaultSelected: true,
  },
  market_development_sales: {
    saasRelevance: 'Pipeline health, CAC/LTV economics and geographic diversification determine growth sustainability. Efficient customer acquisition becomes critical when budgets tighten.',
    smallCompanyNote: 'Concentrated pipeline and limited geographic reach increase market risk.',
    largeCompanyNote: 'Broader reach but higher CAC and complex multi-channel management.',
    defaultSelected: true,
  },
  business_development_ma: {
    saasRelevance: 'Partnerships, acquisitions and build-buy-partner optionality shape strategic flexibility. Integration capability determines whether M&A creates value or complexity.',
    smallCompanyNote: 'Limited M&A capability; partnerships are the primary expansion mechanism.',
    largeCompanyNote: 'Active M&A creates integration risk and portfolio management complexity.',
    defaultSelected: false,
  },
  technology_ai_cyber: {
    saasRelevance: 'Cybersecurity maturity, AI governance and cloud dependency are foundational risks for SaaS companies. A material cyber breach or AI governance failure can destroy customer trust and trigger regulatory consequences.',
    smallCompanyNote: 'Limited security resources; cloud concentration on single provider is common.',
    largeCompanyNote: 'Larger attack surface, more complex AI governance requirements and regulatory scrutiny.',
    defaultSelected: true,
  },
  sustainability_environmental: {
    saasRelevance: 'Energy consumption of cloud operations, emissions disclosure requirements and climate-related financial risk are increasingly material for SaaS companies, especially as regulatory disclosure frameworks expand.',
    smallCompanyNote: 'Lower absolute environmental footprint but growing investor/customer expectations.',
    largeCompanyNote: 'Significant cloud energy consumption; mandatory disclosure frameworks apply.',
    defaultSelected: false,
  },
  trust_regulation_reputation: {
    saasRelevance: 'Compliance, privacy, security assurance and stakeholder confidence are prerequisites for enterprise SaaS adoption. Regulatory risk (GDPR, CCPA, AI regulation) directly affects addressable market.',
    smallCompanyNote: 'Compliance gaps can prevent enterprise sales; privacy missteps are amplified.',
    largeCompanyNote: 'Multi-jurisdiction compliance complexity; greater regulatory scrutiny and public visibility.',
    defaultSelected: true,
  },
  decision_agility: {
    saasRelevance: 'The speed from detecting a market signal to executing a strategic response determines whether a SaaS company can adapt to rapid competitive and customer shifts.',
    smallCompanyNote: 'Faster natural decision speed but often lacks structured trigger discipline.',
    largeCompanyNote: 'Structured processes but decision speed can be hampered by organizational complexity.',
    defaultSelected: true,
  },
  talent_culture_resilience: {
    saasRelevance: 'SaaS businesses are people-intensive. Leadership depth, critical skills retention and organizational adaptability determine whether the company can execute under stress.',
    smallCompanyNote: 'Founder/key-person dependency; loss of critical engineers is high-impact.',
    largeCompanyNote: 'Leadership succession and knowledge continuity across large organizations.',
    defaultSelected: true,
  },
  ecosystem_partner_strength: {
    saasRelevance: 'Cloud, technology, channel and strategic partner relationships determine ecosystem resilience. Dependency on a single cloud provider or channel creates concentration risk.',
    smallCompanyNote: 'Limited partner ecosystem; over-reliance on platform marketplace.',
    largeCompanyNote: 'Broad partner network but ecosystem complexity and channel conflict.',
    defaultSelected: true,
  },
};
