import Link from 'next/link';

export default function ScoringMethodologyPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="aurora-gradient text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="text-sm text-white/60 hover:text-white/80 transition-colors">
            ← Back to Assessments
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-3">AURORA Scoring Methodology</h1>
          <p className="text-white/70 mt-1">How the resilience assessment works</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Overview */}
        <section>
          <h2 className="text-xl font-bold mb-3">Overview</h2>
          <p className="text-muted-foreground leading-relaxed">
            AURORA (Adaptive, Uncertainty, Resilience, Opportunity &amp; Risk Assessment) is an
            executive scenario-planning and resilience decision-support framework. It evaluates
            business resilience across <strong>15 dimensions</strong> through <strong>4 plausible
            future scenarios</strong>, using a common <strong>1–4 maturity rubric</strong> backed
            by traceable public evidence.
          </p>
        </section>

        {/* Maturity Scale */}
        <section>
          <h2 className="text-xl font-bold mb-3">Maturity Scale (1–4)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { level: 1, label: 'Basic / Not Met', range: '0–25', color: 'border-red-200 bg-red-50', desc: 'Minimal capability; criteria absent or weak; high vulnerability.' },
              { level: 2, label: 'Developing / Partially Met', range: '26–50', color: 'border-amber-200 bg-amber-50', desc: 'Some criteria satisfied; capability is inconsistent or incomplete.' },
              { level: 3, label: 'Established / Mostly Met', range: '51–75', color: 'border-blue-200 bg-blue-50', desc: 'Most criteria satisfied; reliable, repeatable processes; moderate resilience.' },
              { level: 4, label: 'Advanced / Fully Met', range: '76–100', color: 'border-green-200 bg-green-50', desc: 'All criteria satisfied; automated, predictive or fully integrated; high resilience.' },
            ].map(m => (
              <div key={m.level} className={`border rounded-lg p-4 ${m.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold">Level {m.level}</span>
                  <span className="text-sm text-muted-foreground">({m.range})</span>
                </div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="text-xs text-muted-foreground">
              <strong>How the numeric score is formed:</strong> start with the selected Level&apos;s band minimum, then add the Position points: Low +3, Mid +12, or High +21. This produces the sub-dimension score; ordinary scores range from 3 to 97.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-1.5 pr-3">Level</th>
                    <th className="py-1.5 px-3">Band minimum</th>
                    <th className="py-1.5 px-3 text-center">Low</th>
                    <th className="py-1.5 px-3 text-center">Mid</th>
                    <th className="py-1.5 pl-3 text-center">High</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { level: 1, minimum: 0, low: 3, mid: 12, high: 21 },
                    { level: 2, minimum: 26, low: 29, mid: 38, high: 47 },
                    { level: 3, minimum: 51, low: 54, mid: 63, high: 72 },
                    { level: 4, minimum: 76, low: 79, mid: 88, high: 97 },
                  ].map(row => (
                    <tr key={row.level} className="border-b last:border-0">
                      <th scope="row" className="py-1.5 pr-3 font-medium">Level {row.level}</th>
                      <td className="py-1.5 px-3">{row.minimum}</td>
                      <td className="py-1.5 px-3 text-center">{row.low}</td>
                      <td className="py-1.5 px-3 text-center">{row.mid}</td>
                      <td className="py-1.5 pl-3 text-center">{row.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Example:</strong> Level 3 + Mid = 51 + 12 = 63. Dimension scores are the equal-weight average of rated sub-dimensions (at least 2 of 3); the composite is the equal-weight average of qualifying dimensions. Missing ratings are excluded, not treated as zero. The averages are not rounded before the maturity band is looked up. These are rubric scores, not percentages or probabilities. AI may suggest Level and Position from accepted evidence; a reviewer confirms or edits the suggestion. Manual entry is also available.
            </p>
          </div>
        </section>

        {/* Scoring Process */}
        <section>
          <h2 className="text-xl font-bold mb-3">Scoring Process</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Evidence Gathering', desc: 'Credible public-domain evidence is gathered for each dimension and subdivision from annual reports, SEC filings, investor materials, trust pages, and other primary sources.' },
              { step: '2', title: 'Subdivision Assessment', desc: 'AI can suggest a Level and Position from accepted evidence. A reviewer confirms or edits it. If no supported suggestion is available, enter the rating manually or leave it unscored. Score = band minimum + position points.' },
              { step: '3', title: 'Dimension & Composite Scoring', desc: 'Dimension score = equal-weight average of numeric sub-dimension scores; at least 2 are required. Composite = equal-weight average of every qualifying dimension. Levels use band-minimum lookup; intermediate averages are not rounded.' },
              { step: '4', title: 'Coverage & Comparison', desc: 'Report Full/Partial/Insufficient/None evidence status and overall coverage. Flag shifts greater than 1 point against the full-evidence-only average. Compare companies on shared qualifying dimensions and verify their evidence periods are comparable.' },
              { step: '5', title: 'Scenario Stress Test', desc: 'Base maturity is evaluated under 4 future scenarios. Each dimension may strengthen, remain stable, or weaken. Every adjustment requires rationale, evidence, and user approval.' },
              { step: '6', title: 'Resilience Classification', desc: 'Strong: maturity ≥3 across all scenarios. Conditional: ≥3 in some but drops below in others. Exposed: base <3 or drops significantly under stress.' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full aurora-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4 Scenarios */}
        <section>
          <h2 className="text-xl font-bold mb-3">Four AURORA Scenarios</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Defined using two axes: AI Implementation Depth × Macro-Disruption Intensity.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Autonomous Advantage', ai: 'High AI', macro: 'Stable', color: 'border-green-200 bg-green-50/50', desc: 'Measurable AI productivity, strong automation, sufficient budgets.' },
              { name: 'Storm and Signal', ai: 'High AI', macro: 'Disruptive', color: 'border-amber-200 bg-amber-50/50', desc: 'AI is real but regulation, cyber, budgets complicate execution.' },
              { name: 'Managed Modernization', ai: 'Low AI', macro: 'Stable', color: 'border-blue-200 bg-blue-50/50', desc: 'Incremental AI, disciplined execution, traditional economics.' },
              { name: 'Exposed and Reactive', ai: 'Low AI', macro: 'Disruptive', color: 'border-red-200 bg-red-50/50', desc: 'Limited AI lift + worsening conditions pressure everything.' },
            ].map(s => (
              <div key={s.name} className={`border rounded-lg p-4 ${s.color}`}>
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.ai} / {s.macro} Macro</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 15 Dimensions */}
        <section>
          <h2 className="text-xl font-bold mb-3">15 AURORA Resilience Dimensions</h2>
          <div className="space-y-2">
            {[
              { n: 1, name: 'Revenue Durability', desc: 'Retention, NRR, pricing power, customer concentration, demand resilience' },
              { n: 2, name: 'OpEx Elasticity', desc: 'Cloud/hosting, payroll, S&M, vendor cost flexibility' },
              { n: 3, name: 'CapEx Optionality', desc: 'Software capitalization, infrastructure, deferrability' },
              { n: 4, name: 'Liquidity & Runway', desc: 'Cash generation, buffers, financing, shock absorption' },
              { n: 5, name: 'Operational Continuity', desc: 'SLA uptime, DR, BCP, redundancy' },
              { n: 6, name: 'ERP & Data Backbone', desc: 'Data quality, integration, reporting, controls' },
              { n: 7, name: 'Innovation & R&D Capacity', desc: 'Product relevance, engineering, AI readiness' },
              { n: 8, name: 'Market Development & Sales', desc: 'Pipeline, CAC/LTV, diversification' },
              { n: 9, name: 'Business Development & M&A', desc: 'Partnerships, acquisitions, build-buy-partner' },
              { n: 10, name: 'Technology, AI & Cyber', desc: 'Cyber maturity, AI governance, cloud dependency' },
              { n: 11, name: 'Sustainability & Environmental', desc: 'Energy, emissions, climate, disclosure' },
              { n: 12, name: 'Trust, Regulation & Reputation', desc: 'Compliance, privacy, stakeholder confidence' },
              { n: 13, name: 'Decision Agility', desc: 'Signal-to-decision speed, escalation, reallocation' },
              { n: 14, name: 'Talent & Culture Resilience', desc: 'Leadership depth, skills, retention, adaptability' },
              { n: 15, name: 'Ecosystem & Partner Strength', desc: 'Cloud/tech/channel partners, switching cost' },
            ].map(d => (
              <div key={d.n} className="flex items-start gap-3 border rounded p-3">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{d.n}</span>
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Key Principles */}
        <section>
          <h2 className="text-xl font-bold mb-3">Key Principles</h2>
          <div className="space-y-2 text-sm">
            {[
              'No assessment claim may exist without traceable evidence or an explicitly identified assumption.',
              'Assessment Confidence is tracked separately from maturity and never influences the score.',
              'Dimension and composite scores use equal-weight numeric averages; maturity follows the score band.',
              'The system must NOT automatically advance between stages. User approval is required at every checkpoint.',
              'All user overrides must record a reason.',
              'AURORA produces framework-level leadership recommendations only — not implementation plans, consulting prescriptions, or investment advice.',
            ].map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-primary font-bold">•</span>
                <p className="text-muted-foreground">{p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Evidence */}
        <section>
          <h2 className="text-xl font-bold mb-3">Evidence Hierarchy</h2>
          <div className="space-y-2">
            {[
              { tier: 'Tier 1', desc: 'SEC filings, audited annual reports, quarterly filings, investor financial disclosures', color: 'bg-green-100 text-green-800' },
              { tier: 'Tier 2', desc: 'Company trust/security pages, official product documentation, announcements', color: 'bg-blue-100 text-blue-800' },
              { tier: 'Tier 3', desc: 'External corroboration (only when Tier 1/2 insufficient)', color: 'bg-amber-100 text-amber-800' },
            ].map(t => (
              <div key={t.tier} className="flex items-start gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.color}`}>{t.tier}</span>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center pt-4 pb-8">
          <Link href="/" className="text-primary hover:underline text-sm">
            ← Back to Assessments
          </Link>
        </div>
      </div>
    </main>
  );
}
