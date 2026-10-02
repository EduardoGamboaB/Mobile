# G3 · Benchmark vs Total Protect

> Comparativo de lo que **hoy existe** en G3 Drive (app del operador) y
> G3 Admin (torre de control web) contra la oferta pública de
> **Total Protect** (Grupo Salinas).

| Fecha | 2026-10-02 |
|---|---|
| Audiencia | Fundadores · Consejo |
| Confidencial | Sí · NDA |
| Versión | 1.0 |

> **Nota sobre datos**: lo de Total Protect proviene de su sitio público,
> fichas de sus apps en tiendas y prensa especializada (T21, TyT,
> Cluster Industrial, Informador, ADN40), 2024–2025. No se tuvo acceso a
> demo ni a precios. Lo de G3 proviene del código de este repositorio
> (`mobile/`, `admin/`, `backend/`) y de `docs/qa/E2E-USABILITY-REPORT.md`.
> Se marca explícitamente cuando una capacidad de G3 existe solo como
> UI/demo y no como integración productiva.

---

## 1. Conclusión en una línea

**No son el mismo producto.** Total Protect es **seguridad patrimonial
de la carga** (GPS + hardware + video IA + central de monitoreo 24/7
con recuperación). G3 es **operación y cumplimiento del viaje desde el
operador** (bitácora NOM-087, inspección NOM-068, evidencias con IA,
gastos, POD, pagos al chofer, Carta Porte 3.0). La superposición real
está en *mapa de flota, alertas y botón de pánico*; ahí Total Protect
está muy por delante. En *flujo operativo del chofer y compliance*,
Total Protect prácticamente no compite.

→ La lectura estratégica es **complemento/integración**, no choque frontal.

---

## 2. Quién es Total Protect

| Dato | Detalle |
|---|---|
| Grupo | Grupo Salinas (hermana de Totalplay, Elektra, TV Azteca) |
| Origen | 2017–2018, para proteger la mercancía del propio grupo; luego se abre a terceros |
| Escala reportada | 140+ empresas · 70,000+ vehículos conectados · 34,000+ embarques custodiados/año · 99% de recuperación |
| Plataforma | **Unify** (lanzada en UNLOCK25, 2025) · 100% mexicana · enfoque V2X |
| Canal | Venta directa + Totalplay Empresarial (bundle con conectividad) |
| Modelo | Hardware instalado + servicio de monitoreo mensual |

### Portafolio público

| Producto | Qué hace |
|---|---|
| GPS / rastreo | Localización en tiempo real, recorridos, kilometraje, velocidad |
| **Unify** (plataforma web) | Miles de unidades simultáneas, dashboards personalizables, alertas inteligentes, capas de zonas de riesgo, combustible y tramos carreteros, IA para priorizar eventos |
| **Central de monitoreo 24/7** | Operadores certificados, protocolos de reacción, coordinación con autoridades, recuperación |
| **Botón de pánico** | Físico, oculto en tablero; dispara protocolo y **paro remoto** del motor |
| **Protect Video / Video Pro** | Cámaras con IA: fatiga, distracción, snapshots y miniclips ligados a alertas |
| **Copiloto Virtual** | ADAS + DMS con IA: prevención de accidentes supervisando conductor y camino |
| **Trace Lock** | Candado electrónico de caja con apertura remota desde la plataforma |
| **Sensor de combustible** | Recargas, descargas, rendimiento, detección de robo (comunican ahorros de hasta 15%) |
| **Solar Track** | GPS autónomo solar con alerta antisabotaje (para cajas/remolques) |
| Cámara de reversa | Add-on |
| Apps móviles | *Total Protect* (geolocalización, kilometraje, velocidad, botón de emergencia) y *Total Protect Fleet* — orientadas al **dueño/cliente**, no al flujo de trabajo del operador |

---

## 3. Matriz de capacidades

Leyenda: ✅ productivo · 🟡 construido en código/UI pero con stub, demo
o sin hardware · ❌ no existe

### 3.1 Lado operador (G3 Drive vs apps Total Protect)

| Capacidad | G3 Drive | Total Protect |
|---|:---:|:---:|
| App diseñada para el **chofer** (no para el dueño) | ✅ | ❌ |
| Lista de viajes asignados + ciclo de vida (carga → tránsito → descarga → **precierre** → cierre en matriz) | ✅ | ❌ |
| Bitácora digital de horas/eventos (NOM-087) | ✅ | ❌ |
| Inspección físico-mecánica pre-viaje con foto (NOM-068) | ✅ | ❌ |
| Evidencias con extracción IA (folio, toneladas, montos) | 🟡 (IA en stub; Vertex pendiente) | ❌ |
| Gastos con foto del ticket + política administrada | ✅ (OCR en stub) | ❌ |
| POD con firma | ✅ | ❌ |
| Chat operador ↔ dispatcher | ✅ | ❌ |
| Reporte tipificado de incidentes | ✅ | 🟡 (vía central, no app) |
| Ingresos / pagos del chofer | ✅ | ❌ |
| Modo offline con cola de sincronización | ✅ | n/d |
| Escaneo QR | ✅ | ❌ |
| Botón SOS | 🟡 (pantalla; sin central que reaccione) | ✅ (físico + app + central + paro de motor) |
| GPS continuo de la unidad | 🟡 (GPS del celular por evento) | ✅ (hardware dedicado, antisabotaje) |
| Detección de fatiga / distracción | ❌ | ✅ (video IA) |
| Publicada en tiendas | ❌ (APK build-ready, no firmado) | ✅ (iOS + Android) |

### 3.2 Torre de control (G3 Admin vs Unify)

| Capacidad | G3 Admin | Total Protect Unify |
|---|:---:|:---:|
| Mapa de flota en vivo | 🟡 (UI con datos demo; endpoint `fleet/live/positions` en memoria) | ✅ (miles de unidades) |
| Consola de alertas con severidad y "acknowledge" | 🟡 (UI sobre datos demo) | ✅ (IA prioriza eventos) |
| Capas de zonas de riesgo / tramos carreteros | ❌ | ✅ |
| Video en plataforma | ❌ | ✅ |
| Combustible (recargas, ordeña, rendimiento) | ❌ | ✅ (con sensor) |
| Control remoto de candado / paro de motor | ❌ | ✅ |
| Central humana 24/7 + recuperación | ❌ | ✅ (99% recuperación) |
| Alta y despacho de viajes | ✅ | ❌ |
| Gestión de tractores, remolques y choferes (licencias, vencimientos) | ✅ | 🟡 (inventario de unidades) |
| Timeline del viaje con precierre y cierre | ✅ | ❌ |
| Validación de POD y liberación de pago al chofer | ✅ | ❌ |
| Reglas de gastos para la app del chofer | ✅ | ❌ |
| Facturación CFDI 4.0 + **Carta Porte 3.0** multi-PAC | ✅ backend (23 tests) · 🟡 UI en mockup | ❌ |
| Planes self-service con upgrade (Free → Enterprise) | ✅ (Stripe en stub) | ❌ (venta consultiva) |
| Multi-tenant SaaS | ✅ | ✅ |
| Dashboards personalizables | ❌ (fijos) | ✅ |
| Responsive tablet | ✅ | n/d |

### 3.3 Negocio

| Dimensión | G3 | Total Protect |
|---|---|---|
| Comprador | Dueño/gerente de operación de transportista mediana | Gerente de seguridad / riesgos; shippers con carga de alto valor |
| Dolor que resuelve | Papeleo, cumplimiento NOM/SAT, control de viaje y gastos, pago al chofer | Robo de carga y unidad, siniestros, ordeña de combustible |
| Requiere instalación física | No (100% software, celular del chofer) | Sí (GPS, cámaras, candados, sensores) |
| Time-to-value | Minutos (descarga + alta) | Días/semanas (instalación) |
| Precio | Público: Free · Starter $349 · Pro $899 · Business $2,499 MXN/mes | No público; hardware + renta mensual por unidad |
| Escala | Operación laboratorio (~12 unidades), sin clientes SaaS externos | 140+ empresas, 70K+ vehículos |
| Marca / distribución | Nueva | Grupo Salinas + Totalplay Empresarial |

---

## 4. Lectura

### Dónde gana Total Protect (y G3 no debe pelear)
1. **Seguridad física y recuperación.** Hardware antisabotaje, paro de
   motor, candados, central 24/7 con 99% de recuperación. Replicarlo
   significa capital, alianzas con autoridades y años de operación.
2. **Video IA / ADAS / fatiga.** Requiere hardware a bordo.
3. **Combustible.** Su sensor ataca un dolor de $ directo y medible.
4. **Escala, marca y canal** (Totalplay).

### Dónde gana G3 (espacio vacío en Total Protect)
1. **El chofer como usuario.** Total Protect *vigila* al operador; G3
   *trabaja con* el operador (viajes, bitácora, gastos, pagos).
2. **Compliance mexicano nativo**: NOM-087, NOM-068 y Carta Porte 3.0
   con multi-PAC. Total Protect no toca nada fiscal ni de bitácora.
3. **Ciclo administrativo del viaje**: despacho → POD → precierre →
   cierre → pago al chofer → factura.
4. **Sin hardware y self-service**: entrada barata para flotas de
   5–50 unidades que no pagan custodia premium.

### Riesgos
- **Percepción de "otro GPS".** Si G3 se presenta con mapa y SOS en
  primer plano, el comparativo natural es Total Protect y G3 pierde.
  El mensaje debe ser *operación + cumplimiento*, no seguridad.
- **Total Protect podría agregar una app de operador.** Ya tiene apps,
  plataforma propia modular y base instalada; un módulo de bitácora
  es alcanzable para ellos. La ventaja de G3 es tiempo + profundidad
  en Carta Porte y flujo del chofer.
- **Huecos que un prospecto sí notará en demo**: mapa y alertas de
  Admin hoy corren sobre datos demo; SOS no tiene receptor real.

---

## 5. Recomendaciones

| # | Acción | Por qué |
|---|---|---|
| 1 | **Posicionar a G3 como complemento** de proveedores de rastreo (Total Protect incluido), no como sustituto | Evita competir donde se pierde; abre canal |
| 2 | **Conector de posiciones de terceros** en `fleet` (ingestar GPS de Total Protect/Wialon/Teltonika vía API) para alimentar el mapa de Admin | Resuelve el gap de mapa en vivo sin hardware propio; es el proveedor IoT pendiente del plan de 60 días |
| 3 | **SOS de G3 Drive → webhook** configurable hacia la central del proveedor de seguridad del cliente | Convierte un 🟡 en integración de valor en vez de una central propia |
| 4 | Explorar **alianza / canal con Total Protect o Totalplay Empresarial**: G3 como capa de operación y Carta Porte sobre su base de 140+ empresas | Su base instalada necesita exactamente lo que ellos no tienen |
| 5 | Antes de demos comerciales, conectar Admin (mapa, monitor) al backend real | Hoy son los puntos más débiles frente a cualquier rastreo |
| 6 | Mantener fuera del roadmap: video IA, candados, sensores de combustible propios | Intensivo en hardware; mejor integrarlos que construirlos |

---

## Fuentes

- [Total Protect · sitio oficial](https://www.totalprotect.mx/)
- [Total Protect · Copiloto Virtual](https://totalprotect.mx/copiloto-virtual/) · [Protect Video](https://totalprotect.mx/protect-video/)
- [TyT · Total Protect lanza plataforma propia y nuevos productos](https://www.tyt.com.mx/nota/total-protect-lanza-plataforma-propia-y-nuevos-productos-de-monitoreo-de-vehiculos)
- [TyT · Ahorro de hasta 15% en combustible](https://www.tyt.com.mx/nota/asi-ayuda-total-protect-a-las-flotas-a-ahorrar-hasta-15-en-consumo-de-combustible)
- [TyT · Grupo Salinas y el negocio de monitoreo satelital](https://www.tyt.com.mx/nota/grupo-salinas-muestra-el-musculo-en-el-negocio-de-monitoreo-satelital-a-traves-de-total-protect)
- [Cluster Industrial · nueva plataforma hecha en México](https://clusterindustrial.com.mx/total-protect-presenta-su-nueva-plataforma-de-monitoreo-y-seguridad-logistica-hecha-en-mexico/)
- [Grupo En Concreto · UNLOCK25 con enfoque V2X](https://grupoenconcreto.com/construccion/movilidad/total-protect-lanza-en-unlock25-plataforma-mexicana-de-seguridad-logistica-con-enfoque-v2x/)
- [T21 · Total Protect lleva la seguridad logística a otro nivel](https://t21.com.mx/total-protect-lleva-la-seguridad-logistica-a-otro-nivel/)
- [Informador · Seguridad integral con alta tecnología](https://www.informador.mx/economia/Ofrece-Total-Protect-seguridad-integral-con-alta-tecnologia-20250217-0020.html)
- [Totalplay Empresarial · Total Protect Flotillas](https://totalplayempresarial.com.mx/integracion-de-sistemas/total-protect-flotillas)
- Apps: [Total Protect (Google Play)](https://play.google.com/store/apps/details?id=io.totalprotect.tp) · [Total Protect Fleet (Google Play)](https://play.google.com/store/apps/details?id=io.totalprotectfleet.tp) · [App Store](https://apps.apple.com/mx/app/total-protect/id6636467112)
