'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeI, TruckI, UsersI, MapI, DollarI, ChartI, SparklesI,
  SettingsI, LockI, ShieldI,
} from './Icons';
import { useAppStore, useFeature } from '@/lib/store';
import { Feature } from '@/lib/tiers';

interface NavItem {
  href: string;
  label: string;
  icon: React.FC<{ size?: number; color?: string }>;
  feature?: typeof Feature[keyof typeof Feature];
}

const ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Resumen',     icon: HomeI },
  { href: '/trips',     label: 'Viajes',      icon: TruckI },
  { href: '/drivers',   label: 'Choferes',    icon: UsersI },
  { href: '/fleet',     label: 'Flotilla',    icon: MapI,    feature: Feature.FleetMap },
  { href: '/payments',  label: 'Pagos',       icon: DollarI, feature: Feature.PaymentAuthorization },
  { href: '/scoring',   label: 'Scoring',     icon: ShieldI, feature: Feature.Scoring },
  { href: '/insights',  label: 'AI Insights', icon: SparklesI, feature: Feature.AIInsights },
  { href: '/reports',   label: 'Reportes',    icon: ChartI,  feature: Feature.AdvancedAnalytics },
];

export function Sidebar() {
  const pathname = usePathname() ?? '/';
  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand" style={{ textDecoration: 'none' }}>
        <span className="g">G</span>
        <span className="three">3</span>
        <span className="product">ADMIN</span>
      </Link>

      <div className="section-label">Operación</div>
      {ITEMS.map((it) => (
        <NavRow key={it.href} item={it} active={pathname.startsWith(it.href)} />
      ))}

      <div className="section-label" style={{ marginTop: 24 }}>Cuenta</div>
      <NavRow item={{ href: '/plans',    label: 'Mi plan', icon: SparklesI }} active={pathname.startsWith('/plans')} />
      <NavRow item={{ href: '/settings', label: 'Ajustes', icon: SettingsI }} active={pathname.startsWith('/settings')} />

      <div className="footer">© G3 Logistics 2026</div>
    </aside>
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const has = useFeature(item.feature as never);
  const locked = item.feature ? !has : false;
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
      <Icon size={18} />
      <span>{item.label}</span>
      {locked ? <LockI size={13} /> : null}
    </Link>
  );
}
