'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

/**
 * Hidrata el store con localStorage al inicio + sincroniza el atributo
 * data-theme del <html> con el flag night.
 */
export function Bootstrap() {
  const hydrate = useAppStore((s) => s.hydrate);
  const night = useAppStore((s) => s.night);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', night ? 'dark' : 'light');
    }
  }, [night]);

  return null;
}
