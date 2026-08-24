# G3 · Reporte de pruebas E2E y usabilidad

| Campo | Detalle |
|---|---|
| Fecha | Agosto 2026 |
| Alcance | Suite completa: backend (8 servicios + gateway + contracts), G3 Drive, G3 Admin, sitio corporativo |
| Métodos | Jest (unit + e2e) · Puppeteer sobre superficies reales (Drive exportado a web en modo demo, Admin en Next dev, sitio estático) |

---

## 1. Resultados de pruebas automatizadas

| Suite | Resultado | Detalle |
|---|---|---|
| Backend (10 workspaces) | **138/138 ✓** | contracts 20 · gateway 31 · auth 7 · billing 4 · fleet 18 · drivers 10 · trips 12 · alerts 6 · ai 7 · invoicing 23 |
| G3 Drive (mobile) | **57/57 ✓** | 13 suites (unit + e2e) · typecheck limpio |
| G3 Admin | **23/23 ✓** | 5 suites (unit + e2e) · typecheck limpio |
| **Total** | **218/218 ✓** | |

### E2E nuevos agregados en esta ronda

**`mobile/__tests__/e2e/preclose-expense-flow.test.ts` (8 tests)** — cubre las features de precierre y gastos de punta a punta:
- Vocabulario Drive/Supabase: `unloading → pre_closed` estampa `pre_closed_at`, el viaje sigue activo durante el retorno en vacío, transición inválida rechaza, `pre_closed → finished` cierra en matriz conservando el precierre en el historial.
- Gastos: la IA extrae el monto del ticket de diesel; la política gatea correctamente (con ticket siempre pasa · `require_receipt` bloquea todo manual · `allow_manual=false` bloquea · el tope corta exactamente en el límite); la bitácora registra `expense_has_receipt`.
- Vocabulario backend: `delivered` (precierre) permite liberar pago sin esperar el retorno; `closed` estampa `closedAt`.

**`admin/__tests__/e2e/expense-policy-flow.test.ts` (5 tests)** — la regla de gastos desde Ajustes: default con tope $300, persistencia tras `hydrate()` (subir tope, exigir ticket, prohibir manuales), y política corrupta en localStorage cae al default sin romper.

---

## 2. Pruebas de usabilidad (Puppeteer sobre superficies reales)

Heurísticas medidas por pantalla: overflow horizontal · tap targets < 40px · inputs sin etiqueta · texto < 11px · indicador de foco al tabular · errores JS.

### 2.1 G3 Drive (export web Expo, modo demo, 375×812)

**15 pantallas navegadas por flujo real de clicks** (onboarding → login → dashboard → viajes → detalle → bitácora → evidencia → incidencia → historial → perfil → ingresos → inspección → chat → mapa → SOS):

- **15/15 pantallas navegables** sin errores JS.
- **0 overflow · 0 tap targets chicos · 0 inputs sin etiqueta** en 13 pantallas.
- Flujo de gastos verificado en UI real: aparece el aviso de política *"Gastos sin ticket hasta $300.00 — arriba de eso, foto obligatoria"* y el botón *"Foto del ticket (IA)"*.

**Hallazgos y estado:**

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| D-1 | `Alert.alert` no tiene efecto en target web (confirmaciones de avance de viaje y avisos de política no aparecen en browser). En APK/iOS nativo funciona normal. | Media (solo si se distribuye como PWA) | **Documentado** — si el target web se vuelve oficial, sustituir por diálogo propio multiplataforma |
| D-2 | Pantalla de mapa desbordaba 9px (SVG vs. viewport con scrollbar) | Baja | **Corregido** — wrapper con `maxWidth:100% + overflow:hidden` · re-auditado ✓ |
| D-3 | 15 textos de 10px en inspección pre-viaje (pills "Foto requerida") | Baja | **Corregido** — mínimo 11px · re-auditado ✓ |

### 2.2 G3 Admin (Next dev, 6 páginas × 3 viewports)

Antes del fix, el panel era estrictamente desktop: overflow horizontal en **tablet 1024** (dashboard/trips/drivers hasta 1225px) y en móvil 390 en todas las páginas; login sin indicador de foco.

**Fixes aplicados** (`admin/app/globals.css`):
- Grids utilitarios colapsan responsivamente (2 col ≤1100px, 1 col ≤760px, venciendo estilos inline).
- Tablas con scroll horizontal propio ≤1100px (dejan de empujar el layout).
- En móvil la sidebar se convierte en barra superior scrolleable.
- Indicador de foco visible global (`:focus-visible`, vence los `outline:0` de inputs estilizados).

**Después:**

| Viewport | Resultado |
|---|---|
| Desktop 1366 | ✓ limpio en las 6 páginas |
| **Tablet 1024** (target real del panel) | ✓ limpio en las 6 páginas |
| Móvil 390 | Mejorado (811px → 487px de contenido); residual documentado como A-1 |
| Foco teclado | ✓ visible en todas las páginas (antes: login 4/6 tabs sin indicador) |

**Hallazgos abiertos (backlog):**

| # | Hallazgo | Severidad | Recomendación |
|---|---|---|---|
| A-1 | Overflow residual en móvil 390 (~487px de contenido mínimo) | Baja — el panel es tablet/desktop-first; móvil usa scroll | Rediseño responsive de topbar/KPIs si móvil se vuelve target |
| A-2 | 3 tap targets de 32px en topbar (iconos) y 11 en monitor (pills de unidades) | Baja | Subir a 40px mínimo en un pase de accesibilidad |

### 2.3 Sitio corporativo (4 páginas × 2 viewports)

**8/8 auditorías limpias**: 0 overflow, 0 tap targets chicos, 0 inputs sin etiqueta, foco visible, 0 errores JS. (Consistente con el QA mobile-first previo de `website/QA-REPORT.md`.)

---

## 3. Cómo reproducir

```bash
# Suites
cd backend && npm install --ignore-scripts && npm test
cd mobile  && npm install --ignore-scripts && npx jest && npx tsc --noEmit
cd admin   && npm install --ignore-scripts && npx jest && npx tsc --noEmit

# Usabilidad Drive (web demo)
cd mobile && EXPO_PUBLIC_DEMO=1 npx expo export --platform web --output-dir dist-web
cd dist-web && python3 -m http.server 8090   # + scripts Puppeteer del scratchpad de QA

# Usabilidad Admin
cd admin && npm run dev                      # :3001 + auditor Puppeteer
```

---

*Los scripts de auditoría (usability-audit.js, drive-usability.js) y los reportes JSON/screenshots viven en el scratchpad de QA de la sesión; los umbrales usados: tap ≥40px, texto ≥11px, foco visible, overflow 0.*
