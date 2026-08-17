# g3-pos-backend — Backend de sincronización del POS Móvil

Servicio REST que recibe los cambios encolados por la app (`pos/`, patrón
outbox) y los persiste centralmente. Express + TypeScript sobre el SQLite
integrado de Node ≥ 22.5 — **cero dependencias nativas**, un solo binario de
despliegue.

## Contrato

La app envía cada cambio pendiente cuando recupera conexión:

```
POST /:entity            Authorization: Bearer <API_KEY>
{ "op": "upsert" | "delete", "entityId": "…", "payload": {…}, "queuedAt": "ISO" }
```

Entidades: `products`, `suppliers`, `customers`, `purchases`, `sales`,
`invoices`, `movements`.

Endpoints adicionales:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | estado del servicio (sin auth) |
| GET | `/:entity?since=ISO&limit=n` | pull incremental; devuelve `nextSince` como cursor |
| GET | `/stats` | conteo de registros vivos por entidad |

Los deletes son *soft* (`deleted: true`) para que otros dispositivos puedan
replicarlos vía pull.

## Ejecutar

```bash
npm install
npm run build
PORT=3000 API_KEY=super-secreta DB_PATH=./data/pos-sync.db npm start
```

En la app: `Configuración → Sincronización` → URL `https://tu-host` y la
misma API key.

### Docker

```bash
docker build -t g3-pos-backend .
docker run -p 3000:3000 -e API_KEY=super-secreta -v pos-data:/app/data g3-pos-backend
```

## Pruebas

```bash
npm test    # supertest sobre el contrato completo (auth, upsert, delete, pull, stats)
```

## Evolución sugerida

- **Multi-tenant / multi-sucursal**: agregar `storeId` derivado de la API key.
- **Postgres**: `SyncStore` está aislado en `src/db.ts`; portar las 4 consultas.
- **Timbrado CFDI**: al recibir `invoices`, llamar al PAC y devolver el UUID.
- **Panel web**: consumir `GET /:entity` y `/stats` para reportes centrales.
