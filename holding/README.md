# G3 Holding

Documento maestro del grupo empresarial G3. Contiene la arquitectura de
marca, el manual organizacional y los lineamientos que rigen a las
empresas operativas que pertenecen al holding.

## Estructura del holding

```
                          ┌────────────────────┐
                          │   G3 Holding S.A.  │
                          │   de C.V.          │
                          │   (Sociedad madre) │
                          └─────────┬──────────┘
                                    │ 100%
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
   ┌──────────▼──────────┐ ┌────────▼────────┐ ┌──────────▼──────────┐
   │  G3 Logistics       │ │  G3 Tech        │ │  G3 Foundation      │
   │  S.A. de C.V.       │ │  S.A.P.I. de    │ │  A.C.               │
   │                     │ │  C.V.           │ │                     │
   │  Operación de       │ │  Desarrollo y   │ │  Capacitación y     │
   │  transporte de      │ │  comercializa-  │ │  bienestar de       │
   │  carga terrestre    │ │  ción de G3     │ │  operadores y       │
   │  en México.         │ │  Admin y G3     │ │  comunidades de la  │
   │                     │ │  Drive.         │ │  carretera.         │
   └─────────────────────┘ └─────────────────┘ └─────────────────────┘
        Empresa madre        Spin-off tech         Brazo social
        (cliente cero        (productizó la        (devuelve a la
        de la tech)          operación)            comunidad)
```

| Entidad | Razón social sugerida | Forma jurídica | Objeto social |
|---|---|---|---|
| G3 Holding | G3 Holding S.A. de C.V. | Sociedad Anónima de Capital Variable | Tenencia y administración de acciones de subsidiarias |
| G3 Logistics | G3 Logistics S.A. de C.V. | S.A. de C.V. | Autotransporte federal de carga terrestre |
| G3 Tech | G3 Tech S.A.P.I. de C.V. | Sociedad Anónima Promotora de Inversión | Desarrollo de software, SaaS B2B |
| G3 Foundation | Fundación G3 A.C. | Asociación Civil | Capacitación y bienestar de operadores |

> **Por qué la holding S.A. de C.V. y G3 Tech S.A.P.I.**: la S.A.P.I.
> permite captar capital de fondos (cap table flexible, vesting de equity
> para fundadores y equipo tech). La holding S.A. centraliza el control
> y simplifica una posible venta o IPO de cualquier subsidiaria.

## Índice de documentos

### Brand Book ([`brand/`](./brand/))

1. [Esencia de marca](./brand/01-brand-essence.md) — propósito, visión, misión, valores
2. [Arquitectura de marca](./brand/02-brand-architecture.md) — relación holding ↔ submarcas
3. [Identidad visual](./brand/03-visual-identity.md) — logo, paleta, tipografía, iconografía
4. [Voz y tono](./brand/04-voice-tone.md) — cómo escribimos
5. [Aplicaciones](./brand/05-applications.md) — papelería, librea de vehículos, digital
6. [Assets](./brand/assets/) — SVGs descargables

### Manual Organizacional ([`organization/`](./organization/))

1. [Estructura organizacional](./organization/01-structure.md) — entidades + organigrama
2. [Roles y responsabilidades](./organization/02-roles-responsibilities.md) — perfiles + RACI
3. [Gobierno corporativo](./organization/03-governance.md) — consejo, comités, matriz de decisión
4. [Políticas](./organization/04-policies.md) — ética, datos, HSE, anti-acoso, anti-corrupción
5. [Cadencias operativas](./organization/05-cadences.md) — juntas, reportes, ciclos de planeación
6. [Procesos clave](./organization/06-processes.md) — onboarding, viajes, cobranza, soporte

## Estado de este documento

| Item | Estado |
|---|---|
| Brand book versión 1.0 | ✓ |
| Manual organizacional versión 1.0 | ✓ |
| Constitución legal del holding | Pendiente con notario |
| Registro de marcas en IMPI (G3 Logistics, G3 Admin, G3 Drive) | Pendiente |
| Tax setup (RFC del holding y subsidiarias) | Pendiente |
| Apertura de cuentas bancarias por entidad | Pendiente |

## Cómo usar este repositorio

- Los documentos son la **fuente única de verdad** para cualquier
  iniciativa de marca, comunicación o estructura del grupo
- Cualquier cambio se propone vía PR con justificación
- El **Comité de Marca** aprueba cambios a `brand/`
- El **Consejo de Administración** aprueba cambios a `organization/`
- Versionado: cada doc lleva tabla de cambios al final
