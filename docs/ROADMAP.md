# Roadmap MVP — G3 Logistics

## Visión de fases

```
Fase 0  ─ Setup técnico + identidad           [Semana 1]
Fase 1  ─ Auth + Perfil                       [Semana 2]
Fase 2  ─ Viajes + Dashboard                  [Semanas 3-4]
Fase 3  ─ Bitácora + Evidencias               [Semanas 5-6]
Fase 4  ─ Incidencias + Offline robusto       [Semana 7]
Fase 5  ─ Hardening + Beta interna            [Semana 8]
─────────── MVP cerrado ──────────────────────
Fase 6  ─ Panel web admin (Next.js)           [Semanas 9-12]
Fase 7  ─ Push, métricas, mapas de ruta       [trimestre 2]
Fase 8  ─ Liquidación pagos, reportería       [trimestre 2-3]
```

---

## Fase 0 — Setup (Semana 1)

**Objetivo:** repo listo, Supabase en producción, app vacía corriendo en device.

- [x] Repo con monorepo `mobile/` + `supabase/` + `docs/`
- [ ] Proyecto Expo (TS) instalado
- [ ] Proyecto Supabase creado (dev + prod)
- [ ] Migración inicial aplicada
- [ ] CI: lint + typecheck en PR (GitHub Actions)
- [ ] Identidad visual aprobada (colores, logo, tipografía)
- [ ] EAS Build configurado para entregables internos

**Entregable:** APK/IPA con splash, login dummy, deploy a TestFlight / Internal Testing.

---

## Fase 1 — Auth + Perfil (Semana 2)

- [ ] OTP por SMS (Twilio vía Supabase) funcionando
- [ ] Email + password para admin
- [ ] Persistencia de sesión en SecureStore
- [ ] Pantalla de perfil (lectura)
- [ ] Edición de teléfono / email / foto
- [ ] Aviso de licencia próxima a vencer

**Entregable:** chofer entra y ve su perfil real.

---

## Fase 2 — Viajes + Dashboard (Semanas 3-4)

- [ ] Listado de viajes (activos / programados / historial)
- [ ] Detalle de viaje completo
- [ ] Cambio de estatus con validación de transición (RPC)
- [ ] Dashboard con viaje activo + accesos rápidos
- [ ] Seed de viajes de prueba en Supabase

**Entregable:** chofer ve sus viajes y avanza el estatus.

---

## Fase 3 — Bitácora + Evidencias (Semanas 5-6)

- [ ] Crear evento de bitácora con todos los campos
- [ ] Captura de GPS con fallback manual
- [ ] Cámara + galería
- [ ] Compresión de imagen a 1.5 MB
- [ ] Subida a Supabase Storage con URL firmada
- [ ] Timeline de bitácora
- [ ] Galería de evidencias por viaje

**Entregable:** un viaje completo puede documentarse de extremo a extremo.

---

## Fase 4 — Incidencias + Offline robusto (Semana 7)

- [ ] Pantalla de reporte de incidencia
- [ ] Niveles de urgencia con color
- [ ] Cola offline (SQLite) para bitácoras + incidencias + evidencias
- [ ] SyncService con reintentos exponenciales
- [ ] Banner de offline
- [ ] Pantalla "Pendientes de sincronizar"

**Entregable:** la app funciona sin red durante un viaje completo.

---

## Fase 5 — Hardening + Beta (Semana 8)

- [ ] Sentry integrado
- [ ] Validación de TODOS los formularios con Zod
- [ ] Mensajes de error claros y accionables
- [ ] Pruebas con 3-5 choferes reales en piloto
- [ ] Métricas básicas (login success rate, sync success rate)
- [ ] Documentación de usuario (PDF de 2 páginas)

**Entregable: MVP en producción** para una flotilla piloto.

---

## Post-MVP

### Fase 6 — Panel web admin
- Next.js + Supabase
- CRUD de viajes y choferes
- Tablero de unidades en tiempo real
- Validación de evidencias
- Reportes básicos

### Fase 7 — Tiempo real y mapas
- `react-native-maps` con ruta
- Tracking opcional con foreground service Android
- Notificaciones push (Expo Notifications)
- ETA dinámico

### Fase 8 — Operación financiera
- Liquidación de viaje (importe − gastos − comisión)
- Anticipos
- Integración SAT / facturación
- Reporte de rentabilidad y rendimientos

---

## Hitos medibles

| KPI                              | MVP target |
|----------------------------------|------------|
| Tiempo de login                  | < 15 s     |
| Tiempo para registrar bitácora   | < 30 s     |
| % bitácoras sincronizadas        | > 99 %     |
| Crash-free sessions              | > 99.5 %   |
| Choferes activos en piloto       | ≥ 5        |
