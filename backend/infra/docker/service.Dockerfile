# syntax=docker/dockerfile:1.7
# Dockerfile genérico para todos los microservicios G3.
#
#   docker build -f infra/docker/service.Dockerfile --build-arg SERVICE=services/auth -t g3/auth .
#
# SERVICE = gateway | services/<auth|billing|drivers|fleet|trips|alerts|ai|integrations|invoicing>
# El contexto es `backend/`. La imagen conserva el layout del monorepo
# (/app/<SERVICE>/{dist,migrations,package.json}) para que las rutas
# relativas de `src/migrate.ts` (../migrations) funcionen igual que en dev.
#
#   CMD por defecto: node dist/main.js     (servicio HTTP, Cloud Run service)
#   Migraciones:     node dist/migrate.js  (Cloud Run Job migrate-<svc>)
#
# PID 1 es tini: reenvía SIGTERM a node (Cloud Run da 10 s para el apagado
# ordenado de onShutdown) y recoge procesos zombie.
ARG NODE_VERSION=22-alpine

# ---------- manifests: solo package.json + lockfile (cache de npm ci) ----------
# Se copian TODOS los package.json de los workspaces: `npm ci` valida el
# lockfile contra el árbol completo de workspaces.
FROM node:${NODE_VERSION} AS manifests
WORKDIR /src
COPY . .
RUN mkdir -p /out /migr \
 && find . -name package.json -not -path '*/node_modules/*' -print | tar -cf - -T - | tar -xf - -C /out \
 && cp package-lock.json tsconfig.base.json /out/ \
 && for d in $(find . -type d -name migrations -not -path '*/node_modules/*' -not -path '*/test/*'); do \
      mkdir -p "/migr/$d" && cp -a "$d/." "/migr/$d/"; \
    done

# ---------- build: deps completas + compilación ----------
FROM node:${NODE_VERSION} AS build
ARG SERVICE
RUN test -n "${SERVICE}" || (echo "Falta --build-arg SERVICE" && exit 1)
WORKDIR /repo
COPY --from=manifests /out ./
# Todas las deps de desarrollo del monorepo (igual que CI): algunos
# workspaces dependen de @types hoisteados por otros.
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY contracts/tsconfig.json ./contracts/
COPY contracts/src ./contracts/src
COPY platform-kit/tsconfig.json ./platform-kit/
COPY platform-kit/src ./platform-kit/src
COPY integrations-kit/tsconfig.json ./integrations-kit/
COPY integrations-kit/src ./integrations-kit/src
COPY ${SERVICE}/tsconfig.json ./${SERVICE}/
COPY ${SERVICE}/src ./${SERVICE}/src
RUN npm run build --workspace contracts \
 && npm run build --workspace platform-kit \
 && npm run build --workspace integrations-kit \
 && npm run build --workspace ${SERVICE}

# ---------- deps: solo dependencias de producción ----------
FROM node:${NODE_VERSION} AS deps
ARG SERVICE
WORKDIR /repo
COPY --from=manifests /out ./
RUN npm ci --omit=dev \
      --workspace contracts --workspace platform-kit --workspace integrations-kit --workspace ${SERVICE} \
      --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force

# ---------- assemble: árbol final (migrations/ opcional) ----------
FROM node:${NODE_VERSION} AS assemble
ARG SERVICE
COPY --from=build /repo /b
COPY --from=deps /repo /d
COPY --from=manifests /migr /m
RUN set -e; mkdir -p /out; cp -a /d/node_modules /out/node_modules; \
    for ws in contracts platform-kit integrations-kit "${SERVICE}"; do \
      mkdir -p "/out/${ws}"; \
      cp /b/${ws}/package.json "/out/${ws}/"; \
      cp -a "/b/${ws}/dist" "/out/${ws}/dist"; \
      if [ -d "/d/${ws}/node_modules" ]; then cp -a "/d/${ws}/node_modules" "/out/${ws}/node_modules"; fi; \
    done; \
    # migrations/ solo si el servicio la tiene (gateway y ai no).
    if [ -d "/m/${SERVICE}/migrations" ]; then cp -a "/m/${SERVICE}/migrations" "/out/${SERVICE}/migrations"; fi; \
    test -f "/out/${SERVICE}/dist/main.js" || test -f "/out/${SERVICE}/dist/migrate.js" \
      || (echo "${SERVICE}: no hay dist/main.js ni dist/migrate.js" && exit 1)

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runtime
ARG SERVICE
ARG GIT_SHA=unknown
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    PORT=8080 \
    G3_SERVICE_DIR=/app/${SERVICE} \
    G3_GIT_SHA=${GIT_SHA}
LABEL org.opencontainers.image.source="g3/backend" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      g3.service="${SERVICE}"
# Archivos de root y solo lectura para el usuario `node` (uid 1000) que corre el proceso.
COPY --from=assemble /out /app
WORKDIR /app/${SERVICE}
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
