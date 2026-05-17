# Pantallas y flujo de navegación

## Mapa de navegación

```
RootNavigator (stack)
├── AuthStack
│   ├── SplashScreen
│   ├── PhoneLoginScreen   ← entrada por defecto para chofer
│   ├── OtpVerifyScreen
│   ├── EmailLoginScreen   ← entrada para admin/dispatch
│   └── ForgotPasswordScreen
│
└── AppStack (sólo autenticado)
    ├── MainTabs (bottom tabs)
    │   ├── DashboardScreen           [tab Inicio]
    │   ├── TripsScreen               [tab Viajes]
    │   ├── HistoryScreen             [tab Historial]
    │   └── ProfileScreen             [tab Perfil]
    │
    ├── TripDetailScreen
    ├── LogbookListScreen
    ├── LogbookCreateScreen
    ├── EvidenceUploadScreen
    ├── EvidenceViewerScreen
    ├── IncidentListScreen
    ├── IncidentCreateScreen
    ├── PendingSyncScreen
    └── SettingsScreen
```

## Pantallas en detalle

### 1. SplashScreen
- Logo G3 centrado.
- Decide ruta: si hay sesión válida → `MainTabs`, si no → `PhoneLoginScreen`.

### 2. PhoneLoginScreen
- Bandera + input teléfono (México por defecto).
- Botón grande: **Recibir código**.
- Link "Entrar con correo".

### 3. OtpVerifyScreen
- 6 cajas para código.
- Reenviar en 30 s.
- Auto-submit al completar.

### 4. EmailLoginScreen
- Email, password, "Entrar", "Olvidé mi contraseña".

### 5. DashboardScreen
```
┌─────────────────────────────────┐
│  Hola, Juan 👋                  │
│  G3-2026-00123 · EN TRÁNSITO    │
├─────────────────────────────────┤
│  📍 Próximo destino:            │
│     Bodega Pemex, Tampico       │
│                                 │
│  ETA descarga: hoy 18:00        │
│  Última bitácora: caseta 14:32  │
├─────────────────────────────────┤
│  [  + BITÁCORA  ]  [ ⚠ INCID. ] │
├─────────────────────────────────┤
│  Cambiar estatus →              │
│  [ MARCAR EN TRÁNSITO ]         │
├─────────────────────────────────┤
│  Últimos viajes                 │
│  • G3-2026-00120  Finalizado    │
│  • G3-2026-00118  Finalizado    │
└─────────────────────────────────┘
```

### 6. TripsScreen
- Pestañas: **Activos** / **Programados** / **Cancelados**.
- Tarjeta por viaje: cliente, folio, origen → destino, fecha, estatus (chip de color).

### 7. TripDetailScreen
- Header: folio + estatus actual.
- Secciones colapsables: Cliente, Carga, Ruta, Importes, Bitácora (resumen), Evidencias.
- CTA principal: avanzar estatus.
- CTAs secundarios: + Bitácora, + Evidencia, ⚠ Incidencia.

### 8. LogbookCreateScreen
- Selector tipo de evento (grid de íconos grandes).
- Fecha/hora (pre-llena, editable).
- Ubicación (GPS + texto).
- Kilometraje, combustible, gasto, comentarios.
- Botón "Agregar foto".
- Botón gigante: **Guardar**.

### 9. LogbookListScreen
- Timeline vertical con íconos por tipo.

### 10. EvidenceUploadScreen
- Selector tipo evidencia (chips).
- Cámara / galería.
- Preview con borrar y subir.

### 11. IncidentCreateScreen
- Tipo (grid).
- Urgencia (slider color: verde→rojo).
- Descripción.
- Ubicación + foto opcional.
- **Reportar** (rojo).

### 12. ProfileScreen
- Avatar, nombre, teléfono, correo.
- Sección "Documentos": licencia + vigencia (con badge si próxima a vencer).
- Sección "Unidad": número, tipo, placas tracto/remolque.
- Botón "Cerrar sesión".

### 13. PendingSyncScreen
- Lista de elementos pendientes (bitácoras, fotos, incidencias).
- Botón "Reintentar todo".

## Identidad visual (resumen)

| Token              | Valor       | Uso                                |
|--------------------|-------------|------------------------------------|
| `colors.bg`        | `#0B0B0B`   | fondo modo oscuro                  |
| `colors.surface`   | `#1F2937`   | tarjetas                           |
| `colors.primary`   | `#0E3A4C`   | acciones primarias                 |
| `colors.accent`    | `#9B2C2C`   | acción crítica (incidencia)        |
| `colors.text`      | `#F5F5F4`   | texto principal sobre oscuro       |
| `colors.muted`     | `#9CA3AF`   | textos secundarios                 |
| `colors.success`   | `#16A34A`   |                                    |
| `colors.warning`   | `#D97706`   |                                    |
| `spacing.base`     | 4 dp        | rejilla                            |
| `radius.md`        | 12          | tarjetas y botones                 |
| `button.height`    | 56          | mínimo táctil para chofer          |

## Componentes principales

- `<Screen>` – wrapper con safe area, fondo y padding consistentes.
- `<Button variant="primary|secondary|danger|ghost" size="lg|md">`
- `<TextField label icon error>`
- `<StatusChip status={trip.status}>` – color según enum.
- `<TripCard trip>` – usado en listas.
- `<LogbookTimeline entries>` – timeline vertical.
- `<EvidenceThumb evidence>` – miniatura clickable.
- `<EventTypePicker>` – grid de íconos.
- `<OfflineBanner>` – aparece cuando no hay red.
- `<SyncBadge count>` – muestra pendientes.
