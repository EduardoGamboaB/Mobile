import { drivers } from '@/lib/demoData';
import DriverDetailClient from './DriverDetailClient';

export function generateStaticParams() {
  return drivers.map((d) => ({ id: d.id }));
}

// Next 15: `params` es una Promise (también en export estático).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DriverDetailClient id={id} />;
}
