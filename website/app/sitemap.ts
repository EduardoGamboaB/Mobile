import type { MetadataRoute } from 'next';
import { getAllPosts } from '../lib/blog';
import { SITE_URL } from '../lib/site';

export const dynamic = 'force-static';

// Sitemap generado al compilar: incluye las páginas fijas y cada artículo del blog.
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = '2026-11-14';
  const pages: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
    ['/', 'weekly', 1.0],
    ['/servicios/', 'monthly', 0.9],
    ['/seguimiento/', 'monthly', 0.8],
    ['/blog/', 'weekly', 0.8],
    ['/nosotros/', 'monthly', 0.7],
    ['/contacto/', 'yearly', 0.8],
    ['/aviso-de-privacidad/', 'yearly', 0.2],
    ['/terminos-y-condiciones/', 'yearly', 0.2],
  ];
  return [
    ...pages.map(([p, changeFrequency, priority]) => ({ url: `${SITE_URL}${p}`, lastModified: updated, changeFrequency, priority })),
    ...getAllPosts().map((post) => ({ url: `${SITE_URL}/blog/${post.slug}/`, lastModified: post.date, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
