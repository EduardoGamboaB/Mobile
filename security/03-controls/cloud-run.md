# Cloud Run — Controles de seguridad G3

**11 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **11**
- Importantes (ponderación 3): **0**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Críticos (ponderación 5)

#### `Google-Cloud Run-01` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Identifique cualquier servicio de Cloud de acceso público dentro de su cuenta GCP y actualice su política de IAM con el fin de protegerse contra usuarios no autorizados que están enviando solicitudes para invocar estos servicios.

**Por qué importa**: Los permisos de acceso mal configurados son una vulnerabilidad de seguridad común que involucra recursos de Google Cloud. Conceder permisos a allUsers y allAuthenticatedUsers puede permitir a cualquiera invocar sus servicios. Para evitar filtraciones de datos sensibles, pérdida de datos y cargos inesperados en su factura GCP, asegúrese de que el acceso anónimo y/o público a sus servicios de Cloud 

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://cloud.google.com/iam/docs/overviewhles-419

---

#### `Google-Cloud Run-02` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que sus servicios de Cloud Run no estén configurados para permitir el acceso de la red de salida sin restricciones con el fin de prevenir vulnerabilidades de seguridad y minimizar los costos de la nube. Para asegurarse de que el tráfico de salida de su servicio se limita a los rangos de IP internos y no puede comunicarse con redes externas o el Internet público, establezca el parámetro VpcConnector EgressConfiguración a PRIVATE-RANGES-ONLY.

**Por qué importa**: Los actores maliciosos pueden explotar el acceso irrestricto a la red saliente para exfiltrar datos sensibles, lanzar ataques como los ataques Man-In-In-The-Middle MITM y Denial-of-Service DoS, o incurren en cargos inesperados.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://cloud.google.com/run/docs/configuring/networking-best-practiceshles-419

---

#### `Google-Cloud Run-03` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Para evitar el escalado incontrolado, el agotamiento de los recursos y los costos inesperados, asegúrese que sus servicios de Cloud Run se configuren con un número máximo óptimo de instancias asignadas. Así mismo, para minimizar la latencia en frío y mejorar el rendimiento, asegúrense de que sus servicios de Google Cloud Run tengan un número suficiente de instancias de contenedores configurados.

**Por qué importa**: Puede controlar su comportamiento de escalado de servicio de Cloud Run estableciendo un número máximo de instancias de contenedores. Esto limita los costes y evita los recursos descendentes abrumadores con el tráfico.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://cloud.google.com/functions/docs/configuring/max-instanceshles-419

---

#### `Google-Cloud Run-04` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que el valor configurado para las peticiones máximas concurrentes por instancia es óptimo para mejorar la capacidad de respuesta y escalabilidad durante los picos de tráfico, y mejorar la experiencia del usuario.

**Por qué importa**: Configurar solicitudes de concurrencia más altas por instancia para los servicios de Google Cloud Run permite a su aplicación manejar más interacciones simultáneas de los usuarios, mejorando la capacidad de respuesta y la experiencia del usuario.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run.

---

#### `Google-Cloud Run-05` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que siempre utilice la versión más reciente del lenguaje de programación de sus cargas para sus servicios de Cloud Run.

**Por qué importa**: Es crucial para la seguridad, el rendimiento y el acceso a las últimas características y bibliotecas. Asegura que sus servicios se beneficien de correcciones de errores, optimizaciones y compatibilidad mejorada.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://cloud.google.com/run/docs/configuring/services/runtime-base-imageshles-419

---

#### `Google-Cloud Run-06` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que sus servicios de Cloud Run se refieren a cuentas de servicio activas existentes con el fin de evitar fallos de ejecución e interrupciones operativas.

**Por qué importa**: Una cuenta de servicio es esencial para que el servicio de Cloud Run se pueda ejecutar con éxito. Esto provee de los permisos y credenciales necesarios al servicio para el acceso a otros recursos y realiza sus tareas dentro del entorno de la nube GCP. Si la cuenta de servicio está deshabilitada o eliminada, el servicio no funcionará, lo que conducirá a interrupciones del servicio y pérdida de dato

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run.

---

#### `Google-Cloud Run-07` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que los servicios de Cloud Run invocados por Pub/Sub tengan un Dead-Letter Topic DLT configurado para manejar mensajes no disponibles.

**Por qué importa**: Cuando un mensaje no puede ser reconocido, Google Cloud Pub/Sub puede enviar el mensaje a un Dead-Letter Topic DLT que almacena el mensaje para un acceso posterior.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://console.cloud.google.com/cloudpubsub/subscription/createhles-419projectdsi-poc

---

#### `Google-Cloud Run-08` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que las actualizaciones automáticas de seguridad en tiempo de ejecución están habilitadas para sus servicios de Cloud Run con el fin de mantener los servicios seguros y protegidos contra vulnerabilidades sin intervención manual.

**Por qué importa**: Google libera parches de seguridad y actualizaciones de mantenimiento después de un período de pruebas de estabilidad.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://cloud.google.com/run/docs/configuring/services/automatic-base-image-updateshles-419

---

#### `Google-Cloud Run-09` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que la función de Binary Authorization esté habilitada para sus servicios de Google Cloud Run. La habilitación de la Binary Authorization para los servicios de Cloud Run mejora la seguridad asegurando que sólo se puedan implementar imágenes de contenedores de confianza, reduciendo el riesgo de desplegar software vulnerable o no autorizado.

**Por qué importa**: Binary Authorization tiene por objeto mitigar los peligros potenciales asociados con el despliegue de software defectuoso, inseguro o no autorizado en esos entornos. Con Binary Authorization, usted tiene la capacidad de bloquear el despliegue de imágenes a menos que se adhieran a una política que usted establece.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://cloud.google.com/binary-authorization/docs/run/enabling-binauthz-cloud-runhles-419

---

#### `Google-Cloud Run-10` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que el soporte HTTP/2 de extremo a extremo esté habilitado para sus servicios de Cloud Run con el fin de beneficiarse de las mejoras de rendimiento introducidas por el protocolo HTTP/2.

**Por qué importa**: Permitir el HTTP/2 de extremo a extremo para los servicios de Cloud Run mejora el rendimiento reduciendo la latencia, permitiendo flujos multiplexados a través de una sola conexión, y permitiendo una transferencia de datos más rápida. También proporciona una mejor eficiencia en el uso de los recursos, ya que varias solicitudes pueden tramitarse simultáneamente a lo largo de la misma conexión, redu

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://cloud.google.com/run/docs/configuring/http2hles-419

---

#### `Google-Cloud Run-11` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Asegúrese de que las etiquetas definidas por el usuario se están utilizando para etiquetar, recopilar y organizar servicios de Cloud Run dentro de sus proyectos. Las etiquetas definidas por el usuario son una forma ligera y eficiente de agrupar los recursos de la nube relacionados o asociados.

**Por qué importa**: A medida que sus proyectos de Google Cloud Platform GCP crecen cada vez más complejos, las estrategias de gestión eficaces se vuelven esenciales.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Cloud Run, adjunto en la sección de ayuda, manuales cloud, Cloud Run: https://cloud.google.com/resource-manager/docs/creating-managing-labelshles-419 https://cloud.google.com/run/docs/configuring/services/labelshles-419

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="cloudrun.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-cloud-run.json`](../data/controls-cloud-run.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |