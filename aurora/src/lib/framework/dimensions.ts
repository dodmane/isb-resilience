export type DimensionKey =
  | 'revenue_durability'
  | 'opex_elasticity'
  | 'capex_optionality'
  | 'liquidity_runway'
  | 'operational_continuity'
  | 'erp_data_backbone'
  | 'innovation_rd_capacity'
  | 'market_development_sales'
  | 'business_development_ma'
  | 'technology_ai_cyber'
  | 'sustainability_environmental'
  | 'trust_regulation_reputation'
  | 'decision_agility'
  | 'talent_culture_resilience'
  | 'ecosystem_partner_strength';

export interface Dimension {
  key: DimensionKey;
  number: number;
  name: string;
  description: string;
}

export const DIMENSIONS: Dimension[] = [
  { key: 'revenue_durability', number: 1, name: 'Revenue Durability', description: 'Retention, net revenue retention, pricing power, customer concentration and demand resilience.' },
  { key: 'opex_elasticity', number: 2, name: 'OpEx Elasticity', description: 'Ability to flex cloud/hosting, payroll, S&M, vendors and other operating spend without damaging core capability.' },
  { key: 'capex_optionality', number: 3, name: 'CapEx Optionality', description: 'Ability to defer, phase, repurpose or protect capitalized software, infrastructure and strategic investments.' },
  { key: 'liquidity_runway', number: 4, name: 'Liquidity & Runway', description: 'Cash generation, liquidity buffers, financing access, burn profile and shock absorption.' },
  { key: 'operational_continuity', number: 5, name: 'Operational Continuity', description: 'SLA uptime, disaster recovery, business continuity, redundancy and recovery performance.' },
  { key: 'erp_data_backbone', number: 6, name: 'ERP & Data Backbone', description: 'Data quality, integration, reporting, controls and decision visibility across CRM/ERP/analytics environments.' },
  { key: 'innovation_rd_capacity', number: 7, name: 'Innovation & R&D Capacity', description: 'Product relevance, roadmap strength, engineering capacity, release cadence, AI readiness and innovation pipeline.' },
  { key: 'market_development_sales', number: 8, name: 'Market Development & Sales', description: 'Pipeline, conversion, CAC/LTV, geographic/channel diversification, retention and expansion.' },
  { key: 'business_development_ma', number: 9, name: 'Business Development & M&A', description: 'Partnerships, acquisitions, integration capability and build-buy-partner optionality.' },
  { key: 'technology_ai_cyber', number: 10, name: 'Technology, AI & Cyber', description: 'Cyber maturity, AI governance, cloud dependency, compute, data security and technology concentration risk.' },
  { key: 'sustainability_environmental', number: 11, name: 'Sustainability & Environmental Readiness', description: 'Energy, emissions, climate exposure, disclosure readiness and sustainability expectations affecting technology operations.' },
  { key: 'trust_regulation_reputation', number: 12, name: 'Trust, Regulation & Reputation', description: 'Compliance, privacy, security assurance, quality, stakeholder confidence and public reputation.' },
  { key: 'decision_agility', number: 13, name: 'Decision Agility', description: 'Signal-to-decision speed, escalation, trigger discipline and resource reallocation.' },
  { key: 'talent_culture_resilience', number: 14, name: 'Talent & Culture Resilience', description: 'Leadership depth, critical skills, retention, adaptability and knowledge continuity.' },
  { key: 'ecosystem_partner_strength', number: 15, name: 'Ecosystem & Partner Strength', description: 'Cloud, technology, channel and strategic partner optionality, dependency, switching and ecosystem resilience.' },
];
