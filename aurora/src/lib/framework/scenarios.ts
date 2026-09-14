export type ScenarioKey =
  | 'revenue_compression'
  | 'cloud_cyber_outage'
  | 'cogs_margin_squeeze'
  | 'talent_attrition'
  | 'capital_market_freeze'
  | 'ai_disruption_commodity';

export interface Scenario {
  key: ScenarioKey;
  name: string;
  category: 'Financial' | 'Operational' | 'Technology' | 'Human Capital' | 'Market & AI';
  triggerCondition: string;
  primaryDimensions: string[];
  sensitivityDriver: string;
  description: string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: 'revenue_compression',
    name: 'Revenue & NRR Compression Shock',
    category: 'Financial',
    triggerCondition: '25% sudden NRR contraction & enterprise budget freeze',
    primaryDimensions: ['revenue_durability', 'market_development_sales', 'liquidity_runway'],
    sensitivityDriver: 'Customer concentration, contract length & enterprise retention',
    description: 'Sudden 25% contraction in Net Revenue Retention and enterprise customer spending freeze, testing customer concentration and churn resistance.',
  },
  {
    key: 'cloud_cyber_outage',
    name: 'Cloud Outage & Zero-Day Cyber Breach',
    category: 'Operational',
    triggerCondition: 'Major active cloud region outage or critical zero-day security incident',
    primaryDimensions: ['operational_continuity', 'technology_ai_cyber', 'trust_regulation_reputation'],
    sensitivityDriver: 'Multi-region redundancy, disaster recovery SLA & cyber incident response',
    description: 'A major multi-region cloud infrastructure failure combined with a critical security vulnerability breach, testing SLA compliance, disaster recovery, and customer trust.',
  },
  {
    key: 'cogs_margin_squeeze',
    name: 'COGS & LLM Hosting Inflation Squeeze',
    category: 'Financial',
    triggerCondition: '40% spike in LLM inference / cloud hosting costs under locked customer pricing',
    primaryDimensions: ['opex_elasticity', 'capex_optionality', 'liquidity_runway'],
    sensitivityDriver: 'Hosting cost variability, gross margin buffer & pricing power flexibility',
    description: 'Rapid 40% inflation in cloud infrastructure and AI inference costs while enterprise pricing remains locked, testing gross margins and cost elasticity.',
  },
  {
    key: 'talent_attrition',
    name: 'Key Technical Leadership Attrition',
    category: 'Human Capital',
    triggerCondition: 'Sudden voluntary departure of critical engineering, security & AI leadership',
    primaryDimensions: ['innovation_rd_capacity', 'decision_agility', 'talent_culture_resilience'],
    sensitivityDriver: 'Key-person dependency, knowledge continuity & bench depth',
    description: 'Abrupt attrition of critical engineering and AI talent, exposing single-point dependencies in architecture, R&D cadence, and operational decision-making.',
  },
  {
    key: 'capital_market_freeze',
    name: 'Capital Market & Refinancing Freeze',
    category: 'Financial',
    triggerCondition: 'Venture/debt capital markets freeze and customer payment terms extend by +60 days',
    primaryDimensions: ['liquidity_runway', 'business_development_ma', 'capex_optionality'],
    sensitivityDriver: 'Current cash burn, runway months & financing flexibility',
    description: 'Complete lockup in equity and debt refinancing combined with extended customer payment terms, placing extreme pressure on cash buffers and runway.',
  },
  {
    key: 'ai_disruption_commodity',
    name: 'AI Disruption & Commodity Shock',
    category: 'Market & AI',
    triggerCondition: 'Autonomous AI agents commoditize legacy workflows; seat-based pricing collapses as clients deploy internal LLM agents',
    primaryDimensions: ['innovation_rd_capacity', 'revenue_durability', 'market_development_sales', 'ecosystem_partner_strength'],
    sensitivityDriver: 'Proprietary data moat, outcome-based pricing capability & AI architectural readiness',
    description: 'Rapid proliferation of autonomous AI agents and open models commoditizes core software features and collapses traditional per-seat pricing models, testing product moat and monetization agility.',
  },
];
