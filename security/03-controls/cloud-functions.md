# Cloud Functions — Controles de seguridad G3

**8 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **0**
- Importantes (ponderación 3): **8**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Importantes (ponderación 3)

#### `Google-Cloud Functions-01` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Mediante el acceso a VPC sin servidores, se puede conectar Cloud functions directo a otros servicios de la red de VPC de manera privada

**Por qué importa**: Evitar exposición de servicios internos y asegurar el monitoreo del flujo de datos mediante la red interna de la VPC

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/functions/docs/networking/connecting-vpchles-419

---

#### `Google-Cloud Functions-02` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberá forzar el uso del protocolo HTTPS para todas las funciones.

**Por qué importa**: Usar HTTPS en Cloud Functions proporciona una capa adicional de seguridad en la comunicación entre el cliente y el servidor, lo que reduce el riesgo de que los datos sensibles sean interceptados o modificados por terceros no autorizados.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/functions/docs/calling/http

---

#### `Google-Cloud Functions-03` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Puedes usar Secret Manager para almacenar de forma segura claves de API, contraseñas y otra información sensible.

**Por qué importa**: Secret Manager te permite almacenar, administrar y acceder a secretos como BLOB binarios o strings de texto. Con los permisos adecuados, puedes ver el contenido del secreto como variables de entorno en Cloud functions. Secret Manager funciona bien con el fin de almacenar información de configuración, como contraseñas de bases de datos, claves de API o certificados TLS necesarios para una aplicació

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/functions/docs/configuring/secrets

---

#### `Google-Cloud Functions-04` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Hacer uso del registro de labels, Cada función deberá tener etiquetado Ecosistema y área

**Por qué importa**: En tener un mejor control al momento de evaluar y agrupar servicios, así mismo, identificar los servicios que se engloban en un ecosistema dentro de una nube

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/resource-manager/docs/creating-managing-labelslabel_support

---

#### `Google-Cloud Functions-05` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Mediante permisos IAM pueden validar y asignar los permisos invocación, lectura ó escritura de la función mediante roles que se asignan o requiera Cloud Functions

**Por qué importa**: : Ayuda a granular los permisos mediante roles, deberá estar apegado al menor privilegio, por default cloud functions solo permite invocaciones autenticadas aunque la función está expuesta a internet mediante una URL pública.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/functions/docs/reference/iam/permissions

---

#### `Google-Cloud Functions-06` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: : Mediante el uso de Cloud Logging y cloud monitoring se tiene control sobre los logs y métricas de manera automática

**Por qué importa**: Gestión de registros totalmente gestionada y en tiempo real, que admite exabytes de datos y ofrece funciones de almacenamiento, búsqueda, análisis y alertas de las funciones desplegadas.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/functions/docs/monitoring

---

#### `Google-Cloud Functions-07` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Las cuentas de servicio asociadas a una función ambiente de ejecución deben seguir el principio de mínimo privilegio en IAM

**Por qué importa**: : Los permisos asignados en IAM sobre las cuentas de servicio permiten delimitar los recursos y capacidades a nivel permiso que tienen las funciones en el proyecto de GCP

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/functions/docs/securing/function-identityhles_419

---

#### `Google-Cloud Functions-08` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Vulnerabilidades en Codigo

**Por qué importa**: Se debera ejecutar alguna herramienta sobre el codigo como checkmarx y debera contener 0 vulnerabilidades

**Cómo cumplirlo**: Adjuntar evidencia del analisis

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="cloudfunctions.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-cloud-functions.json`](../data/controls-cloud-functions.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |