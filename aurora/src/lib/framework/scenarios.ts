export type ScenarioKey =
  | 'autonomous_advantage'
  | 'storm_and_signal'
  | 'managed_modernization'
  | 'exposed_and_reactive';

export interface Scenario {
  key: ScenarioKey;
  name: string;
  aiDepth: 'high' | 'low';
  macroDisruption: 'stable' | 'disruptive';
  description: string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: 'autonomous_advantage',
    name: 'Autonomous Advantage',
    aiDepth: 'high',
    macroDisruption: 'stable',
    description: 'Measurable AI productivity and adoption, stronger workflow automation and sufficient customer budgets.',
  },
  {
    key: 'storm_and_signal',
    name: 'Storm and Signal',
    aiDepth: 'high',
    macroDisruption: 'disruptive',
    description: 'AI capability is real, but regulation, infrastructure, cybersecurity, customer budgets and capital pressure complicate execution.',
  },
  {
    key: 'managed_modernization',
    name: 'Managed Modernization',
    aiDepth: 'low',
    macroDisruption: 'stable',
    description: 'Incremental AI adoption; disciplined execution, recurring-revenue economics and traditional software operating models remain important.',
  },
  {
    key: 'exposed_and_reactive',
    name: 'Exposed and Reactive',
    aiDepth: 'low',
    macroDisruption: 'disruptive',
    description: 'Limited AI productivity lift combined with worsening external conditions increases pressure on growth, margins, liquidity and resilience.',
  },
];
