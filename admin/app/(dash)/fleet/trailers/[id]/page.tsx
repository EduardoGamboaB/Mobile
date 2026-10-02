import { trailers } from '@/lib/demoData';
import TrailerDetailClient from './TrailerDetailClient';

export function generateStaticParams() {
  return trailers.map((r) => ({ id: r.id }));
}

// Next 15: `params` es una Promise (también en export estático).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrailerDetailClient id={id} />;
}
