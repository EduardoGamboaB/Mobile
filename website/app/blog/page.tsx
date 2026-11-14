import Link from 'next/link';
import type { Metadata } from 'next';
import { formatDate, getAllPosts } from '../../lib/blog';

export const metadata: Metadata = {
  title: 'Blog de logística y transporte de carga',
  description:
    'Guías y artículos sobre transporte de carga, fletes, Carta Porte, cumplimiento y logística para empresas, desde Los Mochis, Sinaloa.',
  alternates: { canonical: '/blog/', types: { 'application/rss+xml': '/blog/rss.xml' } },
  openGraph: {
    title: 'Blog de logística · G3 Logistics',
    url: '/blog/',
    images: [{ url: '/og-g3logistics.jpg', width: 1200, height: 630 }],
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <>
      <section className="hero hero--center hero--compact">
        <div className="container">
          <span className="eyebrow">Blog</span>
          <h1>Logística y transporte de carga, explicados.</h1>
          <p className="lead">
            Guías prácticas para mover tu carga mejor: fletes, documentación,
            cumplimiento y planeación de rutas.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {posts.length === 0 ? (
            <p className="text-center">Muy pronto publicaremos nuestros primeros artículos.</p>
          ) : (
            <div className="grid grid--3">
              {posts.map((p) => (
                <article key={p.slug} className="card post-card">
                  <Link href={`/blog/${p.slug}/`} className="post-card__img" tabIndex={-1} aria-hidden="true">
                    <img src={p.cover} alt="" width={640} height={427} loading="lazy" decoding="async" />
                  </Link>
                  <div className="post-card__body">
                    <p className="post-card__meta">
                      <time dateTime={p.date}>{formatDate(p.date)}</time> · {p.minutes} min de lectura
                    </p>
                    <h2 className="post-card__title">
                      <Link href={`/blog/${p.slug}/`}>{p.title}</Link>
                    </h2>
                    <p className="mb-0">{p.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
