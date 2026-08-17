# POS Móvil — Punto de venta genérico

Aplicación móvil de punto de venta construida con **React Native + Expo +
TypeScript**, diseñada para adaptarse a cualquier tipo de negocio (abarrotes,
ferretería, farmacia, boutique…). Funciona **100 % offline** con base de datos
local SQLite y sincroniza automáticamente con un backend cuando hay conexión.

## Módulos

| Módulo | Qué incluye |
|---|---|
| **Punto de venta** | Carrito, búsqueda, escáner de códigos con la cámara, descuentos, efectivo/tarjeta/transferencia, cálculo de cambio |
| **Productos** | Catálogo con SKU, código de barras, categoría, unidad, precio, costo, tasa de impuesto y stock mínimo |
| **Inventario** | Existencias en tiempo real, valuación a costo y a venta, kardex por producto, ajustes de entrada/salida |
| **Clientes** | Directorio con datos fiscales (RFC, régimen, C.P., uso CFDI), historial de compras; se asignan en el cobro y prellenan la factura |
| **Proveedores** | Directorio con datos fiscales y de contacto |
| **Compras** | Recepción de mercancía por proveedor: sube stock y actualiza el costo automáticamente |
| **Facturación** | Emisión de facturas con datos fiscales del receptor, folios por serie, PDF listo para compartir |
| **Ticket** | Impresión en impresora térmica Bluetooth (ESC/POS, 58/80 mm) con fallback a PDF |
| **Reportes** | Ventas (por día, método de pago, top productos), compras (por proveedor), inventario (valuación y alertas) |
| **Notificaciones** | Centro de alertas + notificaciones locales: stock mínimo, producto agotado, avisos del sistema |
| **Configuración** | Branding completo (logo, nombre, dirección), datos de facturación, moneda e impuestos, ticket, impresora y sincronización |

## Arquitectura

```
App.tsx                      arranque: SQLite → settings → notificaciones → sync
src/
├── models/types.ts          entidades (montos en centavos, cantidades en milésimas)
├── db/                      SQLite offline-first
│   ├── database.ts            esquema + folios consecutivos
│   ├── products/suppliers/…   repositorios por entidad
│   ├── inventory.ts           movimientos de kardex + valuación
│   └── outbox.ts              cola de cambios para sincronizar
├── services/
│   ├── alerts.ts              alertas de stock mínimo/agotado + push local
│   ├── printing/escpos.ts     generador ESC/POS puro (testeado en Jest)
│   ├── printing/printer.ts    Bluetooth térmica → fallback PDF
│   ├── invoicing.ts           PDF de factura
│   ├── reports.ts             agregados SQL de ventas/compras
│   └── sync.ts                motor outbox → REST al recuperar conexión
├── stores/                  Zustand (settings, carrito, notificaciones, sync, escáner)
├── navigation/              tabs (Vender, Productos, Reportes, Más) + stacks
└── screens/                 17 pantallas
```

### Diseño adaptativo (mobile first)

`src/hooks/useLayout.ts` define los breakpoints por ancho de ventana
(soporta split-screen): **< 600** teléfono (1 columna), **≥ 600** tableta
(listas a 2 columnas, formularios centrados a 640 px), **≥ 900** pantalla
ancha (POS a dos paneles: catálogo | carrito, y listas a 3 columnas).
`orientation: "default"` permite vertical en teléfonos y horizontal en
tabletas. Sin librerías de UI pesadas: componentes propios ligeros para
rendir bien en gama media y baja.

### Publicación en tiendas

- `app.json`: bundle IDs (`com.g3.posmobile`), versión + `versionCode` /
  `buildNumber`, íconos (`assets/icon.png`, adaptive icon Android), splash,
  textos de permisos (cámara, Bluetooth, galería) e
  `ITSAppUsesNonExemptEncryption`.
- `eas.json`: perfiles `development` (dev client), `preview` (APK interno) y
  `production` (AAB con auto-incremento) + `eas submit`.
- Los íconos incluidos son placeholders generados; reemplázalos por el
  branding final antes de publicar.

```bash
npx eas build --profile production --platform all
npx eas submit --platform android   # Play Store
npx eas submit --platform ios       # App Store
```

### Offline / Online

Todo se escribe primero en SQLite; cada cambio queda en la tabla `outbox`.
Con `Configuración → Sincronización` apuntando a tu backend, el motor envía
los cambios pendientes al recuperar conexión (`POST {syncUrl}/{entity}` con
`Authorization: Bearer {apiKey}`). Sin backend configurado la app opera en
modo solo offline sin errores.

El backend de referencia que implementa este contrato vive en
[`../pos-backend`](../pos-backend/README.md) (Express + TypeScript, con
pruebas y Dockerfile).

### Decisiones de diseño

- **Dinero en centavos y cantidades en milésimas** (enteros): sin errores de
  punto flotante; soporta venta a granel (1.5 kg).
- **Precios con impuesto incluido** y desglose por línea con prorrateo de
  descuentos (ver `utils/totals.ts`, con pruebas).
- **Kardex íntegro**: el stock solo cambia mediante movimientos
  (venta, compra, ajuste, inicial), nunca por edición directa.
- **Genérico por configuración**: moneda, símbolo, tasas de impuesto, serie de
  facturas, branding y textos del ticket se definen en Configuración.

## Desarrollo

```bash
cd pos
npm install
npm start           # Expo Dev Server (funciona en Expo Go, salvo Bluetooth)
npm run typecheck
npm test            # pruebas de dinero, totales y ESC/POS
```

Para la impresora térmica Bluetooth se necesita un **development build**
(el módulo es nativo); ver [BUILD.md](./BUILD.md).
