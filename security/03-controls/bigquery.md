# BigQuery — Controles de seguridad G3

**5 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **0**
- Importantes (ponderación 3): **5**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Importantes (ponderación 3)

#### `Google-BigQuery-01` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Data Analytics

**Qué exige**: Credenciales de inicio de sesión: la administración y operación de BigQuery está basado en la consola de IAM, por lo que deberá apegarse al menor privilegio el acceso otorgado al usuario

**Por qué importa**: A los usuarios, grupos o cuentas de servicio se les otorga acceso a roles predefinidos o personalizados para darles permisos a fin de que realicen acciones en los recursos.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/bigquery/docs/access-controlhles419permissions_and_predefined_roles

---

#### `Google-BigQuery-02` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Data Analytics

**Qué exige**: Gestión de acceso IAM con restricciones: Se deben definir políticas para acceso a recursos específicos, no se permiten permisos full.

**Por qué importa**: Puedes otorgar acceso en los siguientes niveles de recursos de BigQuery: - Nivel de organización o proyecto de Google Cloud - Nivel de conjunto de datos - Nivel de tabla o vista

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/bigquery/docs/access-controlhles419permissions_and_predefined_roles

---

#### `Google-BigQuery-03` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Data Analytics

**Qué exige**: La comunicación a otros servicios de GCP deberá ser por roles en service accounts

**Por qué importa**: Cuando una identidad un usuario o una cuenta de servicio llama a una API de Google Cloud, BigQuery requiere que la identidad tenga los permisos adecuados para usar el recurso. Puedes otorgar permisos si asignas roles a un usuario, a un grupo o a una cuenta de servicio.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/bigquery/docs/access-controlhles419permissions_and_predefined_roles

---

#### `Google-BigQuery-04` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Data Analytics

**Qué exige**: Los datos que se ingresan en BigQuery son cifrados de manera automática en reposo, tránsito y memoria.

**Por qué importa**: BigQuery encripta de forma automática todos los datos antes de que se escriban en el disco, cuando están en tránsito en red y cuando están en memoria para ser procesados. Los datos se desencriptan de manera automática cuando los lee un usuario autorizado.

**Cómo cumplirlo**: https://cloud.google.com/bigquery/docs/encryption-atrest hles_419::textBigQuery20automatically20encrypts20all20data,individual20values20within20a20table.

---

#### `Google-BigQuery-05` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Data Analytics

**Qué exige**: BigQuery conserva el contenido de una tabla llamada tabla base en un momento determinado.

**Por qué importa**: Se puede guardar una instantánea de una tabla actual o crear una instantánea de una tabla como estaba en un momento determinado durante los últimos siete días.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/bigquery/docs/table-snapshots-intro

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="bigquery.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-bigquery.json`](../data/controls-bigquery.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |