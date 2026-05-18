# G3 · Brand System v2 — Enterprise

Sistema de identidad diseñado para que G3 compita visualmente contra
**Samsara, Motive, Uber Freight, Palantir, Anduril, NVIDIA, Stripe,
Volvo Trucks**. No es un rebrand de startup — es la identidad de una
holding tecnológica/logística pensada para escala global.

## Cómo navegar este directorio

```
v2-enterprise/
├── README.md                   ← este archivo
├── 00-strategy.md              ← cuál es la promesa visual del grupo
├── concepts/                   ← 5 conceptos distintos, mutuamente exclusivos
│   ├── 01-monolith/              brutalismo industrial (Palantir/Anduril)
│   ├── 02-vector/                ingeniería precisa (SpaceX/Rivian)
│   ├── 03-grid/                  data-first (NVIDIA/Datadog)
│   ├── 04-forge/                 heavy industry refinada (Caterpillar/Volvo)
│   └── 05-pulse/                 SaaS enterprise (Stripe/Samsara)
├── architecture/
│   └── sub-brands.md           ← cómo escalar a las 16 entidades
├── guidelines/
│   ├── usage.md                  do / don't
│   ├── typography.md             stack tipográfico completo
│   └── applications.md           sistema de aplicación cross-canal
└── selection-framework.md      ← preguntas para elegir cuál
```

## Filosofía detrás de los 5 conceptos

Cada concepto **resuelve la misma promesa de marca** (ver `00-strategy.md`),
pero la **ejecuta visualmente de manera distinta**. La diferencia no es
estética — es estratégica. La elección comunica al mercado de qué
ladio del espectro está G3:

```
           DEFENSA / INTEL ←————————————————→ SAAS / FINANCE
              ▲                                       ▲
        Monolith     Forge      Vector     Grid     Pulse
        (1)          (4)        (2)        (3)      (5)
              ▼                                       ▼
        OPERACIÓN PESADA ←———————————————→ PLATAFORMA DIGITAL
```

| Concepto | Sensación | Riesgo principal | Mejor para... |
|---|---|---|---|
| **Monolith** | Autoridad absoluta | Percibirse cerrado/elitista | Empresa con poder real, contratos institucionales |
| **Vector** | Precisión de ingeniería | Verse "tech bro" | Apuesta fuerte por IA y automatización |
| **Grid** | Data como producto | Saturarse de moda data-viz | Posicionar Analytics como negocio core |
| **Forge** | Confianza heredada | Verse demasiado "trucker" | Atraer clientes industriales tradicionales |
| **Pulse** | Infraestructura limpia | No diferenciarse de otro SaaS | Vender SaaS como producto dominante |

## Cómo se llega a la decisión

1. Lee `00-strategy.md` — define la promesa de marca a 5 años
2. Lee `selection-framework.md` — 6 preguntas que filtran
3. Revisa los 5 conceptos en `concepts/` (cada uno se autosostiene)
4. Decide cuál concepto resuena con el plan a 5 años
5. El concepto elegido se promueve a v3 oficial; los otros 4 quedan
   archivados como referencia histórica de exploración

## Lo que SÍ está aquí

- Sistema vectorial completo (SVG) por concepto: monograma, wordmark,
  paleta, app icon, tracto lateral, dashboard tile, business card
- Tipografía recomendada por concepto + alternativas open-source
- Arquitectura para las 16 submarcas (cómo modular sin romper el sistema)
- Guidelines de uso, prohibiciones, escalado tipográfico

## Lo que NO está aquí

- Renders fotorrealistas 3D de tractos con iluminación cinematográfica
  (requiere Blender/KeyShot + texturizado fuera de este entorno)
- Mockups en fotografías reales de unidades / fachadas
- Pruebas de impresión sobre materiales

Esos se producen después de elegido el concepto, con base en los SVG
de aquí y la guideline de aplicación.

## Estado

| Item | Estado |
|---|---|
| 5 conceptos completos | ✓ |
| Arquitectura de submarcas | ✓ |
| Framework de selección | ✓ |
| Guidelines de uso | ✓ |
| Decisión del concepto ganador | Pendiente del fundador |
| Renders 3D del concepto ganador | Pendiente con estudio externo |
| Registro IMPI del logo elegido | Pendiente |
