import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../../components/Icon';

export const metadata: Metadata = {
  title: 'G3 Drive — La app para el operador en carretera | G3 Logistics',
  description:
    'App móvil para conductores: bitácora, evidencias con OCR, chat con dispatcher, SOS y modo offline. Pensada para usarse con guantes.',
};

const FEATURES = [
  {
    icon: 'route' as const,
    title: 'Bitácora en un toque',
    desc: 'Carga, descarga, llegada, gasolina, casetas, comida. La IA pre-clasifica el gasto a partir de tu nota.',
  },
  {
    icon: 'cam' as const,
    title: 'Cámara con OCR (Starter+)',
    desc: 'Carta porte, factura, comprobante de caseta. Foto y los datos clave se extraen solos.',
  },
  {
    icon: 'phone' as const,
    title: 'Chat con dispatcher',
    desc: 'Texto, fotos y ubicación en vivo. Mensajes urgentes se escalan a admin automáticamente.',
  },
  {
    icon: 'shield' as const,
    title: 'Botón SOS siempre visible',
    desc: 'Un toque alerta a admin y seguridad con tu ubicación. Funciona aún con la pantalla bloqueada.',
  },
  {
    icon: 'wallet' as const,
    title: 'Ingresos del viaje',
    desc: 'Ve cuánto vas a cobrar por el viaje activo y el acumulado del mes. Sin sorpresas en quincena.',
  },
  {
    icon: 'lock' as const,
    title: 'Modo offline',
    desc: 'Sin señal en la sierra o en el patio. La app guarda todo y sincroniza al recuperar conexión.',
  },
];

export default function DrivePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Producto · Móvil</span>
            <h1>G3 Drive</h1>
            <p className="lead">
              La app del operador en carretera. Diseñada para usarse con
              guantes, con poca señal y sin mirar el celular más de 2
              segundos por interacción.
            </p>
            <div className="hero__cta">
              <Link href="/contacto/" className="btn btn--primary">
                Descargar para tu flota <Icon name="arrow" />
              </Link>
              <Link href="/precios/" className="btn btn--ghost">
                Ver planes
              </Link>
            </div>
            <p style={{ marginTop: 18, fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>
              Disponible para iOS y Android. La descarga se libera al activar
              cualquier plan (incluido Free).
            </p>
          </div>

          <div style={{ display: 'grid', placeItems: 'center' }}>
            <div className="phone" aria-hidden>
              <div className="phone__notch" />
              <div className="phone__screen">
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Bitácora · Viaje G3-2026-00134
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Salida del patio', time: '06:42', kind: 'ok' },
                    { label: 'Caseta 95 — $340', time: '07:18', kind: 'ok' },
                    { label: 'Diesel 180L — $4,860', time: '09:30', kind: 'ok' },
                    { label: 'Tope · Sayula', time: '11:05', kind: 'warn' },
                  ].map((r) => (
                    <div key={r.label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '10px 12px', borderRadius: 8,
                      fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)',
                    }}>
                      <div>
                        <strong style={{ color: '#fff', display: 'block' }}>{r.label}</strong>
                        <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>{r.time}</span>
                      </div>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: r.kind === 'ok' ? '#4ade80' : '#fbbf24',
                        alignSelf: 'center',
                      }} />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, padding: '14px', border: 'none', borderRadius: 999, background: 'var(--road-500)', color: 'white', fontWeight: 700 }}>
                    + Registrar evento
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Capacidades</span>
            <h2>Hecha para los kilómetros reales.</h2>
            <p style={{ maxWidth: 620, margin: '0 auto' }}>
              Probada con operadores que manejan 12 horas. Cada pantalla se
              valida con uno solo dedo y se entiende sin manual.
            </p>
          </div>

          <div className="grid grid--3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div className="card__icon"><Icon name={f.icon} /></div>
                <h3>{f.title}</h3>
                <p style={{ marginBottom: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container split split--reverse">
          <div>
            <span className="eyebrow">Día del operador</span>
            <h2>Una jornada con G3 Drive.</h2>
            <p>
              Así se ve un día completo desde el celular del conductor — sin
              papeleo, sin reportes manuales, sin "¿dónde quedó la nota?".
            </p>
            <ul className="list-check">
              <li><strong>06:30</strong> · Inicia viaje con un swipe. Foto de odómetro automática.</li>
              <li><strong>09:00</strong> · Diesel. Foto del recibo → OCR captura monto, litros, plaza.</li>
              <li><strong>11:00</strong> · Dispatcher pide ETA por chat → comparte ubicación en vivo.</li>
              <li><strong>14:30</strong> · Llega a destino. Foto de carta porte sellada → cierra viaje.</li>
              <li><strong>15:00</strong> · Admin libera el pago. Notificación con el monto.</li>
            </ul>
          </div>

          <div className="card">
            <h3>Para flotas grandes</h3>
            <p>
              En planes Business y Enterprise, G3 Drive se entrega con
              configuración corporativa: branding de la empresa, asignación
              automática de viajes, integración con tu nómina y reportes
              semanales por correo.
            </p>
            <Link href="/contacto/" className="btn btn--dark">
              Hablar con ventas <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Equipa a tus operadores hoy.</h2>
              <p>iOS y Android. Sin costo por descarga, viene con tu plan G3.</p>
            </div>
            <Link href="/contacto/" className="btn btn--dark">Solicitar acceso</Link>
          </div>
        </div>
      </section>
    </>
  );
}
