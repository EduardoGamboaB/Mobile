'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SearchI, BellI, MoonI, LogOutI } from './Icons';
import { useAppStore } from '@/lib/store';
import { TierLabel } from '@/lib/tiers';
import { company } from '@/lib/demoData';

export function TopBar() {
  const router = useRouter();
  const tier = useAppStore((s) => s.tier);
  const night = useAppStore((s) => s.night);
  const setNight = useAppStore((s) => s.setNight);
  const signOut = useAppStore((s) => s.signOut);

  const onLogout = () => {
    signOut();
    router.push('/login');
  };

  return (
    <header className="topbar">
      <div className="search">
        <SearchI size={18} />
        <input placeholder="Buscar viaje, chofer, unidad..." />
      </div>
      <div className="right">
        <Link href="/plans" className="chip blue" style={{ padding: '5px 10px', fontSize: 11 }}>
          PLAN {TierLabel[tier].toUpperCase()}
        </Link>
        <button
          className="icon-tile sm"
          onClick={() => setNight(!night)}
          style={{ background: 'var(--surface)', border: 0, cursor: 'pointer' }}
          aria-label="Modo nocturno"
        >
          <MoonI size={16} />
        </button>
        <button
          className="icon-tile sm"
          style={{ background: 'var(--surface)', border: 0, cursor: 'pointer', position: 'relative' }}
          aria-label="Notificaciones"
        >
          <BellI size={16} />
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--danger)',
              border: '2px solid var(--bg)',
            }}
          />
        </button>
        <div className="row" style={{ marginLeft: 4, gap: 10 }}>
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>EG</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Eduardo Gamboa</span>
            <span className="caption">{company.name}</span>
          </div>
          <button
            onClick={onLogout}
            className="icon-tile sm"
            style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
            aria-label="Cerrar sesión"
          >
            <LogOutI size={16} color="var(--muted)" />
          </button>
        </div>
      </div>
    </header>
  );
}
