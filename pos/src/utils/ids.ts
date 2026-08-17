import uuid from 'react-native-uuid';

export const newId = (): string => uuid.v4() as string;

export const nowIso = (): string => new Date().toISOString();

/** dd/mm/aaaa hh:mm legible para tickets y listados */
export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDateShort = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Inicio del día local en ISO, para filtros de reportes */
export const startOfDay = (d = new Date()): string => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};

export const daysAgo = (n: number): string => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - n);
  return x.toISOString();
};
