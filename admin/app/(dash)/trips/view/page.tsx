'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TripDetailClient from '../[id]/TripDetailClient';

/**
 * Detalle por `?id=`: el export estático solo genera `/trips/[id]` para los
 * ids de demo, así que con backend los enlaces apuntan aquí (`tripHref`).
 */
function ViewById() {
  const id = useSearchParams()?.get('id') ?? '';
  return <TripDetailClient key={id} id={id} />;
}

export default function TripViewPage() {
  return (
    <Suspense fallback={<div className="card small muted">Cargando viaje…</div>}>
      <ViewById />
    </Suspense>
  );
}
