import { trips } from '@/lib/demoData';
import TripDetailClient from './TripDetailClient';

export function generateStaticParams() {
  return trips.map((t) => ({ id: t.id }));
}

export default function TripDetailPage({ params }: { params: { id: string } }) {
  return <TripDetailClient id={params.id} />;
}
