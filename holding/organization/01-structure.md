# 01 · Estructura organizacional

## Entidades

| Entidad | Función | Empleados objetivo año 1 |
|---|---|---|
| G3 Holding | Corporativo: estrategia, finanzas, legal, RRHH | 8 |
| G3 Logistics | Operación de transporte | 72 |
| G3 Tech | Producto, ingeniería, customer success | 18 |
| Fundación G3 | Programas sociales | 3 |
| **Total** | | **101** |

> Headcount estimado al cierre del año 1 de operación formal del
> holding. Crecimiento orgánico, sin metas heroicas.

## Organigrama macro (nivel C-suite + GMs)

```
                    ┌─────────────────────────────┐
                    │   Consejo de Administración │
                    │      G3 Holding S.A. de C.V.│
                    └──────────────┬──────────────┘
                                   │
                       ┌───────────▼───────────┐
                       │   CEO Group           │
                       │   (Director General)  │
                       └─────┬─────────────────┘
                             │
        ┌────────────────────┼────────────────────────────┐
        │                    │                            │
   ┌────▼──────┐    ┌────────▼────────┐         ┌─────────▼────────┐
   │ Funciones │    │ G3 Logistics    │         │ G3 Tech          │
   │ corporativas│   │ GM Logistics    │         │ GM Tech          │
   └────┬──────┘    └────────┬────────┘         └─────────┬────────┘
        │                    │                            │
   ┌────┴────┬───────┐  ┌────┼────┬────┬────┐    ┌────────┼────────┐
   │         │       │  │    │    │    │    │    │        │        │
  CFO     CHRO   Legal Op  Flota Com Dispatch Adm  Eng  Producto   CS
              Compliance                                            │
                                                                ┌───┴───┐
                                                              Diseño  Soporte
```

Fundación G3 reporta al CEO Group, con su propio Director Ejecutivo
y consejo asesor independiente para preservar autonomía social.

## Detalle por entidad

### G3 Holding (corporativo)

```
CEO Group
├── CFO Group ─────────── Contabilidad · Tesorería · FP&A · Tax
├── CHRO Group ────────── Reclutamiento · Comp & Ben · Cultura · Capacitación
├── General Counsel ───── Legal corporativo · Contratos · Litigios
├── Compliance Officer ── Ética · Anti-corrupción · Protección de datos
└── Strategy & M&A ────── Análisis estratégico · Alianzas
```

### G3 Logistics

```
GM Logistics
├── Director de Operaciones
│   ├── Gerente de Flota ──────────── Mantenimiento · Combustible · Llantas
│   ├── Gerente de Dispatch ───────── Equipo dispatch 24/7 (3 turnos)
│   ├── Coordinador de Operadores ─── Reclutamiento conductores · Capacitación
│   └── Coordinador de Patio ──────── CDMX · MTY · GDL (2-3 personas c/u)
├── Director Comercial
│   ├── Ejecutivos de cuenta ──────── Por sector (auto, alimentos, farma)
│   └── Cotizador (pricing) ───────── Cotizaciones spot + tarifarios
├── Gerente de Cuentas por Cobrar ── Cobranza · Facturación CFDI
└── Gerente de Seguridad y HSE ──── Capacitación · Investigación de incidentes
```

### G3 Tech

```
GM Tech
├── VP Engineering
│   ├── Backend Lead ── 4 ingenieros (microservicios)
│   ├── Mobile Lead ── 3 ingenieros (G3 Drive iOS+Android)
│   ├── Web Lead ───── 2 ingenieros (G3 Admin + website)
│   └── DevOps ─────── 1 SRE (GCP, CI/CD, observabilidad)
├── Product Manager (1) ──── Roadmap · Discovery · Métricas de uso
├── Diseño (1) ────────────── UX research · UI · Brand asset implementation
└── Customer Success Lead
    └── 2 CS specialists ── Onboarding · Soporte clientes SaaS
```

### Fundación G3

```
Director Ejecutivo Fundación
├── Coordinador de Programas ─── Capacitación, becas, salud del operador
└── Coordinador Administrativo ── Donativos, transparencia, alianzas
```

## Reportes funcionales vs jerárquicos

Algunas funciones tienen **reporte jerárquico** a su GM y **reporte
funcional (línea punteada)** a una función corporativa del holding.
Esto evita silos y mantiene estándares cruzados.

| Función operativa | Jerárquico | Funcional (corporativo) |
|---|---|---|
| Contabilidad en G3 Logistics | GM Logistics | CFO Group |
| RRHH en G3 Tech | GM Tech | CHRO Group |
| Compliance en cualquier entidad | GM respectivo | Compliance Officer |
| Comunicación / Marca | GM respectivo | (futuro Director de Marca) |

## Banding y nomenclatura de roles

Niveles desde más junior a más senior. Aplica a todo el grupo.

| Nivel | Rótulo | Quién | Decisión típica |
|---|---|---|---|
| L1 | Trainee / Junior | Recién egresados, primer año | Ejecuta tarea definida |
| L2 | Specialist | 1-3 años exp. | Resuelve casos típicos solo |
| L3 | Senior | 3-6 años exp. | Diseña soluciones, mentora L1-L2 |
| L4 | Lead | 5-10 años exp. | Define proceso del área, owns OKRs |
| L5 | Manager / Gerente | 8+ años exp. | Maneja equipo de 4-10 |
| L6 | Director | 12+ años exp. | Maneja un área completa (50+ pers) |
| L7 | VP / GM | 15+ años exp. | Maneja una entidad o función global |
| L8 | C-Suite | 18+ años exp. | Reporta al Consejo |

## Centros de costo

| Código | Entidad / Área |
|---|---|
| CC-100 | G3 Holding — Corporativo |
| CC-200 | G3 Logistics — Operaciones |
| CC-210 | G3 Logistics — Flota |
| CC-220 | G3 Logistics — Comercial |
| CC-230 | G3 Logistics — Cobranza |
| CC-300 | G3 Tech — Engineering |
| CC-310 | G3 Tech — Producto |
| CC-320 | G3 Tech — Customer Success |
| CC-400 | Fundación G3 |

Cada gasto se imputa a un centro de costo. El P&L se consolida
mensualmente a nivel holding.

## Headcount objetivo por trimestre (año 1)

| Q1 | Q2 | Q3 | Q4 | Detalle |
|---:|---:|---:|---:|---|
| 60 | 75 | 88 | 101 | Hire plan por área en el doc de Strategy |

Cualquier hire fuera del plan requiere business case + aprobación
del CEO Group.

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-18 | Documento inicial |
