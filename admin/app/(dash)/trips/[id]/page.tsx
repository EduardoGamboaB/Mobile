import { trips } from '@/lib/demoData';
import TripDetailClient from './TripDetailClient';

export function generateStaticParams() {
  return trips.map((t) => ({ id: t.id }));
}

// Next 15: `params` es una Promise (también en export estático).
export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripDetailClient id={id} />;
}
