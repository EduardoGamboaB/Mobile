# Secret Manager — Controles de seguridad G3

**6 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **0**
- Importantes (ponderación 3): **6**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Importantes (ponderación 3)

#### `Google-Secrets Manager-01` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Usar la Información que proporcionan los registros de auditoríaCloud Audit para Secret Manager .

**Por qué importa**: Mantener la fiabilidad, la disponibilidad , monitoreo y la confidencialidad de los Secretos. Garantiza que todas las llamadas a la API de Secret Manager realizadas en las claves de su cuenta de GCP se registren automáticamente en archivos de logs de auditoría. Los tipos de registros de auditoría están disponibles para Secret Manager: Registros de auditoría de actividad del administrador, Registros

**Cómo cumplirlo**: https://cloud.google.com/secret-manager/docs/audit-logginghles-419

---

#### `Google-Secrets Manager-02` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Configurar notificaciones para un Secret en Pub/Sub para informar sobre cambios en los secretos administrados por Secret Manager.

**Por qué importa**: Las notificaciones ayudan a realizar un seguimiento de los cambios en los metadatos secretos, como la descripción secreta y la configuración de rotación. También a activar flujos de trabajo como el reinicio de una aplicación cuando se agrega una nueva versión de un secreto o la notificación a ingenieros de seguridad cuando se borra un secreto

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/secret-manager/docs/event-notificationshles-419

---

#### `Google-Secrets Manager-03` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Se deberán asignar permisos en IAM sobre las cuentas que utilizarán Secret Manager. Siempre otorgando roles solo con los permisos necesarios. Otorgar funciones más amplias, como roles básicos, infringe el principio de privilegio mínimo .

**Por qué importa**: Mantener la fiabilidad y permite acceso a usuarios y las cuentas de servicio, usando los principios de mínimo privilegio, realicen acciones específicas de acceso a la API de Secret Manager. IAM no otorga permisos a los usuarios directamente, sino a funciones que incluyen uno o más permisos. Con el principio de privilegio mínimo, se otorga el nivel mínimo de acceso a los recursos necesarios para re

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/secret-manager/docs/authenticationhles-419 https://cloud.google.com/secret-manager/docs/access-controlhles-419

---

#### `Google-Secrets Manager-04` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Crea programas de rotación en Secret Manager para robustecer la seguridad para los aplicativos y contraseñas que se almacenan en Secret Manager .

**Por qué importa**: Ayuda a limitar la duración de un secreto filtrado que permanece válido y que podría exponer una vulnerabilidad. Además permite la fiabilidad del proceso .

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/secret-manager/docs/rotation-recommendationshles-419 https://cloud.google.com/secret-manager/docs/creating-and-managing-expiring-secretshles-419

---

#### `Google-Secrets Manager-05` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Habilita las claves de encriptación administradas por el cliente CMEK para Secret Manager .

**Por qué importa**: Permite mantener la confidencialidad y la integridad de los datos en reposo, además de un mayor control de los Secrets, la compatibilidad con CMEK para Secret Manager te permite configurar la clave de Cloud KMS que protege los datos en reposo en Secret Manager .

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/secret-manager/docs/cmekhles-419

---

#### `Google-Secrets Manager-06` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Analizar Secretos almacenados usando las herramientas de auditoria de Cloud Asset Inventory .

**Por qué importa**: Analizar Secretos almacenados usando las herramientas de auditoria de Cloud Asset Inventory .

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/secret-manager/docs/analyze-resourceshles-419

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="secretmanager.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-secret-manager.json`](../data/controls-secret-manager.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |