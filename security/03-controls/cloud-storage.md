# Cloud Storage — Controles de seguridad G3

**9 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **0**
- Importantes (ponderación 3): **9**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Importantes (ponderación 3)

#### `Google-Cloud Storage-01` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: Bloque de Acceso al Público: Asegúrese de que sus aplicaciones funcionen correctamente sin acceso público. Si necesita algún nivel de acceso público a sus depósitos u objetos dentro puede personalizar la configuración individual a continuación para adaptarse a sus casos de uso de almacenamiento específicos.

**Por qué importa**: Tener un mejor control de acceso a los repositorios de almacenamiento.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/access-control

---

#### `Google-Cloud Storage-02` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: Versionamiento del Bucket: El control de versiones es una forma de mantener múltiples variantes de un objeto en el mismo depósito. Puede utilizar el control de versiones para conservar, recuperar y restaurar todas las versiones de todos los objetos almacenados en su bucket

**Por qué importa**: Tener un manejo adecuado de los objetos almacenados y así no perder los objetos de versiones anteriores que lleguen a ser requeridas en el futuro. Ayuda una búsqueda más rápida y a restaurar datos por errores accidentales.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/gsutil/addlhelp/ObjectVersioningandConcurrencyControlhles419overview

---

#### `Google-Cloud Storage-03` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: Descripción del Control: Tags: El bucket deberá encontrarse taggeado, de esta manera la evaluación del proyecto estará controlado y referida al ecosistema, debe contar al menos con los siguientes Keys: Área: Indicaran el área responsable del servicio. Ecosistema: El nombre del ecosistema registrado en el inventario electrónico.

**Por qué importa**: Ayuda a analizar de forma sencilla el costo de uso de diferentes servicios y tener inventariado a los servicios para futuros análisis y administración de ellos.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/bucket-metadatahles-419labels

---

#### `Google-Cloud Storage-04` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: Cifrado: El bucket deberá encontrarse cifrado

**Por qué importa**: Saber el tipo de cifrado y el nivel del mismo, el nivel de cifrado como mínimo deberá cumplir AES 256 y SHA 256, Brinda una seguridad adicional sobre los datos en reposo.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/encryption

---

#### `Google-Cloud Storage-05` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: Logs de acceso a buckets: El bucket deberá tener habilitado el Server Access Logging.

**Por qué importa**: Deberán existir logs del consumo de los servicios de Cloud Storage mediante los métodos HTTPS, así mismo, la dirección IP de quien está consumiendo los servicios y especificar el recurso que se consumió

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/audit-logginghles-419

---

#### `Google-Cloud Storage-06` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: AuditLog: mediante los registros LogEntry y los registros de auditoría AuditLog se podrán obtener los datos de acceso necesarios para Cloud Storage. Con la información que se pueda obtener mediante estos registros, podremos ver el nombre, email e IP desde donde se realizan los cambios.

**Por qué importa**: Permite utilizar los logs para analisis de seguridad dar seguimiento a los cambios que ocurren en los recursos, auditorias y localizacion de fallas.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/hosting-static-websitelb-backend

---

#### `Google-Cloud Storage-07` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: Web Host Cloud Storage: En caso de que el bucket se ocupe para Host de una página estática, es necesario que esté vinculada por CDN GCP Expone el contenido mediante un balanceador.

**Por qué importa**: Permite tener una respuesta acelerada y más rápida de los sitios.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/hosting-static-websitelb-backend

---

#### `Google-Cloud Storage-08` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: Lista de Control de Acceso ACL: No asignar el bucket al grupo: allUsers allAuthenticatedUsers

**Por qué importa**: Brinda un mejor control de acceso a los buckets y objetos de los mismos, ofreciendo de esta manera mayor seguridad.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/access-controlhles-419using_permissions_with_acls

---

#### `Google-Cloud Storage-09` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Storage

**Qué exige**: CORS: En caso de que el bucket se ocupe para Host de una página estática, es necesario que esté vinculada por CDN de la siguiente manera, en donde únicamente se permita el origen del dominio donde se va a consumir los recursos del bucket.

**Por qué importa**: Brinda un mejor control de acceso a los buckets y objetos de los mismos, ofreciendo de esta manera mayor seguridad.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/cross-originhles_419

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="cloudstorage.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-cloud-storage.json`](../data/controls-cloud-storage.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |