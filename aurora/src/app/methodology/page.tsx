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
              { level: 1, label: 'Basic / Not Met', range: '25–40', color: 'border-red-200 bg-red-50', desc: 'Capability is absent, ad-hoc, or reactive. No structured approach.' },
              { level: 2, label: 'Developing / Partially Met', range: '50–65', color: 'border-amber-200 bg-amber-50', desc: 'Capability exists but is inconsistent, incomplete, or untested.' },
              { level: 3, label: 'Established / Mostly Met', range: '70–85', color: 'border-blue-200 bg-blue-50', desc: 'Capability is structured, documented, and operational with minor gaps.' },
              { level: 4, label: 'Advanced / Fully Met', range: '90–100', color: 'border-green-200 bg-green-50', desc: 'Capability is mature, tested, adaptive, and demonstrably resilient.' },
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
          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <strong>Note:</strong> The 0–100 normalized value is an interpretive representation of the
            1–4 maturity level. It does not imply mathematical precision. The maturity level is the
            primary assessment result.
          </div>
        </section>

        {/* Scoring Process */}
        <section>
          <h2 className="text-xl font-bold mb-3">Scoring Process</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Evidence Gathering', desc: 'Credible public-domain evidence is gathered for each dimension and subdivision from annual reports, SEC filings, investor materials, trust pages, and other primary sources.' },
              { step: '2', title: 'Subdivision Assessment', desc: 'Each dimension selected for deep assessment has exactly 3 structured subdivisions. Each subdivision is scored 1–4 based on accepted evidence. If evidence is insufficient, the subdivision is marked NOT SCORED.' },
              { step: '3', title: 'Dimension Scoring', desc: 'Dimension maturity = average of applicable subdivision maturity scores (rounded to nearest integer). No weights are applied. This is a pure average per the charter.' },
              { step: '4', title: 'Scenario Stress Test', desc: 'Base maturity is evaluated under 6 Factor-Based Shock Injection Vectors (including AI Disruption & Commodity Shock). Each dimension may strengthen, remain stable, or weaken. Every adjustment requires rationale, evidence, and user approval.' },
              { step: '5', title: 'Resilience Classification', desc: 'Strong: maturity ≥3 across all 6 shock vectors. Conditional: ≥3 in some but drops below in others. Exposed: base <3 or drops significantly under stress.' },
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

        {/* 6 Shock Injection Vectors */}
        <section>
          <h2 className="text-xl font-bold mb-3">Six Factor-Based Shock Injection Vectors</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Targeted operational, financial, human capital, and market/AI shock vectors evaluating shock-absorption elasticity.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Revenue & NRR Compression Shock', category: 'Financial', color: 'border-red-200 bg-red-50/50', desc: '25% sudden NRR contraction & enterprise budget freeze.' },
              { name: 'Cloud Outage & Zero-Day Cyber Breach', category: 'Operational', color: 'border-amber-200 bg-amber-50/50', desc: 'Major multi-region active cloud failure and zero-day security incident.' },
              { name: 'COGS & LLM Hosting Inflation Squeeze', category: 'Financial', color: 'border-purple-200 bg-purple-50/50', desc: '40% spike in cloud infrastructure and AI inference costs under locked customer pricing.' },
              { name: 'Key Technical Leadership Attrition', category: 'Human Capital', color: 'border-orange-200 bg-orange-50/50', desc: 'Sudden voluntary departure of critical engineering, security & AI leadership.' },
              { name: 'Capital Market & Refinancing Freeze', category: 'Financial', color: 'border-blue-200 bg-blue-50/50', desc: 'Venture/debt market lockup with +60 day extension in customer payment terms.' },
              { name: 'AI Disruption & Commodity Shock', category: 'Market & AI', color: 'border-indigo-200 bg-indigo-50/50', desc: 'Autonomous AI agents commoditize legacy workflows; seat pricing collapses as clients deploy internal LLM agents.' },
            ].map(s => (
              <div key={s.name} className={`border rounded-lg p-4 ${s.color}`}>
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.category}</p>
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
              'Dimension maturity = average of subdivision scores. No arbitrary weights.',
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
