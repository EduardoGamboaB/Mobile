# Cloud Pub/Sub — Controles de seguridad G3

**5 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **0**
- Importantes (ponderación 3): **5**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Importantes (ponderación 3)

#### `Google-Pub Sub-01` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Integración de aplicaciones

**Qué exige**: Mediante Cloud KMS encripta las claves por cada tema que se crea en PUB/SUB.

**Por qué importa**: Se usa Cloud KMS a fin de encriptar las claves de encriptación de datos DEK que Pub/Sub crea para cada tema.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/pubsub/docs/encryptionhles-419using-cmek

---

#### `Google-Pub Sub-02` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Integración de aplicaciones

**Qué exige**: Pub/Sub se basa en una autenticación OAuth estándar que usan otros productos de Google Cloud y admite IAM detallado, lo que permite controlar el acceso a recursos individuales..

**Por qué importa**: Evita que usuarios no autorizados publiquen mensajes

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/pubsub/docs/overviewhles-419integrations

---

#### `Google-Pub Sub-03` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Integración de aplicaciones

**Qué exige**: Una etiqueta es un par clave-valor que te ayuda a organizar los recursos de Google Cloud. Puedes adjuntar una etiqueta a cada recurso y, luego, usarlas para filtrarlos.

**Por qué importa**: Una etiqueta es un par clave-valor que te ayuda a organizar los recursos de Google Cloud. Puedes adjuntar una etiqueta a cada recurso y, luego, usarlas para filtrarlos.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/pubsub/docs/labelshles_419

---

#### `Google-Pub Sub-04` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Integración de aplicaciones

**Qué exige**: En Pub/Sub un mensaje pasa directamente entre el creador del mensaje llamado Publicador Publisher y el cliente o Suscriptor subscriber de forma predeterminada.

**Por qué importa**: En Pub/Sub un mensaje pasa directamente entre el creador del mensaje llamado Publicador Publisher y el cliente o Suscriptor subscriber de forma predeterminada.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/pubsub/docs/overviewhles-419core_concepts

---

#### `Google-Pub Sub-05` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Integración de aplicaciones

**Qué exige**: Supervisa PubSub usando Cloud Monitoring.

**Por qué importa**: En PubSub un mensaje pasa directamente entre el creador del mensaje llamado Publicador Publisher y el cliente o Suscriptor subscriber de forma predeterminada

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/pubsub/docs/monitoringhles-419

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="cloudpub/sub.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-cloud-pub-sub.json`](../data/controls-cloud-pub-sub.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |