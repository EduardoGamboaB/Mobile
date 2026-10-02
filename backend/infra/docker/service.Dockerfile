# Dockerfile genérico para todos los microservicios G3.
# Se construye con --build-arg SERVICE=<gateway|services/<auth|billing|fleet|drivers|trips|alerts|ai|integrations>>
ARG NODE_VERSION=20-alpine

# ---------- build stage ----------
FROM node:${NODE_VERSION} AS build
ARG SERVICE
WORKDIR /repo

# Copiamos sólo los manifests primero para aprovechar layer cache
COPY package.json package-lock.json* tsconfig.base.json ./
COPY contracts/package.json contracts/tsconfig.json ./contracts/
COPY contracts/src ./contracts/src
# Kit de proveedores externos (@g3/integrations): lo usan auth, alerts,
# billing, invoicing e integrations. Se copia siempre (es pequeño).
COPY integrations-kit/package.json integrations-kit/tsconfig.json ./integrations-kit/
COPY integrations-kit/src ./integrations-kit/src
# Kit de plataforma (@g3/platform): Postgres, Redis, salud, apagado ordenado.
COPY platform-kit/package.json platform-kit/tsconfig.json ./platform-kit/
COPY platform-kit/src ./platform-kit/src

# Dependencias del workspace específico
COPY ${SERVICE}/package.json ${SERVICE}/tsconfig.json ./${SERVICE}/

# Instalar todas las deps de ese workspace + contracts
RUN npm install --workspace ${SERVICE} --workspace contracts --workspace platform-kit --workspace integrations-kit --ignore-scripts --no-audit --no-fund

# Copiar el código y compilar
COPY ${SERVICE}/src ./${SERVICE}/src
RUN npm run build --workspace contracts && npm run build --workspace platform-kit && npm run build --workspace integrations-kit && npm run build --workspace ${SERVICE}

# ---------- runtime ----------
FROM node:${NODE_VERSION}
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/contracts/dist ./contracts/dist
COPY --from=build /repo/contracts/package.json ./contracts/
COPY --from=build /repo/integrations-kit/dist ./integrations-kit/dist
COPY --from=build /repo/integrations-kit/package.json ./integrations-kit/
COPY --from=build /repo/platform-kit/dist ./platform-kit/dist
COPY --from=build /repo/platform-kit/package.json ./platform-kit/
COPY --from=build /repo/${SERVICE}/dist ./dist
COPY --from=build /repo/${SERVICE}/package.json ./package.json

RUN addgroup -S g3 && adduser -S g3 -G g3 && chown -R g3:g3 /app
USER g3

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O- http://localhost:${PORT:-8080}/health || exit 1
CMD ["node", "dist/main.js"]
