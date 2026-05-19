# Firebase Analytics — Controles de seguridad G3

**8 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **8**
- Importantes (ponderación 3): **0**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Críticos (ponderación 5)

#### `Google-Firebase-01` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Developer Tools

**Qué exige**: Accede y administra tus reglas de seguridad de Firebase.

**Por qué importa**: Son cruciales para garantizar la seguridad y el control de acceso en tus aplicaciones, permitiendo especificar quién puede leer, escribir o eliminar datos, lo que ayuda a prevenir accesos no autorizados y proteger información sensible. Estas reglas permiten una validación de datos efectiva y facilitan auditorías mediante el registro de accesos, y pueden configurarse de manera dinámica según la inf

**Cómo cumplirlo**: Favor de consultar el documento de GCP Firebase, adjunto en la sección de ayuda, manuales cloud, Cloud Firebase: https://firebase.google.com/docs/rules/manage-deployhles-419

---

#### `Google-Firebase-02` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Developer Tools

**Qué exige**: Para este caso de uso de Firebase solo Analytics se deben configurar las reglas en modo bloqueado para los servicios Cloud Firestore, Reatime Database y Cloud Storage.

**Por qué importa**: Son esenciales para garantizar la seguridad y el control de acceso a los datos, ya que impiden el acceso no autorizado y protegen información sensible de potenciales amenazas. Estas reglas permiten definir claramente quién puede leer, escribir o modificar datos, asegurando que solo usuarios autenticados y autorizados interactúen con la base de datos. Además, reducen el riesgo de cambios accidental

**Cómo cumplirlo**: Favor de consultar el documento de GCP Firebase, adjunto en la sección de ayuda, manuales cloud, Cloud Firebase: https://firebase.google.com/docs/rules/basicshles-419default_rules_locked_mode

---

#### `Google-Firebase-03` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Developer Tools

**Qué exige**: Control de Acceso a la Consola de Firebase.

**Por qué importa**: A proteger la seguridad y la integridad de los proyectos, ya que limita quién puede acceder a la consola y qué permisos tienen, asegurando que solo los usuarios autorizados puedan realizar modificaciones en configuraciones y acceder a datos sensibles. Al utilizar IAM Identity and Access Management para gestionar permisos a nivel de proyecto, se minimiza el riesgo de cambios accidentales y se optim

**Cómo cumplirlo**: Favor de consultar el documento de GCP Firebase, adjunto en la sección de ayuda, manuales cloud, Cloud Firebase: https://firebase.google.com/docs/projects/iam/permissionshles

---

#### `Google-Firebase-04` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Developer Tools

**Qué exige**: Aplica restricciones de claves de API. Las claves de API no están restringidas de forma predeterminada. Las claves no restringidas son inseguras porque cualquier persona puede usarlas desde cualquier lugar. Para las aplicaciones de producción, debes establecer restricciones de aplicaciones y restricciones de API.

**Por qué importa**: Las restricciones de aplicaciones especifican qué sitios web, direcciones IP o apps pueden usar una clave de API.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Firebase, adjunto en la sección de ayuda, manuales cloud, Cloud Firebase: https://cloud.google.com/docs/authentication/api-keyshlesapi_key_restrictions

---

#### `Google-Firebase-05` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Developer Tools

**Qué exige**: Mantenga las claves del servidor FCM en secreto.

**Por qué importa**: A diferencia de las claves API para los servicios de Firebase, las claves del servidor FCM son confidenciales y deben mantenerse en secreto.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Firebase, adjunto en la sección de ayuda, manuales cloud, Cloud Firebase: https://firebase.google.com/docs/cloud-messaging/auth-serverhlesauthorize-legacy-protocol-send-requests

---

#### `Google-Firebase-06` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Developer Tools

**Qué exige**: Mantenga en secreto las claves de la cuenta de servicio.

**Por qué importa**: Además, a diferencia de las claves API para los servicios de Firebase, las claves privadas de la cuenta de servicio son confidenciales y deben mantenerse en secreto.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Firebase, adjunto en la sección de ayuda, manuales cloud, Cloud Firebase: https://firebase.google.com/docs/admin/setuphlesinitialize-sdk

---

#### `Google-Firebase-07` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Developer Tools

**Qué exige**: Reglas de seguridad de prueba unitaria con Emulator Suite agregarlo a CI.

**Por qué importa**: Para asegurarse de que sus reglas de seguridad se mantengan al día con el desarrollo de su aplicación, pruebe sus reglas con el conjunto de emuladores Firebase y agregue estas pruebas a su canal de CI. Consulte estas guías para Cloud Firestore y Realtime Database.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Firebase, adjunto en la sección de ayuda, manuales cloud, Cloud Firebase: https://firebase.google.com/docs/emulator-suitehles https://firebase.google.com/docs/firestore/security/test-rules-emulatorhles https://firebase.google.com/docs/rules/unit-testshlesdatabase

---

#### `Google-Firebase-08` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Developer Tools

**Qué exige**: Nunca coloques información confidencial en las variables de entorno de una función en la nube.

**Por qué importa**: A menudo, en una aplicación Node.js autohospedada, se utilizan variables de entorno para contener información confidencial, como claves privadas. No hagas esto en Cloud Functions. Debido a que Cloud Functions reutiliza entornos entre invocaciones de funciones, la información confidencial no debe almacenarse en el entorno.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Firebase, adjunto en la sección de ayuda, manuales cloud, Cloud Firebase: https://firebase.google.com/support/guides/security-checklisthlescloud_function_safety

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="firebaseanalytics.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-firebase-analytics.json`](../data/controls-firebase-analytics.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |