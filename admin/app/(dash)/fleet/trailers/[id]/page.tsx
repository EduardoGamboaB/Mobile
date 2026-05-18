import { trailers } from '@/lib/demoData';
import TrailerDetailClient from './TrailerDetailClient';

export function generateStaticParams() {
  return trailers.map((r) => ({ id: r.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <TrailerDetailClient id={params.id} />;
}
