import { drivers } from '@/lib/demoData';
import DriverDetailClient from './DriverDetailClient';

export function generateStaticParams() {
  return drivers.map((d) => ({ id: d.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <DriverDetailClient id={params.id} />;
}
