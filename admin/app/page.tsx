'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';

export default function IndexPage() {
  const router = useRouter();
  const authed = useAppStore((s) => s.authed);

  useEffect(() => {
    router.replace(authed ? '/dashboard' : '/login');
  }, [authed, router]);

  return null;
}
