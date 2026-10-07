'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={logout} disabled={loggingOut} aria-label="Log out" title="Log out">
      <LogOut className="h-4 w-4" />
      <span className="sr-only">{loggingOut ? 'Logging out' : 'Log out'}</span>
    </Button>
  );
}
