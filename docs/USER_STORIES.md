# User Stories — G3 Logistics Mobile

Notación: **Como** [rol] **quiero** [acción] **para** [valor].
Cada historia incluye criterios de aceptación (CA) verificables.

---

## Épica 1 — Autenticación

### US-01 · Iniciar sesión con teléfono
**Como** chofer **quiero** entrar con mi número de teléfono y un código SMS **para** acceder
rápido sin recordar contraseñas.
- CA1: Capturo mi teléfono, recibo OTP de 6 dígitos en ≤ 30 s.
- CA2: Si el código es válido, entro al Dashboard.
- CA3: Si el usuario no existe o está `suspended`, veo mensaje claro.
- CA4: La sesión persiste tras cerrar la app.

### US-02 · Iniciar sesión con correo (admin/dispatch)
**Como** despachador **quiero** entrar con email + contraseña **para** acceder al panel desde
varios dispositivos.

### US-03 · Recuperar contraseña
**Como** despachador **quiero** restablecer mi contraseña por correo.

### US-04 · Cerrar sesión
**Como** usuario **quiero** salir y borrar tokens locales.

---

## Épica 2 — Perfil

### US-05 · Ver mi perfil
**Como** chofer **quiero** ver mi licencia, unidad y vigencia **para** saber si tengo algo por
renovar.
- CA1: Si mi licencia vence en ≤ 30 días, veo un aviso.

### US-06 · Editar mi perfil
**Como** chofer **quiero** corregir mi teléfono, correo y foto **para** mantener mis datos al día.
- CA1: Campos críticos (licencia, placas) requieren autorización de admin (V2).

---

## Épica 3 — Viajes

### US-07 · Ver mis viajes asignados
**Como** chofer **quiero** ver la lista de mis viajes (próximos, en curso, finalizados).
- CA1: Por defecto se abren los **activos** (no finalizados, no cancelados).
- CA2: Pull-to-refresh actualiza.
- CA3: Funciona sin conexión con datos cacheados.

### US-08 · Ver detalle de viaje
**Como** chofer **quiero** ver cliente, origen, destino, toneladas, importe y mi comisión.
- CA1: Muestro un botón grande con el siguiente estatus posible.

### US-09 · Avanzar el estatus del viaje
**Como** chofer **quiero** marcar "Iniciar carga", "En tránsito", "Descargando", "Finalizar"
**para** que despacho sepa dónde voy.
- CA1: El cambio queda registrado con timestamp.
- CA2: Si no hay red, se encola y sincroniza después.
- CA3: No puedo saltar estatus (validación: scheduled → loading → in_transit → unloading → finished).

### US-10 · Cancelar viaje (admin)
**Como** despachador **quiero** cancelar un viaje no iniciado.

### US-11 · Crear viaje (admin)
**Como** despachador **quiero** crear y asignar un viaje a un chofer.
*(Panel web V2 — la API ya está lista.)*

---

## Épica 4 — Bitácora

### US-12 · Agregar evento de bitácora
**Como** chofer **quiero** registrar un evento (salida, caseta, diesel, parada…) con foto
opcional **para** documentar el viaje.
- CA1: Fecha/hora se prellenan con `now()`.
- CA2: Ubicación intenta GPS; si falla, permito ingresar texto.
- CA3: Si no hay red, guardo local y muestro badge "pendiente sync".
- CA4: Campos obligatorios: `event_type`. Resto opcional.

### US-13 · Ver bitácora del viaje
**Como** chofer **quiero** ver una línea de tiempo con todos los eventos del viaje.

### US-14 · No puedo borrar eventos
La bitácora es append-only para el chofer. Solo agrega un evento correctivo si se equivocó.

---

## Épica 5 — Evidencias

### US-15 · Subir foto de carta porte / báscula / carga / descarga
**Como** chofer **quiero** tomar foto desde la app y etiquetarla con el tipo.
- CA1: Permito tomar con cámara o elegir de galería.
- CA2: Comprimo a ≤ 1.5 MB antes de subir.
- CA3: Sin red → cola offline, badge en UI.

### US-16 · Ver evidencias de un viaje
**Como** chofer **o** admin **quiero** ver miniaturas y abrir cada evidencia.

---

## Épica 6 — Incidencias

### US-17 · Reportar incidencia
**Como** chofer **quiero** reportar una falla, accidente, retén o demora **para** alertar a
despacho.
- CA1: Selecciono tipo, urgencia, descripción.
- CA2: Foto opcional.
- CA3: Si la urgencia es `critical`, el sistema notifica al despachador (push) — V1.5.

### US-18 · Ver mis incidencias
Lista con filtros por viaje y estatus (resuelta / abierta).

---

## Épica 7 — Dashboard

### US-19 · Ver mi viaje activo de un vistazo
**Como** chofer **quiero** que al abrir la app vea inmediatamente:
viaje activo, próximo destino, estatus, última bitácora y dos botones grandes:
**+ Bitácora** y **⚠ Incidencia**.

### US-20 · Ver historial reciente
**Como** chofer **quiero** ver mis últimos 5 viajes finalizados.

---

## Épica 8 — Offline

### US-21 · Trabajar sin internet
**Como** chofer en carretera **quiero** registrar bitácoras, fotos e incidencias sin red **para**
no perder información.
- CA1: La app indica claramente el estado de conexión.
- CA2: Existe una pantalla "Pendientes de sincronizar" con conteo.

---

## Épica 9 — Panel Admin (post-MVP)

### US-22 · Despachador: ver todos los viajes en curso
### US-23 · Despachador: ubicación última conocida de cada unidad
### US-24 · Admin: validar evidencias y autorizar pago
### US-25 · Admin: reporte de rentabilidad por viaje (importe − casetas − diesel − comisión)
