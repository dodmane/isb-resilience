import { type DimensionKey } from './dimensions';

export interface Subdivision {
  key: string;
  name: string;
  description: string;
  evidenceHints: string[];
}

export type SubdivisionMap = Record<DimensionKey, Subdivision[]>;

export const SUBDIVISIONS: SubdivisionMap = {
  revenue_durability: [
    {
      key: 'retention_nrr',
      name: 'Retention & Net Revenue Retention',
      description: 'Customer retention rates, logo retention, dollar-based net revenue retention (NRR), churn trends and renewal economics.',
      evidenceHints: ['NRR percentage', 'gross retention rate', 'churn rate', 'renewal rates', 'customer cohort retention'],
    },
    {
      key: 'pricing_power_mix',
      name: 'Pricing Power & Revenue Mix',
      description: 'Pricing model resilience, ability to pass through cost increases, subscription vs consumption mix, contract duration and upsell/cross-sell performance.',
      evidenceHints: ['pricing model', 'ARPU trends', 'contract terms', 'upsell rates', 'revenue mix breakdown'],
    },
    {
      key: 'customer_concentration_demand',
      name: 'Customer Concentration & Demand Resilience',
      description: 'Revenue concentration across top customers, industry diversification, geographic spread and demand sensitivity to economic cycles.',
      evidenceHints: ['top customer % of revenue', 'customer count', 'industry mix', 'geographic revenue split', 'demand elasticity'],
    },
  ],
  opex_elasticity: [
    {
      key: 'cloud_hosting_flex',
      name: 'Cloud & Hosting Flexibility',
      description: 'Ability to scale cloud/hosting costs up or down, contract flexibility with cloud providers, reserved vs on-demand mix and multi-cloud optionality.',
      evidenceHints: ['cloud spend as % of revenue', 'hosting contract terms', 'cloud provider concentration', 'reserved vs spot mix'],
    },
    {
      key: 'payroll_workforce_flex',
      name: 'Payroll & Workforce Flexibility',
      description: 'Workforce composition (permanent vs contract), geographic distribution, ability to adjust headcount, compensation flexibility and remote-work infrastructure.',
      evidenceHints: ['headcount trends', 'contractor %', 'geographic distribution', 'compensation structure', 'attrition rates'],
    },
    {
      key: 'vendor_sm_control',
      name: 'Vendor & S&M Spend Control',
      description: 'Vendor contract flexibility, sales & marketing spend efficiency, ability to reduce discretionary spending without damaging pipeline or brand.',
      evidenceHints: ['S&M as % of revenue', 'vendor concentration', 'contract cancellation terms', 'marketing efficiency metrics'],
    },
  ],
  capex_optionality: [
    {
      key: 'software_capitalization',
      name: 'Software Capitalization',
      description: 'Capitalized software development spend, amortization profile, ability to defer or redirect development investment.',
      evidenceHints: ['capitalized software balance', 'amortization schedule', 'R&D capitalization rate', 'development spend trends'],
    },
    {
      key: 'infrastructure_investment',
      name: 'Infrastructure Investment',
      description: 'Data center, network, hardware and cloud infrastructure commitments, lease obligations and capacity planning.',
      evidenceHints: ['infrastructure capex', 'lease commitments', 'data center strategy', 'capacity utilization'],
    },
    {
      key: 'deferrability_reversibility',
      name: 'Deferrability & Reversibility',
      description: 'Ability to defer, phase, scale back or repurpose capital projects without significant sunk-cost losses.',
      evidenceHints: ['project pipeline flexibility', 'committed vs discretionary capex', 'payback periods', 'project cancellation history'],
    },
  ],
  liquidity_runway: [
    {
      key: 'cash_generation_buffers',
      name: 'Cash Generation & Buffers',
      description: 'Operating cash flow generation, free cash flow, cash reserves and short-term investment portfolio.',
      evidenceHints: ['operating cash flow', 'free cash flow', 'cash and equivalents', 'FCF margin', 'cash conversion ratio'],
    },
    {
      key: 'financing_access',
      name: 'Financing Access',
      description: 'Credit facilities, debt maturity profile, credit ratings, equity market access and covenant headroom.',
      evidenceHints: ['credit facility size', 'debt maturities', 'credit rating', 'covenant compliance', 'interest coverage'],
    },
    {
      key: 'burn_shock_absorption',
      name: 'Burn Profile & Shock Absorption',
      description: 'Cash burn rate under stress, months of runway, contingency planning and ability to rapidly reduce cash outflows.',
      evidenceHints: ['burn rate', 'runway months', 'stress scenario analysis', 'contingency reserves', 'variable vs fixed cost ratio'],
    },
  ],
  operational_continuity: [
    {
      key: 'sla_uptime',
      name: 'SLA & Uptime Performance',
      description: 'Service level agreement commitments, historical uptime, incident frequency and customer-facing availability metrics.',
      evidenceHints: ['uptime percentage', 'SLA targets', 'incident count', 'mean time to recovery', 'status page history'],
    },
    {
      key: 'disaster_recovery_bcp',
      name: 'Disaster Recovery & BCP',
      description: 'Disaster recovery plans, business continuity procedures, testing frequency, RTO/RPO targets and failover capability.',
      evidenceHints: ['DR plan existence', 'RTO/RPO targets', 'DR test frequency', 'BCP documentation', 'failover architecture'],
    },
    {
      key: 'redundancy_recovery',
      name: 'Redundancy & Recovery',
      description: 'Infrastructure redundancy, geographic distribution, backup systems, data replication and recovery performance.',
      evidenceHints: ['data center count', 'geographic distribution', 'backup frequency', 'replication strategy', 'recovery test results'],
    },
  ],
  erp_data_backbone: [
    {
      key: 'data_quality_integration',
      name: 'Data Quality & Integration',
      description: 'Data accuracy, completeness, consistency across systems, integration maturity between CRM/ERP/analytics platforms.',
      evidenceHints: ['data governance program', 'system integration status', 'data quality metrics', 'single source of truth', 'API architecture'],
    },
    {
      key: 'reporting_controls',
      name: 'Reporting & Controls',
      description: 'Financial and operational reporting reliability, internal controls, SOX compliance, audit findings and control environment maturity.',
      evidenceHints: ['SOX compliance status', 'audit opinions', 'internal control findings', 'reporting automation', 'control framework'],
    },
    {
      key: 'decision_visibility',
      name: 'Decision Visibility',
      description: 'Real-time dashboards, KPI visibility, self-service analytics capability and ability to make data-driven decisions quickly.',
      evidenceHints: ['analytics platform', 'KPI dashboard', 'reporting cadence', 'data-driven decision examples', 'analytics maturity'],
    },
  ],
  innovation_rd_capacity: [
    {
      key: 'product_relevance_roadmap',
      name: 'Product Relevance & Roadmap',
      description: 'Product-market fit, roadmap clarity, feature delivery against customer needs and competitive positioning.',
      evidenceHints: ['product launches', 'feature roadmap', 'competitive positioning', 'customer satisfaction scores', 'product-market fit signals'],
    },
    {
      key: 'engineering_capacity_cadence',
      name: 'Engineering Capacity & Cadence',
      description: 'Engineering team size and capability, release frequency, development velocity, technical debt management and engineering culture.',
      evidenceHints: ['engineering headcount', 'release frequency', 'deployment cadence', 'technical debt indicators', 'engineering blog/culture'],
    },
    {
      key: 'ai_readiness_innovation',
      name: 'AI Readiness & Innovation Pipeline',
      description: 'AI/ML capability, AI integration into products, innovation pipeline maturity, R&D investment in emerging technology.',
      evidenceHints: ['AI product features', 'AI R&D investment', 'AI partnerships', 'patent portfolio', 'innovation lab/programs'],
    },
  ],
  market_development_sales: [
    {
      key: 'pipeline_conversion',
      name: 'Pipeline & Conversion',
      description: 'Sales pipeline health, win rates, deal velocity, pipeline coverage ratio and sales forecasting accuracy.',
      evidenceHints: ['pipeline metrics', 'win rates', 'sales cycle length', 'pipeline coverage', 'forecast accuracy'],
    },
    {
      key: 'cac_ltv_economics',
      name: 'CAC/LTV Economics',
      description: 'Customer acquisition cost efficiency, lifetime value, payback period, unit economics and marketing ROI.',
      evidenceHints: ['CAC', 'LTV', 'LTV/CAC ratio', 'payback period', 'sales efficiency ratio'],
    },
    {
      key: 'geographic_channel_diversification',
      name: 'Geographic & Channel Diversification',
      description: 'Revenue distribution across geographies, channel partner mix, direct vs indirect sales balance and market expansion track record.',
      evidenceHints: ['geographic revenue split', 'channel partner count', 'direct vs indirect %', 'new market entries', 'international revenue %'],
    },
  ],
  business_development_ma: [
    {
      key: 'partnership_strategy',
      name: 'Partnership Strategy',
      description: 'Strategic partnerships, technology alliances, co-selling arrangements and ecosystem participation.',
      evidenceHints: ['key partnerships', 'alliance programs', 'co-selling revenue', 'partner ecosystem', 'integration partnerships'],
    },
    {
      key: 'acquisition_integration',
      name: 'Acquisition & Integration',
      description: 'M&A track record, integration capability, acquisition strategy alignment and post-merger performance.',
      evidenceHints: ['acquisition history', 'integration success', 'M&A strategy', 'post-acquisition metrics', 'acquisition spend'],
    },
    {
      key: 'build_buy_partner',
      name: 'Build-Buy-Partner Optionality',
      description: 'Strategic flexibility to choose between building internally, acquiring or partnering based on capability needs.',
      evidenceHints: ['build vs buy decisions', 'strategic optionality', 'capability gap analysis', 'partnership vs acquisition examples'],
    },
  ],
  technology_ai_cyber: [
    {
      key: 'cyber_maturity_data_security',
      name: 'Cyber Maturity & Data Security',
      description: 'Cybersecurity program maturity, security certifications, incident history, vulnerability management and data protection.',
      evidenceHints: ['security certifications (SOC2, ISO 27001)', 'breach history', 'vulnerability management', 'security investment', 'CISO reporting'],
    },
    {
      key: 'ai_governance',
      name: 'AI Governance',
      description: 'AI risk management framework, responsible AI principles, AI ethics governance, model governance and AI-related regulatory readiness.',
      evidenceHints: ['AI governance framework', 'responsible AI policy', 'AI risk management', 'AI ethics board', 'NIST AI RMF alignment'],
    },
    {
      key: 'cloud_dependency_concentration',
      name: 'Cloud Dependency & Concentration',
      description: 'Reliance on specific cloud providers, multi-cloud strategy, cloud vendor lock-in risk and compute/storage concentration.',
      evidenceHints: ['primary cloud provider', 'multi-cloud status', 'cloud spend concentration', 'cloud migration capability', 'vendor lock-in risk'],
    },
  ],
  sustainability_environmental: [
    {
      key: 'energy_emissions',
      name: 'Energy & Emissions',
      description: 'Energy consumption, renewable energy usage, Scope 1/2/3 emissions, carbon intensity and energy efficiency of operations.',
      evidenceHints: ['renewable energy %', 'carbon emissions', 'Scope 1/2/3 data', 'energy efficiency targets', 'carbon neutrality commitments'],
    },
    {
      key: 'climate_exposure',
      name: 'Climate Exposure',
      description: 'Physical climate risk to operations, climate-related financial risk, transition risk and climate adaptation planning.',
      evidenceHints: ['TCFD disclosure', 'climate risk assessment', 'physical risk exposure', 'transition risk analysis', 'climate adaptation plans'],
    },
    {
      key: 'disclosure_compliance_readiness',
      name: 'Disclosure & Compliance Readiness',
      description: 'ESG/sustainability reporting maturity, regulatory compliance readiness (EU CSRD, SEC climate), disclosure framework adoption.',
      evidenceHints: ['ESG report', 'sustainability report', 'disclosure frameworks', 'regulatory readiness', 'ESG ratings'],
    },
  ],
  trust_regulation_reputation: [
    {
      key: 'compliance_privacy',
      name: 'Compliance & Privacy',
      description: 'Regulatory compliance program, data privacy (GDPR, CCPA), privacy-by-design practices and compliance monitoring.',
      evidenceHints: ['GDPR compliance', 'privacy program', 'compliance certifications', 'regulatory fines', 'privacy officer'],
    },
    {
      key: 'security_assurance_quality',
      name: 'Security Assurance & Quality',
      description: 'Product security, quality assurance practices, security testing, bug bounty programs and third-party assessments.',
      evidenceHints: ['security audit results', 'quality metrics', 'bug bounty program', 'penetration testing', 'code security practices'],
    },
    {
      key: 'stakeholder_confidence_reputation',
      name: 'Stakeholder Confidence & Reputation',
      description: 'Brand trust, NPS/CSAT, analyst recognition, customer references, media sentiment and public trust indicators.',
      evidenceHints: ['NPS/CSAT scores', 'analyst rankings (Gartner, Forrester)', 'customer references', 'brand trust surveys', 'media sentiment'],
    },
  ],
  decision_agility: [
    {
      key: 'signal_to_decision_speed',
      name: 'Signal-to-Decision Speed',
      description: 'Speed from detecting signals to executive decision, real-time monitoring capabilities and decision-making velocity.',
      evidenceHints: ['decision cadence', 'monitoring systems', 'real-time dashboards', 'decision-speed examples', 'escalation triggers'],
    },
    {
      key: 'escalation_trigger_discipline',
      name: 'Escalation & Trigger Discipline',
      description: 'Defined escalation paths, trigger-based decision protocols, pre-agreed thresholds and crisis response playbooks.',
      evidenceHints: ['escalation framework', 'trigger thresholds', 'crisis playbooks', 'decision rights matrix', 'war room protocols'],
    },
    {
      key: 'resource_reallocation',
      name: 'Resource Reallocation Capability',
      description: 'Ability to rapidly redirect budget, people and priorities in response to changing conditions.',
      evidenceHints: ['resource reallocation examples', 'budget flexibility', 'reorganization speed', 'pivot capability', 'scenario-based planning'],
    },
  ],
  talent_culture_resilience: [
    {
      key: 'leadership_depth_succession',
      name: 'Leadership Depth & Succession',
      description: 'Management bench strength, succession planning, key-person dependency and leadership development programs.',
      evidenceHints: ['succession plans', 'key-person risk', 'leadership bench', 'executive tenure', 'leadership development programs'],
    },
    {
      key: 'critical_skills_retention',
      name: 'Critical Skills & Retention',
      description: 'Retention of critical technical and business talent, employer brand, compensation competitiveness and skills development.',
      evidenceHints: ['employee retention rate', 'Glassdoor/employer ratings', 'compensation benchmarks', 'skills development programs', 'turnover trends'],
    },
    {
      key: 'adaptability_knowledge_continuity',
      name: 'Adaptability & Knowledge Continuity',
      description: 'Organizational adaptability, knowledge management, cross-training, documentation and institutional knowledge preservation.',
      evidenceHints: ['change management capability', 'knowledge management system', 'cross-training programs', 'documentation practices', 'remote/hybrid readiness'],
    },
  ],
  ecosystem_partner_strength: [
    {
      key: 'cloud_technology_partners',
      name: 'Cloud & Technology Partners',
      description: 'Cloud provider relationships, technology partner integrations, platform ecosystem participation and ISV partnerships.',
      evidenceHints: ['cloud partnerships (AWS, Azure, GCP)', 'technology integrations', 'marketplace presence', 'ISV relationships', 'API ecosystem'],
    },
    {
      key: 'channel_strategic_partners',
      name: 'Channel & Strategic Partners',
      description: 'System integrators, resellers, consulting partners and strategic alliance network strength.',
      evidenceHints: ['SI partnerships', 'channel partner program', 'reseller network', 'consulting alliances', 'partner-sourced revenue %'],
    },
    {
      key: 'switching_cost_ecosystem_resilience',
      name: 'Switching Cost & Ecosystem Resilience',
      description: 'Customer switching costs, ecosystem lock-in/value, platform stickiness and ecosystem alternatives.',
      evidenceHints: ['switching cost indicators', 'ecosystem depth', 'platform stickiness', 'integration density', 'customer ecosystem dependency'],
    },
  ],
};

export function getSubdivisionsForDimension(dimensionKey: DimensionKey): Subdivision[] {
  return SUBDIVISIONS[dimensionKey] || [];
}
