# Cloud SQL — Controles de seguridad G3

**12 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **1**
- Importantes (ponderación 3): **11**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Críticos (ponderación 5)

#### `Google-Cloud SQL-12` — Ponderación 5 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Habilitar la encriptación de datos con Customer-Managed Keys, Solo si aplica alguna regulacion en su UN

**Por qué importa**: Proteger la confidencialidad de los datos para seguridad e integridad de los mismos, además de crear y administrar tus claves a través de Cloud Key Management Service. Las claves de encriptación administradas por el cliente se pueden almacenar las llaves con las que se cifran los datos en reposo y tránsito desde la base de datos.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sql/docs/mysql/configure-cmek

---

### Importantes (ponderación 3)

#### `Google-Cloud SQL-01` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Cumplir con el checklist CIS Assessor de base de datos de CSA

**Por qué importa**: El estándar de CIS nos ayuda a realizar un hardening de seguridad con respecto a las configuraciones que se tienen en la base de datos.

**Cómo cumplirlo**: Favor de contactar al evaluador para los porcentajes solicitados.

---

#### `Google-Cloud SQL-02` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: VoBo del área de Arquitectura de las versiones de RDS que se ocuparán

**Por qué importa**: Ejecuta las mismas bases de datos relacionales que conoces con sus colecciones de extensiones enriquecidas, marcas de configuración y ecosistema de desarrollador, pero sin las dificultades de la autoadministración.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sql

---

#### `Google-Cloud SQL-03` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Los accesos o interacción con otros servicios dentro de la nube deberá ser por ROLESIAM, deberán estar acotados al menor privilegio, todo esto si es que la cuenta de servicio se comunica con otros servicios

**Por qué importa**: En asegurar la integridad de los datos al prevenir acciones no permitidas para todos los usuarios

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sql/docs/mysql/iam-rolesroles https://cloud.google.com/sql/docs/postgres/iam-rolesroles https://cloud.google.com/sql/docs/sqlserver/iam-rolesroles

---

#### `Google-Cloud SQL-04` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Restringir el uso de componentes que puedan acceder y conectarse a Cloud SQL mediante grupos de Seguridad.

**Por qué importa**: No permite el acceso o conexión a Cloud SQL si no se tiene autorización mediante los grupos de seguridad.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/identity/docs/groupshles-419

---

#### `Google-Cloud SQL-05` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Plan de actualizaciónupgrade o migración, según sea el caso de la versión.

**Por qué importa**: Database Migration Service DMS facilita la migración de tus bases de datos de producción a Cloud SQL con un tiempo de inactividad mínimo

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://Drive.google.com/drive/u/0/utm_sourceenpli1

---

#### `Google-Cloud SQL-06` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Cualquier cambio a los grupos de parámetros se deben de notificar al equipo de CSA de la unidad de negocio

**Por qué importa**: Tener un control de los cambios que se realizan en la plataforma

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud

---

#### `Google-Cloud SQL-07` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Especificaciones para el usuario y contraseña de la BD

**Por qué importa**: Seguridad en los usuarios administradores, para evitar el uso indebido de permisos

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud Así mismo, este deberá estar almacenado en una bóveda de secretos, ya sea de GCP o externa

---

#### `Google-Cloud SQL-08` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Se cuenta con HA para que los datos siguen estando disponibles para aplicaciones cliente a pesar de interrupciones zonales.

**Por qué importa**: Reduce el tiempo de inactividad cuando una zona o una instancia deja de estar disponible. Esto puede ocurrir durante una interrupción zonal o cuando una instancia se daña

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sql/docs/mysql/high-availabilityHA-configuration

---

#### `Google-Cloud SQL-09` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Acceso Público: NO. Por defecto las instancias de Cloud SQL no tienen configurada una IP publica para ser consumidas por aplicaciones de internet

**Por qué importa**: En evita el acceso a cualquier persona no autenticada en GCP. En caso de requerir exponer una IP publica, esta deberá configurarse en un rango de IPs autorizadas para acceder

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sql/docs/mysql/configure-iphles-419

---

#### `Google-Cloud SQL-10` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Plan de BackupRetención diaria, los backups deberán están encriptados

**Por qué importa**: Ayudan a restablecer los datos perdidos en la instancia de Cloud SQL. Además, si una instancia tiene un problema, puedes restablecerla a un estado anterior mediante la copia de seguridad para reemplazarla.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sql/docs/mysql/backup-recovery/backups https://cloud.google.com/sql/faqencryption

---

#### `Google-Cloud SQL-11` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Database

**Qué exige**: Se debe de habilitar el monitoreo para mayor granularidad sobre los siguientes puntos: Audit Logs Error Logs General Logs Slow Query Logs

**Por qué importa**: En responder las preguntas Quién hizo qué, dónde y cuándo. Dentro de tus recursos de Google Cloud.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sql/docs/audit-logginghles-419 https://cloud.google.com/logging/docs/audithles-419

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="cloudsql.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-cloud-sql.json`](../data/controls-cloud-sql.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |