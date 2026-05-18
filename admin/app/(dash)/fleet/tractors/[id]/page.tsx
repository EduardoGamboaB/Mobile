import { tractors } from '@/lib/demoData';
import TractorDetailClient from './TractorDetailClient';

export function generateStaticParams() {
  return tractors.map((t) => ({ id: t.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <TractorDetailClient id={params.id} />;
}
