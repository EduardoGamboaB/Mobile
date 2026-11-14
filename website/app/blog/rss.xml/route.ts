import { getAllPosts } from '../../../lib/blog';
import { SITE_URL } from '../../../lib/site';

export const dynamic = 'force-static';

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));

// Feed RSS del blog: permite suscribirse y facilita que agregadores lo descubran.
export function GET() {
  const items = getAllPosts().map((p) => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}/</link>
      <guid>${SITE_URL}/blog/${p.slug}/</guid>
      <pubDate>${new Date(`${p.date}T12:00:00-07:00`).toUTCString()}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog de G3 Logistics</title>
    <link>${SITE_URL}/blog/</link>
    <description>Logística y transporte de carga desde Los Mochis, Sinaloa.</description>
    <language>es-MX</language>${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
