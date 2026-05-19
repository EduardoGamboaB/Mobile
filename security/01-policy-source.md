# 01 · Fuente de las políticas

## Catálogo DSI Grupo Salinas

Las políticas de ciberseguridad aplicables a G3 provienen del
catálogo de controles **DSI (Dirección de Seguridad de la
Información) de Grupo Salinas**, archivo `Controles_DSI.xlsx`.

### Composición del catálogo original

| Atributo | Valor |
|---|---|
| Filas totales (control × unidad de negocio) | 6,374 |
| Controles únicos | 1,594 |
| Hojas | 1 (`Controles`) |
| Columnas por control | 12 |

### Áreas de validación

| Área | Filas | Qué cubre |
|---|---:|---|
| CSA | 2,816 | Cloud Security Assessment — configuración de servicios cloud |
| Cloud DSI | 2,739 | Lineamientos generales de cloud de la DSI |
| NetSec | 576 | Seguridad de red (firewalls, segmentación, WAF) |
| CyAAL IT | 239 | Ciberseguridad de aplicaciones IT |
| Arquitectura | 1 | Lineamientos arquitectónicos |

### Clouds cubiertos

| Cloud | Filas |
|---|---:|
| AWS | 3,862 |
| Google Cloud | 2,012 |
| Huawei | 348 |
| Azure | 99 |

### Unidades de negocio del catálogo original

TOTALPLAY, BANCO AZTECA, ELEKTRA, TV AZTECA, TOTAL CYBER-SEC.

> G3 no está en la lista — pero el catálogo es **la referencia
> autoritativa** porque es el estándar corporativo del grupo
> Salinas. Adoptamos los controles aplicables a nuestro stack
> (Google Cloud) por **adhesión voluntaria** y porque construye
> credibilidad enterprise.

## Por qué adoptamos este catálogo

1. **Madurez probada**: catálogo de 1,594 controles validado por
   un grupo financiero/telecom regulado (Banco Azteca opera bajo
   CNBV).
2. **Cobertura completa**: incluye IAM, encryption, networking,
   logging, AI/ML, secrets, container, base de datos — el espectro
   completo de superficie de ataque cloud.
3. **Alineación con estándares**: se mapea naturalmente a CIS
   Benchmarks, NIST 800-53, ISO 27001 e MX-NMX-I-27001-NYCE.
4. **Auditabilidad**: cada control tiene código único trazable.

## Cómo procesamos el catálogo

```
Controles_DSI.xlsx
  │
  ▼
[parse_xlsx.py]        ← extrae 1,594 controles únicos
  │
  ▼
[extract_relevant.py]  ← filtra a 181 controles aplicables a GCP/G3
  │
  ▼
[export_by_service.py] ← exporta JSON canónico por servicio
  │
  ▼
security/data/controls.json + controls-<servicio>.json
  │
  ▼
Fichas por servicio en security/03-controls/
```

## Estructura de un control DSI

Cada control tiene 12 campos:

| Campo | Ejemplo |
|---|---|
| Código | `Google-Cloud Run-01` |
| Área validación | `Cloud DSI` |
| Nube | `Google` |
| Tipo servicio | `Compute` |
| Servicio | `Cloud Run` |
| Unidad de negocio | (replicado por BU) |
| Ponderación | 3 / 5 (riesgo) |
| Descripción | qué exige el control |
| ¿En qué ayuda? | por qué importa |
| ¿Cómo cumplirlo? | guía / link a docs GCP |
| Activo | Sí / No |
| Fecha último movimiento | (gobernanza interna DSI) |

## Gobernanza del catálogo en G3

| Item | Owner | Frecuencia |
|---|---|---|
| Sincronización con Excel fuente | Compliance Officer | Trimestral |
| Validación de cumplimiento por servicio | SRE + cada team lead | Mensual |
| Reporte al Consejo | Compliance Officer | Trimestral |
| Auditoría externa | Auditor independiente | Anual |
| Update tras incidente | Compliance Officer | Inmediato post-postmortem |

## Mapeo a otros estándares

Los controles DSI se relacionan así con marcos públicos:

```
DSI Grupo Salinas
  ├── CIS Benchmarks (GCP Foundations Benchmark v2.0)
  ├── NIST SP 800-53 Rev. 5
  ├── ISO/IEC 27001:2022
  ├── PCI-DSS 4.0     (si en algún momento tocamos tarjetas)
  ├── LFPDPPP (MX)    (Ley Federal de Protección de Datos)
  └── GDPR            (si vendemos a Europa en el futuro)
```

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Documento inicial · 181 controles G3 extraídos |
