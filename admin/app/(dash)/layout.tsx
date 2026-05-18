'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { useAppStore } from '@/lib/store';

export default function DashLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authed = useAppStore((s) => s.authed);

  // En modo demo, dejamos pasar siempre. En producción descomentar:
  // useEffect(() => { if (!authed) router.replace('/login'); }, [authed, router]);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
