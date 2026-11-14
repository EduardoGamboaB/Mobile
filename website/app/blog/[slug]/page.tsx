import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import { formatDate, getAllPosts, getPost } from '../../../lib/blog';
import { SITE_URL, whatsappLink } from '../../../lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  const url = `/blog/${post.slug}/`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    authors: [{ name: post.author }],
    keywords: post.tags,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      images: [{ url: post.cover, alt: post.coverAlt }],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description, images: [post.cover] },
  };
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const others = getAllPosts().filter((p) => p.slug !== post.slug).slice(0, 2);
  const url = `${SITE_URL}/blog/${post.slug}/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        image: `${SITE_URL}${post.cover}`,
        datePublished: post.date,
        dateModified: post.date,
        author: { '@type': 'Organization', name: post.author, url: SITE_URL },
        publisher: { '@id': `${SITE_URL}/#negocio` },
        mainEntityOfPage: url,
        inLanguage: 'es-MX',
        keywords: post.tags.join(', '),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <article>
        <header className="hero hero--center hero--compact">
          <div className="container">
            <nav className="breadcrumbs" aria-label="Ruta de navegación">
              <Link href="/">Inicio</Link> <span aria-hidden="true">/</span> <Link href="/blog/">Blog</Link>
            </nav>
            <h1>{post.title}</h1>
            <p className="lead">{post.description}</p>
            <p className="post__meta">
              <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.minutes} min de lectura · {post.author}
            </p>
          </div>
        </header>

        <div className="section post">
          <div className="container legal">
            <img className="post__cover" src={post.cover} alt={post.coverAlt} width={1280} height={853} decoding="async" />
            <div className="post__body" dangerouslySetInnerHTML={{ __html: post.html }} />
            {post.tags.length > 0 && (
              <ul className="post__tags" aria-label="Temas">
                {post.tags.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
          </div>
        </div>
      </article>

      <section className="section section--tint">
        <div className="container">
          <div className="cta-band" data-wa-away>
            <div>
              <h2>¿Necesitas mover carga?</h2>
              <p>Cotiza con G3 Logistics: flota propia y respuesta en menos de 4 horas hábiles.</p>
            </div>
            <div className="cta-band__actions">
              <Link href="/contacto/" className="btn btn--primary">Cotizar un servicio <Icon name="arrow" /></Link>
              <a href={whatsappLink()} className="btn btn--ghost" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          </div>

          {others.length > 0 && (
            <div className="post__more">
              <h2>Sigue leyendo</h2>
              <div className="grid grid--2">
                {others.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}/`} className="card card--link">
                    <h3>{p.title}</h3>
                    <p className="mb-0">{p.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
