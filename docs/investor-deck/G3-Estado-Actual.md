# G3 · Estado actual de activos

**Lo que existe hoy — inventario verificable para inversionistas**

| Campo | Detalle |
|---|---|
| Versión | 1.0 · Agosto 2026 |
| Clasificación | Confidencial · NDA |
| Propósito | Soporte de due diligence: qué está construido, en qué estado y cómo verificarlo |
| Complementa a | Business case (`docs/business-case/`) · Decks de inversión (`docs/investor-deck/`) |

---

## 1. Qué es G3 en una línea

Plataforma tecnológica del transporte mexicano (app del operador + torre de control web, con cumplimiento regulatorio nativo), validada en la operación real de una transportista agroindustrial propia, con un plan documentado de expansión a ecosistema de 7 verticales.

Este documento responde una sola pregunta del inversionista: **¿qué de todo eso ya existe hoy?**

---

## 2. Resumen del inventario

| Activo | Estado | Evidencia |
|---|---|---|
| G3 Drive · app móvil del operador | **Código completo · build-ready** | 30 pantallas · 14 suites de prueba · typecheck limpio |
| G3 Admin · torre de control web | **Código completo** | 15 páginas web + mockups del módulo de facturación |
| Backend de microservicios | **Código completo · TDD** | 8 servicios + gateway + contratos · 16 archivos de pruebas |
| Módulo Carta Porte 3.0 | **Código completo · 23 tests** | Generador CFDI 4.0 + complemento · multi-PAC con failover |
| Sitio corporativo g3logistics.mx | **Publicable** | Next.js estático · QA en 4 viewports · SEO + JSON-LD |
| Marco de seguridad | **Documentado** | 7 documentos · catálogo de controles GCP |
| Identidad de marca | **Completa** | Brand book (6 documentos + assets) + 5 conceptos enterprise |
| Manual organizacional del holding | **Completo** | 7 documentos: estructura, roles, gobierno, políticas, procesos |
| Estrategia documentada | **Completa** | Benchmark 30+ rivales · plan 7 fases/36 meses · análisis de nichos |
| Materiales de inversión | **Completos** | Business case con P&L modelado + 3 decks (overview, Logistics, Platform) |
| Operación laboratorio (G3 Logistics) | **Activa** | ≈12 unidades jaula granelera + thermo · corredor Bajío/norte |

---

## 3. Tecnología construida (detalle)

### 3.1 G3 Drive — app móvil del operador

Expo SDK 51 / React Native 0.74. **30 pantallas** organizadas en 16 módulos:

| Módulo | Qué hace |
|---|---|
| Bitácora (logbook) | Registro de eventos del viaje en un toque — diseñada para cumplir NOM-087 |
| Inspección | Checklist físico-mecánico pre-viaje alineado a NOM-068 |
| Evidencias | Cámara/galería con **extracción automática por IA** (folio, toneladas, montos) |
| Viajes · POD | Ciclo completo del viaje con prueba de entrega |
| Chat | Comunicación operador ↔ dispatcher |
| SOS | Botón de emergencia |
| Incidentes | Reporte tipificado con urgencia y ubicación |
| Pagos · Suscripción | Consulta de ingresos del operador · tiers del producto |
| Auth · Perfil · QR · Onboarding · Mapa · Dashboard | Soporte de cuenta y navegación |

**Capacidades transversales ya implementadas**: modo offline (cola de sincronización + SQLite local), captura GPS por evento, almacenamiento seguro de credenciales, modo demo para presentaciones comerciales.

**Estado de build**: assets de marca generados, configuración EAS lista (perfiles APK/AAB), `tsc --noEmit` sin errores. El APK se genera con un comando (`eas build -p android --profile preview`).

### 3.2 G3 Admin — torre de control web

**15 páginas** de panel web (Next.js): operación de viajes, flota, conductores y facturación, incluyendo los mockups funcionales del módulo Carta Porte (4 pantallas: emisión, historial, detalle, configuración PAC).

### 3.3 Backend — microservicios

NestJS con **npm workspaces** y contratos compartidos (`@g3/contracts`: DTOs, eventos, errores, catálogo de 5 tiers):

| Servicio | Dominio |
|---|---|
| `auth` | Identidad y sesiones |
| `fleet` | Unidades y remolques |
| `drivers` | Operadores, licencias, vencimientos |
| `trips` | Viajes con folio automático |
| `billing` | Suscripciones y tiers |
| `invoicing` | **CFDI 4.0 + Carta Porte 3.0** |
| `alerts` | Notificaciones y alertas |
| `ai` | OCR y clasificación (interfaz a Vertex AI) |
| `gateway` | API gateway unificado |

**16 archivos de pruebas** en el monorepo; desarrollo con TDD.

### 3.4 Módulo Carta Porte 3.0 (el moat regulatorio)

El activo técnico más defendible — **23 casos de prueba** cubriendo:

- Generación del XML CFDI 4.0 con complemento Carta Porte 3.0 (validaciones de permiso SICT, configuración vehicular, mercancías).
- **Estrategia multi-PAC con failover** (proveedor primario + respaldo) — el timbrado no se detiene si un PAC cae.
- **Idempotencia** para reintentos seguros tras errores del PAC.
- Clasificación de errores con **garantía técnica** (`guaranteeApplicable`): distingue error propio vs error del cliente.

Documentación comercial y operativa del módulo: spec técnico, plan de implementación de 12 semanas, comparativa de PACs y pitch comercial.

### 3.5 Sitio corporativo

`g3logistics.mx` — Next.js 14 estático, mobile-first, 4 rutas, QA automatizado (16 capturas en 4 viewports, 0 defectos), SEO agroindustrial con JSON-LD (`MovingCompany` + `Service`), listo para publicar en Cloud Storage + CDN con script de deploy incluido.

### 3.6 Seguridad y cumplimiento interno

Marco documentado en 7 piezas: fuente de política, mapeo al stack, catálogo de controles GCP, workflow de desarrollo seguro, checklist, protocolo de pruebas y respuesta a incidentes. Análisis estático configurado en el repo (semgrep + gitleaks).

---

## 4. Cumplimiento regulatorio implementado

| Norma | Dónde vive en el producto |
|---|---|
| **NOM-087-SCT-2-2017** (horas de servicio) | Bitácora digital de G3 Drive — reemplaza la libreta |
| **NOM-068-SCT-2-2014** (inspección físico-mecánica) | Módulo de inspección pre-viaje con checklist y evidencia |
| **CFDI 4.0 + Carta Porte 3.0** (SAT) | Servicio `invoicing` con multi-PAC, idempotencia y 23 tests |

Este cumplimiento nativo es la barrera de entrada: ninguna plataforma extranjera lo cubre y replicarlo toma 18+ meses.

---

## 5. Activos de estrategia y marca

| Activo | Contenido |
|---|---|
| **Brand book** | Esencia, arquitectura de marca, identidad visual, voz/tono, aplicaciones + assets; 5 conceptos alternos enterprise |
| **Manual organizacional** | Estructura del holding (3 entidades), roles, gobierno corporativo, políticas, cadencias y procesos |
| **Benchmark competitivo** | 30+ rivales en 7 capas · 14 dimensiones críticas (G3 cubre 14/14; ningún rival >7) · mapa de posicionamiento |
| **Plan de crecimiento** | 7 fases / 36 meses hacia ecosistema multi-lado · de SaaS pre-revenue hoy a $18M MXN/mes (proyección) |
| **Análisis de nichos** | 7 nichos evaluados · 3 priorizados (Carta Porte 3.0, cooperativas, cadena de frío) |
| **Business case** | 14 páginas: opciones analizadas, P&L modelado con supuestos, riesgos, gates, KPIs |
| **Decks** | Overview del proyecto (12 slides) · Seed Logistics (14) · Seed Platform (15) |

---

## 6. Estructura corporativa y operación

- **S.A.P.I. de C.V. constituida** — cap table listo para inversión institucional. (La constitución de las 3 entidades del holding está en el plan de 60 días.)
- **G3 Logistics** (operación laboratorio): transportista agroindustrial activa desde 2018, ≈12 unidades (jaula granelera + thermo), corredor Bajío + norte, torre de control 24/7. **Rol en el proyecto: exclusivamente laboratorio de validación — no financia fases.**

---

## 7. Transparencia: lo que aún no está

Para que la diligencia no encuentre sorpresas, los gaps conocidos y su plan:

| Gap | Plan (ventana 60 días) |
|---|---|
| Integraciones productivas (Vertex AI, Stripe, TypeORM) hoy operan como stubs/interfaces | Implementación real — punto 2 del plan de 60 días |
| Clientes SaaS externos (hoy la usuaria es la operación propia) | Firmar 5–10 clientes beta |
| Constitución formal de las 3 entidades del holding | En proceso — punto 1 del plan |
| Proveedor IoT para Fase 1 | RFP a Teltonika / Queclink / MiX |
| Estados financieros auditables 2024–2025 | Preparación para data room |
| APK firmado en tiendas | Build con un comando (EAS); publicación tras clientes beta |

---

## 8. Cómo verificarlo (data room)

Todo lo listado es auditable en el repositorio del proyecto:

| Qué | Dónde |
|---|---|
| Código de app, panel y backend | `mobile/` · `admin/` · `backend/` |
| Pruebas del módulo Carta Porte | `backend/services/invoicing/test/` |
| Sitio y QA | `website/` + `website/QA-REPORT.md` |
| Seguridad | `security/` |
| Marca y organización | `holding/brand/` · `holding/organization/` |
| Estrategia | `holding/strategy/` |
| Materiales de inversión | `docs/` |

Demo en vivo de G3 Drive (modo demo integrado) y G3 Admin disponible en llamada.

---

## 9. Contacto

**Fundador / CEO** · [Nombre] · inversion@g3logistics.mx · WhatsApp: [teléfono]

---

*Inventario levantado directamente del repositorio en agosto 2026. Cifras de pantallas, servicios y pruebas verificables por conteo en el código. Distribución restringida bajo NDA.*
