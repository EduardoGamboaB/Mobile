import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

// Blog en archivos Markdown: content/blog/<slug>.md
//
// Cada archivo empieza con un encabezado entre líneas "---":
//   ---
//   title: Título del artículo
//   description: Resumen de 1-2 líneas (también es la descripción para Google)
//   date: 2026-11-14
//   author: Equipo G3 Logistics
//   cover: /img/carrusel/carretera.jpg
//   coverAlt: Descripción de la imagen
//   tags: Carta Porte, Cumplimiento
//   ---
//   Contenido en Markdown…

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;      // AAAA-MM-DD
  author: string;
  cover: string;
  coverAlt: string;
  tags: string[];
  html: string;
  minutes: number;
};

const DIR = path.join(process.cwd(), 'content', 'blog');

function parse(file: string): Post {
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: falta el encabezado entre "---"`);
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const k of ['title', 'description', 'date']) {
    if (!meta[k]) throw new Error(`${file}: falta "${k}" en el encabezado`);
  }
  const body = m[2];
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug: file.replace(/\.md$/, ''),
    title: meta.title,
    description: meta.description,
    date: meta.date,
    author: meta.author || 'Equipo G3 Logistics',
    cover: meta.cover || '/img/carrusel/carretera.jpg',
    coverAlt: meta.coverAlt || meta.title,
    tags: (meta.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    html: (marked.parse(body, { async: false }) as string)
      // Las listas "- [ ]" son checklists de lectura: casilla decorativa, no un control.
      .replace(/<input[^>]*type="checkbox"[^>]*>\s*/g, '<span class="check-box" aria-hidden="true"></span>'),
    minutes: Math.max(1, Math.round(words / 200)),
  };
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map(parse)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[m - 1]} de ${y}`;
}
