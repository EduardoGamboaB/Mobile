# ----- build stage -----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --production

# ----- runtime stage -----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# usuario no-root para Cloud Run
RUN addgroup -S g3 && adduser -S g3 -G g3
COPY --from=build --chown=g3:g3 /app/node_modules ./node_modules
COPY --from=build --chown=g3:g3 /app/dist ./dist
COPY --from=build --chown=g3:g3 /app/package.json ./
USER g3
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "dist/main.js"]
