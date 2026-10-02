'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeI, TruckI, UsersI, DollarI, ChartI, SparklesI,
  SettingsI, LockI, ShieldI, PackageI, BellI,
} from './Icons';
import { useFeature } from '@/lib/store';
import { Feature } from '@/lib/tiers';
import { alerts } from '@/lib/demoData';

interface NavItem {
  href: string;
  label: string;
  icon: React.FC<{ size?: number; color?: string }>;
  feature?: typeof Feature[keyof typeof Feature];
  badge?: number;
}

const OPEN_ALERTS = alerts.filter((a) => !a.acknowledged).length;

const OPERATION: NavItem[] = [
  { href: '/dashboard', label: 'Resumen',             icon: HomeI },
  { href: '/monitor',   label: 'Monitoreo · Alertas', icon: BellI, badge: OPEN_ALERTS },
  { href: '/trips',     label: 'Viajes',              icon: TruckI },
];
const FLEET: NavItem[] = [
  { href: '/drivers',         label: 'Operadores', icon: UsersI },
  { href: '/fleet/tractors',  label: 'Tractos',    icon: TruckI },
  { href: '/fleet/trailers',  label: 'Remolques',  icon: PackageI },
];
const INTEL: NavItem[] = [
  { href: '/payments', label: 'Pagos',       icon: DollarI,   feature: Feature.PaymentAuthorization },
  { href: '/scoring',  label: 'Scoring',     icon: ShieldI,   feature: Feature.Scoring },
  { href: '/insights', label: 'AI Insights', icon: SparklesI, feature: Feature.AIInsights },
  { href: '/reports',  label: 'Reportes',    icon: ChartI,    feature: Feature.AdvancedAnalytics },
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
      {OPERATION.map((it) => <NavRow key={it.href} item={it} active={isActive(pathname, it.href)} />)}

      <div className="section-label" style={{ marginTop: 18 }}>Flotilla</div>
      {FLEET.map((it) => <NavRow key={it.href} item={it} active={isActive(pathname, it.href)} />)}

      <div className="section-label" style={{ marginTop: 18 }}>Inteligencia</div>
      {INTEL.map((it) => <NavRow key={it.href} item={it} active={isActive(pathname, it.href)} />)}

      <div className="section-label" style={{ marginTop: 18 }}>Cuenta</div>
      <NavRow item={{ href: '/plans',    label: 'Mi plan', icon: SparklesI }} active={pathname.startsWith('/plans')} />
      <NavRow item={{ href: '/settings', label: 'Ajustes', icon: SettingsI }} active={pathname.startsWith('/settings')} />
      <NavRow item={{ href: '/audit',    label: 'Bitácora', icon: ShieldI }} active={pathname.startsWith('/audit')} />

      <div className="footer">© G3 Logistics 2026</div>
    </aside>
  );
}

function isActive(path: string, href: string) {
  if (href === '/dashboard') return path === '/' || path.startsWith('/dashboard');
  return path.startsWith(href);
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const has = useFeature(item.feature as never);
  const locked = item.feature ? !has : false;
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
      <Icon size={18} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span style={{
          background: 'var(--danger)', color: '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
          borderRadius: 999, padding: '2px 7px',
        }}>{item.badge}</span>
      ) : null}
      {locked ? <LockI size={13} /> : null}
    </Link>
  );
}
