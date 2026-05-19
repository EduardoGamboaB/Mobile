# IAM - GCP — Controles de seguridad G3

**17 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **0**
- Importantes (ponderación 3): **17**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Importantes (ponderación 3)

#### `Google-IAM - GCP-01` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Datos de contacto actualizados

**Por qué importa**: Muchos servicios de Google Cloud, como la Facturación de Cloud, envían notificaciones para compartir información importante con los usuarios de Google Cloud. Según la configuración predeterminada, estas notificaciones se envían a los miembros con determinadas funciones de administración de identidades y accesos IAM. Con los contactos esenciales, puedes personalizar quién recibe notificaciones si p

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/resource-manager/docs/managing-notification-contacts

---

#### `Google-IAM - GCP-02` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Información de contacto de seguridad

**Por qué importa**: El nivel en el que asignas contactos de seguridad depende de las prácticas de seguridad específicas de tu organización. Por ejemplo, si los propietarios de proyectos individuales están a cargo de la seguridad de sus propios proyectos, debes asignar tus contactos de seguridad a nivel del proyecto. Sin embargo, si un grupo de toda la organización administra la seguridad de todos los proyectos, tendr

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/resource-manager/docs/managing-notification-contactscontact-inheritance

---

#### `Google-IAM - GCP-03` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Mecanismos de recuperación en la cuenta de GCP

**Por qué importa**: Un administrador puede recuperar su cuenta vía la inscripción de diferentes factores de autenticación en el caso que olvide su contraseña. Dentro de los cuales se encuentra: Llamada telefónica, correo electrónico, agregando registros al DNS, con ayuda otro administrador que tenga permisos para restablecer contraseñas o contactando al servicio de soporte técnico.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://support.google.com/cloudidentity/answer/33561hles::textReset20your20administrator20passw ord,email20address20or20phone20number

---

#### `Google-IAM - GCP-04` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Google Cloud Identity Admin Groups

**Por qué importa**: Mediante la configuración de grupos en Cloud identity Admin, se debe crear un grupo por rol y cada cuenta deberá ser asignada a los grupos donde se desea heredar permisos.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/identity/docs/groupshles-419

---

#### `Google-IAM - GCP-05` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Auditoría de Administradores

**Por qué importa**: Tener visibilidad y trace de los eventos realizados por los administradores

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://support.google.com/a/answer/9725452

---

#### `Google-IAM - GCP-06` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: No debe existir Service Accounts Key ni cuentas de servicio privilegiadas Administrador

**Por qué importa**: De forma predeterminada, todos los proyectos de Google Cloud incluyen un solo usuario, es decir, el creador original del proyecto. Ningún otro usuario tiene acceso al proyecto y, por lo tanto, tampoco puede acceder a recursos de Compute Engine hasta que se lo agregue como miembro del proyecto o se lo vincule a un recurso específico. Se pueden hacer uso del google SDK para dar permisos a ambientes 

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/iam/docs/creating-managing-service-account-keys https://cloud.google.com/docs/authentication/best-practices-applications

---

#### `Google-IAM - GCP-07` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Credenciales de acceso para service accounts

**Por qué importa**: Las service accounts funcionan como credenciales para procesos o ambientes en GCP, es decir no están asociadas a una cuenta personal, estas credenciales al no estar vinculadas a una persona miembro de la organización no tienen acceso a la consola, adicionalmente es recomendable generar credenciales de corta duración y no llaves en formatos de archivo

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/iam/docs/creating-managing-service-account-keys https://cloud.google.com/iam/docs/create-short-lived-credentials-direct

---

#### `Google-IAM - GCP-08` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Root Usuarios con acceso a consola deberán tener habilitado MFA

**Por qué importa**: La autenticación de varios factores MFA es una herramienta importante para proteger los recursos empresariales. La MFA, también llamada verificación en dos pasos 2SV, exige que los usuarios verifiquen su identidad por medio de algo que sepan como una contraseña, y de algo que tengan como una clave física o un código de acceso. Para proteger los datos y las cuentas de usuario, tu empresa decidió qu

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://support.google.com/cloudidentity/answer/9176657hles

---

#### `Google-IAM - GCP-09` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Los permisos a los usuarios IAM serán asignados mediante roles.

**Por qué importa**: Los grupos de Google te pueden ayudar a administrar usuarios a gran escala. Cada miembro de un grupo de Google hereda las funciones de administración de identidades y accesos IAM otorgadas a ese grupo. Esta herencia significa que puedes usar la membresía de un grupo para administrar las funciones de los usuarios en lugar de otorgar funciones de IAM a usuarios individuales.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/iam/docs/understanding-roleshles

---

#### `Google-IAM - GCP-10` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Política de contraseña

**Por qué importa**: En esta guía, se describen las orientaciones y recomendaciones de contraseñas para usuarios de aplicaciones en línea que requieren autenticación. Se establece un conjunto de recomendaciones centradas en el usuario para crear y almacenar contraseñas, que incluye el equilibrio entre la seguridad de la contraseña y la usabilidad. Una guía relacionada, Seguridad moderna mediante contraseña para los di

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/solutions/modern-password-security-for-users

---

#### `Google-IAM - GCP-11` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Las credenciales no utilizadas durante 90 días o más estén deshabilitadas

**Por qué importa**: Las credenciales no utilizadas durante 90 días o más estén deshabilitadas

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/identityhlessection-5 https://cloud.google.com/iam/docs/creating-managing-service-account-keys

---

#### `Google-IAM - GCP-12` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Solo debe existir una cuenta de servicio para cada ambiente o proceso registrado en IAM, un solo un usuario

**Por qué importa**: Los ambientes de desarrollo o procesos dentro del proyecto de GCP solo podrán tener una cuenta de servicio asignada.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/iam/docs/creating-managing-service-account-keys

---

#### `Google-IAM - GCP-13` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Las claves de acceso se deben rotar cada 90 días o menos

**Por qué importa**: Un administrador puede establecer requerimientos de contraseña para los usuarios de la organización. Cloud Identity permite crear temporalidades de expiración de 30, 60, 90 180 y 365 días para las identidades. Estas pueden ser configuradas granular mente para cumplir con los requerimientos de la organización

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://support.google.com/cloudidentity/answer/139399hles

---

#### `Google-IAM - GCP-14` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Comprobar que no hay miembros de IAM con roles de servicio en el nivel de proyecto

**Por qué importa**: Asegurarse de que los roles Usuario de cuenta de servicio y Creador de token de cuenta de servicio se asignen a un usuario para una cuenta de servicio de GCP específica en lugar de a un usuario en el nivel de proyecto de GCP, a fin de implementar el principio de privilegios mínimos POLP. El principio de privilegio mínimo también conocido como el principio de privilegio mínimo es la práctica de pro

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/iam/docs/impersonating-service-accounts

---

#### `Google-IAM - GCP-15` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Configurar los registros de auditoría de acceso a datos de Google Cloud para realizar un seguimiento de todas las actividades Cloud Audit Logs to Track All Activities

**Por qué importa**: Asegurarse de que la función Registros de auditoría de Google Cloud esté configurada para realizar un seguimiento de los registros de acceso a datos de todos los servicios y usuarios de Google Cloud Platform GCP, con el fin de mejorar la seguridad general del acceso y cumplir los requisitos de cumplimiento. Una vez configurada, la función puede registrar todas las actividades relacionadas con el a

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/logging/docs/audit/configure-data-access

---

#### `Google-IAM - GCP-16` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Habilitar la aplicación de claves de seguridad para cuentas de administrador

**Por qué importa**: Asegurarse de que se aplique la separación de funciones para todos los roles relacionados con Cloud Key Management Service KMS. El principio de separación de funciones también conocido como separación de funciones tiene como objetivo primordial la prevención del fraude y el error humano. Este objetivo se logra desmantelando las tareas y los privilegios asociados para un proceso de negocio específi

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud

---

#### `Google-IAM - GCP-17` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Identity and Security

**Qué exige**: Restringir el acceso de administrador para cuentas de servicio

**Por qué importa**: Asegurar de que las cuentas de servicio gestionadas por el usuario de Google Cloud no utilicen roles privilegiados de administrador para aplicar el principio de privilegios mínimos y evitar modificaciones accidentales o intencionadas que puedan provocar fugas de datos o pérdida de datos. Una cuenta de servicio administrada por el usuario es una identidad que una instancia de máquina virtual VM o u

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="iam-gcp.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-iam-gcp.json`](../data/controls-iam-gcp.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |