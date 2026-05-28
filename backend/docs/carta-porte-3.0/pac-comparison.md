# Comparativa de PACs SAT certificados

> Para seleccionar el PAC (Proveedor Autorizado de Certificación)
> que timbrara nuestros CFDIs con complemento Carta Porte 3.0.

## Criterios de evaluación

| Criterio | Peso | Por qué importa |
|---|---|---|
| **Precio por timbre** | 25% | Volumen alto = sensibilidad a costo |
| **Carta Porte 3.0 nativo** | 25% | Algunos PACs aún no actualizan a 3.0 |
| **API REST moderna** | 15% | Velocidad de integración + mantenimiento |
| **Sandbox disponible** | 10% | Crítico para desarrollo y QA |
| **Soporte técnico** | 10% | SLA y horario de respuesta |
| **Uptime SLA** | 10% | Riesgo de caer en cierre fiscal |
| **Capacidad de volumen** | 5% | Soportar peaks de 100+ timbres/seg |

## PACs evaluados (orden alfabético)

> Las cifras son estimadas con información pública. Negociar
> precio depende de volumen comprometido.

### 1. Diverza

| Atributo | Valor |
|---|---|
| Precio timbre | $4-6 MXN (volumen alto) |
| Carta Porte 3.0 | ✓ Soporte nativo desde 2024 |
| API REST | ✓ Documentada, OpenAPI spec |
| Sandbox | ✓ Disponible inmediato |
| Soporte | 8x5 chat + tickets · 24x7 enterprise |
| SLA | 99.5% uptime |
| Capacidad | Alta (clientes enterprise) |
| Ventaja | Comparativamente económico + buen API |
| Desventaja | Soporte premium tiene costo extra |

### 2. Facturama

| Atributo | Valor |
|---|---|
| Precio timbre | $5-7 MXN |
| Carta Porte 3.0 | ✓ Nativo |
| API REST | ✓ Muy buena documentación |
| Sandbox | ✓ Gratis sin compromiso |
| Soporte | 8x5 · documentación extensa |
| SLA | 99% |
| Capacidad | Media-alta |
| Ventaja | Documentación developer-friendly · marca conocida |
| Desventaja | Más caro · enfoque más PYME |

### 3. Solución Factible (SF)

| Atributo | Valor |
|---|---|
| Precio timbre | $5-8 MXN |
| Carta Porte 3.0 | ✓ |
| API REST | ✓ pero menos modern |
| Sandbox | ✓ |
| Soporte | 8x5 |
| SLA | 99% |
| Capacidad | Alta |
| Ventaja | Histórico largo · estable |
| Desventaja | UI/UX legacy |

### 4. SW SmarterWeb

| Atributo | Valor |
|---|---|
| Precio timbre | $3-5 MXN (muy competitivo) |
| Carta Porte 3.0 | ✓ |
| API REST | ✓ |
| Sandbox | ✓ |
| Soporte | 8x5 |
| SLA | 99% |
| Capacidad | Media |
| Ventaja | Precio agresivo |
| Desventaja | Menos enterprise · capacidad limitada |

### 5. Edicom

| Atributo | Valor |
|---|---|
| Precio timbre | $8-12 MXN |
| Carta Porte 3.0 | ✓ |
| API REST | ✓ Enterprise-grade |
| Sandbox | ✓ |
| Soporte | 24x7 incluido |
| SLA | 99.9% |
| Capacidad | Muy alta (global) |
| Ventaja | Para corporativos grandes · presencia LATAM |
| Desventaja | Más caro · sales cycle enterprise lento |

### 6. KARDEX (Pegaso Tecnología)

| Atributo | Valor |
|---|---|
| Precio timbre | $5-7 MXN |
| Carta Porte 3.0 | ✓ |
| API REST | ✓ pero limitada |
| Sandbox | ✓ |
| Soporte | 8x5 |
| SLA | 99% |
| Capacidad | Media |
| Ventaja | Conocido en sector transporte |
| Desventaja | Tech stack viejo |

### 7. PROSESA

| Atributo | Valor |
|---|---|
| Precio timbre | $4-6 MXN |
| Carta Porte 3.0 | ✓ |
| API REST | Parcial (SOAP también) |
| Sandbox | Limitado |
| Soporte | 8x5 |
| SLA | 99% |
| Capacidad | Media |
| Ventaja | Cuenta con cuentas grandes |
| Desventaja | Tech menos modern |

### 8. Buzón E

| Atributo | Valor |
|---|---|
| Precio timbre | $5-8 MXN |
| Carta Porte 3.0 | ✓ |
| API REST | ✓ |
| Sandbox | ✓ |
| Soporte | 8x5 |
| SLA | 99% |
| Capacidad | Alta |
| Ventaja | Adicional servicios de cobranza |
| Desventaja | Pricing menos transparente |

## Matriz de decisión

| PAC | Precio | CP 3.0 | API | Sandbox | Soporte | SLA | Capacidad | TOTAL |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Diverza** | 5 | 5 | 5 | 5 | 4 | 4 | 5 | **4.7** |
| **Facturama** | 4 | 5 | 5 | 5 | 4 | 3 | 4 | **4.3** |
| **SW SmarterWeb** | 5 | 5 | 4 | 5 | 3 | 3 | 3 | **4.1** |
| **Edicom** | 2 | 5 | 5 | 5 | 5 | 5 | 5 | **4.0** |
| **Solución Factible** | 4 | 5 | 4 | 5 | 4 | 3 | 4 | **3.9** |
| **KARDEX** | 4 | 5 | 3 | 5 | 4 | 3 | 3 | **3.6** |
| **PROSESA** | 5 | 5 | 3 | 3 | 4 | 3 | 3 | **3.6** |
| **Buzón E** | 4 | 5 | 4 | 5 | 4 | 3 | 4 | **3.9** |

## Recomendación

### Estrategia: 2 PACs en paralelo

**Primary: Diverza** — score más alto, balance ideal precio/calidad/capacidad

**Backup: Facturama** — buena documentación, marca conocida,
nos sirve para failover automático si Diverza tiene problemas

### Por qué multi-PAC desde día 1

1. **Resiliencia**: si Diverza cae en cierre de mes, fluctuamos a
   Facturama automáticamente. SAT no acepta excusas — el CFDI
   se vence
2. **Negociación**: mejor precio cuando el PAC sabe que tienes
   alternativa lista
3. **A/B testing real**: medimos cuál PAC tiene mejor tasa de
   aceptación SAT en condiciones reales
4. **Compliance**: ningún punto único de falla en proceso fiscal

### Costo de tener 2 PACs

- Setup técnico extra: ~2 semanas dev (interface abstraction
  + adapters)
- Mantenimiento: bajo (la interfaz `PacProvider` es estable)
- Comercial: dos contratos, dos puntos de contacto
- **Beneficio neto**: enorme reducción de riesgo

## Plan de selección (semana 1-2 del plan operativo)

### Semana 1

- Día 1-2: outreach a Diverza, Facturama, Edicom solicitando
  cotización para 50,000 timbres/mes + sandbox access
- Día 3-5: llamadas técnicas con cada PAC (validar API,
  sandbox, capacidades carta porte 3.0)

### Semana 2

- Día 6-7: prueba real de generación + timbrado en sandbox
  con cada PAC seleccionado finalista
- Día 8-9: negociación de pricing en volumen y SLA
- Día 10: decisión final y firma de contrato con primary +
  backup

## Términos contractuales a negociar

- **Precio escalonado por volumen**: 50K, 100K, 200K, 500K
  timbres/mes
- **Trial sin compromiso**: 1,000 timbres gratis primeros 30 días
- **SLA contractual**: 99.5% uptime con penalización por
  incumplimiento (créditos a favor)
- **Soporte ≥ 8x5 con tiempo de respuesta ≤ 4 horas**
- **API rate limit ≥ 100 req/seg** o auto-scale
- **Capacidad de cancelar contrato con 60 días de aviso**
  (sin penalización si SLA incumplido por PAC)
- **Sin lock-in contractual ≥ 12 meses**

## Riesgos específicos por PAC

| Riesgo | Cómo nos protegemos |
|---|---|
| PAC pierde certificación SAT | Backup PAC ready · monitoreo del DOF |
| PAC sube precios unilateralmente | Contrato con escalada limitada (CPI + 3%) |
| PAC retiene XMLs como "feature" | Cláusula de portabilidad total + backup en Cloud Storage propio |
| PAC tiene downtime crítico | Failover automático a backup en < 30 segundos |
| Cambio de regulación SAT | PAC debe actualizar en ≤ 30 días naturales |

---

## Versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-28 | Comparativa inicial · 8 PACs evaluados |
