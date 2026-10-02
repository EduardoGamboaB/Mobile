const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const { securityHeaders } = require('./security-headers');

/**
 * Export estático (`out/`). Los headers de seguridad (security-headers.js)
 * se aplican aquí solo en `next dev`: el export no sirve headers propios
 * (`next start` no aplica con output:'export'). En producción los pone el
 * Load Balancer (deploy/deploy.sh) y la CSP va además como <meta> en
 * app/layout.tsx.
 *
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
module.exports = (phase) => ({
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // Indicador de `next dev` (Next 15) a la derecha: a la izquierda tapa el sidebar.
  devIndicators: { position: 'bottom-right' },
  ...(phase === PHASE_DEVELOPMENT_SERVER
    ? { headers: async () => [{ source: '/:path*', headers: securityHeaders({ dev: true }) }] }
    : {}),
});
