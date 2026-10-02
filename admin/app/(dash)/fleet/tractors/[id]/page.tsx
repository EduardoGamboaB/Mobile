import { tractors } from '@/lib/demoData';
import TractorDetailClient from './TractorDetailClient';

export function generateStaticParams() {
  return tractors.map((t) => ({ id: t.id }));
}

// Next 15: `params` es una Promise (también en export estático).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TractorDetailClient id={id} />;
}
