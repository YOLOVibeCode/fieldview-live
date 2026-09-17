'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OwnerSquarePage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('owner_token');
    const expires = localStorage.getItem('owner_token_expires');
    if (!token || (expires && new Date(expires) < new Date())) {
      router.replace('/owners/login');
      return;
    }
    setAuthenticated(true);
    router.replace('/owners/payments');
  }, [router]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p data-testid="notice-square-redirect">Redirecting to payments setup…</p>
    </div>
  );
}
