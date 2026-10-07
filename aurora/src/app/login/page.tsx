'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Unable to sign in. Check your details and try again.');
        return;
      }

      const requestedPath = new URLSearchParams(window.location.search).get('returnTo');
      const destination = requestedPath?.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/';
      window.location.assign(destination);
    } catch {
      setError('Unable to reach AURORA. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background grid lg:grid-cols-[1fr_1fr]">
      <aside className="aurora-gradient text-white px-8 py-10 lg:px-16 lg:py-14 flex flex-col justify-between min-h-[240px] lg:min-h-screen">
        <Link href="/login" className="w-fit text-2xl font-bold tracking-tight">AURORA</Link>
        <div className="max-w-md py-10 lg:py-0">
          <p className="text-xs uppercase tracking-[0.18em] text-white/65">Business Resilience Assessment</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight">A clearer view of resilience, uncertainty, and opportunity.</h1>
          <p className="mt-4 text-sm leading-6 text-white/75">Sign in to continue to your assessment workspace.</p>
        </div>
        <p className="hidden text-xs text-white/50 lg:block">Adaptive · Uncertainty · Resilience · Opportunity · Risk</p>
      </aside>

      <section className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg border bg-card text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use your email address and workspace password.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" placeholder="you@company.com"
                value={email} onChange={event => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password"
                value={password} onChange={event => setPassword(event.target.value)} required />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
              {!submitting && <ArrowRight className="ml-auto h-4 w-4" />}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
