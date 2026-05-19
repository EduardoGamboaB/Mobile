# Vertex AI — Controles de seguridad G3

**32 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **32**
- Importantes (ponderación 3): **0**
- Otros: **0**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Críticos (ponderación 5)

#### `Google-Vertex AI-01` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Asegurar de que solo los usuarios y servicios que necesitan acceso a Vertex AI tengan los roles adecuados, tales como Vertex AI Admin, Vertex AI Viewer, Vertex AI Developer. Aplica el principio de menor privilegio, otorgando solo los permisos mínimos necesarios. No utilizar roles primitivos.

**Por qué importa**: A asegurar que solo los usuarios y servicios que necesitan acceso a Vertex AI tengan los roles adecuados y aplicar el principio de menor privilegio ayuda a minimizar el riesgo de acceso no autorizado, reduciendo la superficie de ataque y garantizando que cada usuario y servicio solo pueda realizar las acciones necesarias, lo que mejora la seguridad general del entorno y protege los datos sensibles

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/general/access-control

---

#### `Google-Vertex AI-05` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Realizar el llenado del documento Gobierno de Seguridad GenIA para la utilización de inteligencia generativa, en el cual se deben cumplir los controles de acuerdo con el Alcance del proyecto.

**Por qué importa**: Asegura el correcto uso de las herramientas de IA

**Cómo cumplirlo**: Favor de consultar el documento de GCP documento Controles de Seguridad para GenIA.docx

---

#### `Google-Vertex AI-06` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Validación del FM Foundation Model: Busca asegurar que los modelos de aprendizaje automático ML utilizados en Vertex AI cumplen con los estándares de calidad, seguridad y rendimiento necesarios para su implementación.

**Por qué importa**: Identificar que el modelo se encuentra dentro de los estándares de DSI.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models

---

#### `Google-Vertex AI-07` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Cloud Storage siempre encripta los datos antes de escribirse a disco, Encriptación en reposo.

**Por qué importa**: Asegurar el correcto cifrado de las herramientas de la información en buckets de Google Cloud Storage.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/storage/docs/encryption https://cloud.google.com/vertex-ai/docs/general/cmek

---

#### `Google-Vertex AI-08` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Habilitar el registro de actividades y auditoría en Vertex para registrar eventos importantes, como operaciones de escritura de metadata o información de configuración.

**Por qué importa**: Proporcionan una capa crítica de seguridad, cumplimiento y optimización, ayudando a asegurar que los sistemas de almacenamiento sean eficientes, seguros y conformes con las normas aplicables.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/general/audit-logging https://cloud.google.com/vertex-ai/docs/workbench/managed/audit-logging https://cloud.google.com/vertex-ai/docs/workbench/user-managed/audit-logging

---

#### `Google-Vertex AI-09` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Habilite el servicio de Controles de Servicio de VPC.

**Por qué importa**: Esta configuración crea un perímetro de seguridad que limita cómo los datos pueden ser accesados y compartidos, incluso dentro de la propia infraestructura de Google Cloud.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/general/vpc-service-controlshles-419

---

#### `Google-Vertex AI-10` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Utilizar solo regiones autorizadas en despliegue de servicios para utilizar Vertex. No es posible utilizar Vertex Ai en todas las regiones de GCP actualmente.

**Por qué importa**: Utilizar solo las regiones autorizadas garantiza que se cumplan criterios esenciales como requisitos de rendimiento, cumplimiento normativo y estrategias de resiliencia, garantizando así operaciones en la nube eficientes, seguras y alineadas con los objetivos estratégicos de la organización.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/locationshles-419

---

#### `Google-Vertex AI-11` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Activar la protección de alguna herramienta propia de GCP o de terceros como mecanismo de protección para IA.

**Por qué importa**: Asegura la integridad y confidencialidad de los modelos y datos utilizados, mitigando riesgos de accesos no autorizados, previniendo ataques maliciosos, y garantizando el cumplimiento de normativas de seguridad y privacidad, lo que a su vez aumenta la confianza de los usuarios en las soluciones de IA implementadas.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://console.cloud.google.com/vertex-ai/publishers/meta/model-garden/prompt-guard

---

#### `Google-Vertex AI-03` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: SOLO aplica para caso de uso notebook de Workbench Las instancias notebook de Vertex AI se crean como una instancia de Compute Engine. Son creadas dentro de una subred de una VPC, por lo que esta gestiona quién tiene acceso a la instancia.

**Por qué importa**: Asegurar la información limitando quién puede acceder a la instancia.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vpc/docs/vpc

---

#### `Google-Vertex AI-12` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: SOLO aplica para caso de uso notebook de Colab Enterprise Usar solo runtime templates en Colab Enterprise.

**Por qué importa**: Mejora la seguridad al asegurar que todas las configuraciones y prácticas de seguridad sean consistentes y aplicadas uniformemente, incluyendo autenticación, autorización, encriptación y monitoreo, lo que reduce el riesgo de vulnerabilidades y errores humanos, facilitando el cumplimiento de normativas y regulaciones de seguridad.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/colab/create-runtime-template

---

#### `Google-Vertex AI-13` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: SOLO aplica para caso de uso notebook de Colab Enterprise Usar solo runtime templates sin acceso a internet.

**Por qué importa**: A fortalecer la seguridad al aislar los entornos de ejecución, reduciendo el riesgo de ataques externos, filtraciones de datos y ejecución de código malicioso, mientras asegura que todas las configuraciones y dependencias sean predefinidas y controladas, lo que facilita el cumplimiento de normativas y mantienen un alto nivel de confidencialidad e integridad de los datos y el código.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/colab/docs/runtimesconfiguration-internet-access

---

#### `Google-Vertex AI-14` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: SOLO aplica para caso de uso notebook de Colab Enterprise Agregar etiquetas en los runtime templates de Colab Enterprise.

**Por qué importa**: A mejorar la organización y gestión de recursos, facilitando la identificación y clasificación de Notebooks según proyectos, equipos o propósitos específicos, lo que simplifica la búsqueda, el monitoreo y la aplicación de políticas de seguridad y acceso basadas en etiquetas, mejorando la eficiencia y el control sobre los entornos de desarrollo.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/colab/create-runtime-template

---

#### `Google-Vertex AI-15` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: SOLO aplica para caso de uso notebook de Colab Enterprise. Habilitar arranque seguro en la creación de runtime template en Colab Enterprise.

**Por qué importa**: A fortalecer la seguridad al verificar la integridad y autenticidad del firmware y del sistema operativo, previniendo la ejecución de código malicioso o no autorizado durante el proceso de inicio, lo que reduce el riesgo de ataques de firmware y asegura que el entorno de ejecución se inicie en un estado confiable y seguro.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI

---

#### `Google-Vertex AI-16` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Solo aplica para caso de uso notebook de Colab Enterprise Habilitar cierre de actividad en la creación de runtime template en Colab Enterprise.

**Por qué importa**: A mejorar la seguridad y el rendimiento al automáticamente detener los Notebooks inactivos, lo que reduce el riesgo de exposición a amenazas persistentes, libera recursos computacionales no utilizados y minimiza costos, asegurando que el entorno de desarrollo sea más eficiente y seguro.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/colab/create-runtime-template

---

#### `Google-Vertex AI-18` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Si es necesario contar con salida a internet de algún servicio, la salida hacia internet se debe realizar a través de la VPC de seguridad definida por el DSI y montada en el Shared Service.

**Por qué importa**: Centraliza el control de acceso, mejora la seguridad con firewalls y proxies, facilita el monitoreo y registro del tráfico, reduce la superficie de ataque, bloquea tráfico malicioso, filtra contenido, optimiza costos, facilita el cumplimiento de normativas, y asegura la resiliencia y continuidad del negocio, proporcionando una capa adicional de protección y control sobre los servicios que necesita

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI

---

#### `Google-Vertex AI-17` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Solo aplica para caso de uso notebook de Colab Enterprise Habilitar credenciales de usuario final en la creación de runtime templates de Colab Enterprise.

**Por qué importa**: A mejorar la seguridad y el control de acceso al asegurar que cada usuario se autentique con sus propias credenciales, lo que permite un seguimiento preciso de las acciones realizadas, reduce el riesgo de acceso no autorizado y facilita el cumplimiento de normativas de seguridad y auditorías.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/colab/create-runtime-template

---

#### `Google-Vertex AI-04` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Seguridad de los Modelos y Datos. Asegúrate de que los datos en tránsito y en reposo están encriptados. Revisa la configuración de encriptación en la consola de GCP.

**Por qué importa**: El utilizar solo modelos y servicios que cumplan con la encriptación de datos en tránsito y reposo aseguran la confidencialidad de los datos sensibles.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/general/vertexai-security-controlshles-419

---

#### `Google-Vertex AI-02` — Ponderación 5 · Cloud DSI

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: SOLO aplica para caso de uso notebook de Workbench Las instancias de Vertex AI Workbench pueden estar tanto en una VPC del proyecto personal, como en una manejada por Google. En caso de seleccionar una manejada por Google, se debe gestionar un VPC Peering, de lo contrario, el workbench se crea dentro de una instancia común.

**Por qué importa**: Se puede controlar las redes donde se hospedan las instancias de jupyter notebook de Vertex AI.

**Cómo cumplirlo**: Favor de consultar el documento de GCP Vertex AI, adjunto en la sección de ayuda, manuales cloud, GCP Vertex AI: https://cloud.google.com/vertex-ai/docs/workbench/managed/networkingvpc

---

#### `Google-Vertex AI-5241` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Habilitar el filtrado de contenido dirigido a la detección y filtro de contenido dañino integrando 4 categorías odio, sexual, violencia y autolesión implementando el nivel de severidad Alto

**Por qué importa**: Habilitar el filtrado de contenido dirigido a la detección y filtro de contenido dañino integrando 4 categorías odio, sexual, violencia y autolesión implementando el nivel de severidad Alto

**Cómo cumplirlo**: Habilitar el filtrado de contenido dirigido a la detección y filtro de contenido dañino integrando 4 categorías odio, sexual, violencia y autolesión implementando el nivel de severidad Alto

---

#### `Google-Vertex AI-5242` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Implementar filtros de contenido personalizados para complementar y robustecer la entrada y salida del Modelo de IA acorde a los casos de uso definidos

**Por qué importa**: Implementar filtros de contenido personalizados para complementar y robustecer la entrada y salida del Modelo de IA acorde a los casos de uso definidos

**Cómo cumplirlo**: Implementar filtros de contenido personalizados para complementar y robustecer la entrada y salida del Modelo de IA acorde a los casos de uso definidos

---

#### `Google-Vertex AI-5243` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Implementar blocklist para la detección y bloqueo de texto dañino que puedan generar resultados de IA inseguros que comprometan a la Compañia

**Por qué importa**: Implementar blocklist para la detección y bloqueo de texto dañino que puedan generar resultados de IA inseguros que comprometan a la Compañia

**Cómo cumplirlo**: Implementar blocklist para la detección y bloqueo de texto dañino que puedan generar resultados de IA inseguros que comprometan a la Compañia

---

#### `Google-Vertex AI-5244` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Implementar Prompt Shields frente a ataques jailbreak para avisos de usuario, integrando las categorías: Cambio de reglas al sistema, Confusión al Modelo, Juego de roles y Ataques de codificación.

**Por qué importa**: Implementar Prompt Shields frente a ataques jailbreak para avisos de usuario, integrando las categorías: Cambio de reglas al sistema, Confusión al Modelo, Juego de roles y Ataques de codificación.

**Cómo cumplirlo**: Implementar Prompt Shields frente a ataques jailbreak para avisos de usuario, integrando las categorías: Cambio de reglas al sistema, Confusión al Modelo, Juego de roles y Ataques de codificación.

---

#### `Google-Vertex AI-5245` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Implementar Prompt Shields frente a ataques para avisos de documentos, integrando las categorías: Contenido manipulado, LLM comprometido con acceso a infraestructura, Recopilación de información, Disponibilidad, Fraude, Malware, Cambio de reglas al sistema, Confusión al Modelo, Juego de roles y Ataques de codificación.

**Por qué importa**: Implementar Prompt Shields frente a ataques para avisos de documentos, integrando las categorías: Contenido manipulado, LLM comprometido con acceso a infraestructura, Recopilación de información, Disponibilidad, Fraude, Malware, Cambio de reglas al sistema, Confusión al Modelo, Juego de roles y Ataques de codificación.

**Cómo cumplirlo**: Implementar Prompt Shields frente a ataques para avisos de documentos, integrando las categorías: Contenido manipulado, LLM comprometido con acceso a infraestructura, Recopilación de información, Disponibilidad, Fraude, Malware, Cambio de reglas al sistema, Confusión al Modelo, Juego de roles y Ataques de codificación.

---

#### `Google-Vertex AI-5246` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Habilitar la deteccion de ataques a base de datos de fuentes internas

**Por qué importa**: Habilitar la deteccion de ataques a base de datos de fuentes internas

**Cómo cumplirlo**: Habilitar la deteccion de ataques a base de datos de fuentes internas

---

#### `Google-Vertex AI-5247` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Habilitar la detección de material protegido marcado como contenido textual conocido

**Por qué importa**: Habilitar la detección de material protegido marcado como contenido textual conocido

**Cómo cumplirlo**: Habilitar la detección de material protegido marcado como contenido textual conocido

---

#### `Google-Vertex AI-5248` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Habilitar la detección de material protegido marcado como contenido de codigo protegido

**Por qué importa**: Habilitar la detección de material protegido marcado como contenido de codigo protegido

**Cómo cumplirlo**: Habilitar la detección de material protegido marcado como contenido de codigo protegido

---

#### `Google-Vertex AI-5249` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Implementar limites de protección para administración de riesgos asociados al contenido de texto e imagen

**Por qué importa**: Implementar limites de protección para administración de riesgos asociados al contenido de texto e imagen

**Cómo cumplirlo**: Implementar limites de protección para administración de riesgos asociados al contenido de texto e imagen

---

#### `Google-Vertex AI-5250` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Limitar el lenguaje del Modelo a contenido solo en Español México

**Por qué importa**: Limitar el lenguaje del Modelo a contenido solo en Español México

**Cómo cumplirlo**: Limitar el lenguaje del Modelo a contenido solo en Español México

---

#### `Google-Vertex AI-5251` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Limitar el aprendizaje del Modelo de IA solo a los casos de uso definidos. No habilitado de entrenamiento de IA

**Por qué importa**: Limitar el aprendizaje del Modelo de IA solo a los casos de uso definidos. No habilitado de entrenamiento de IA

**Cómo cumplirlo**: Limitar el aprendizaje del Modelo de IA solo a los casos de uso definidos. No habilitado de entrenamiento de IA

---

#### `Google-Vertex AI-5252` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Habilitar la trazabilidad logs de todos los movimientos de configuración del Modulo de IA, los eventos de entrada, salida del Modelo de IA asi como eventos de seguridad detectados por los modulos de IA e integrarlos a SIEM de DSI Splunk

**Por qué importa**: Habilitar la trazabilidad logs de todos los movimientos de configuración del Modulo de IA, los eventos de entrada, salida del Modelo de IA asi como eventos de seguridad detectados por los modulos de IA e integrarlos a SIEM de DSI Splunk

**Cómo cumplirlo**: Habilitar la trazabilidad logs de todos los movimientos de configuración del Modulo de IA, los eventos de entrada, salida del Modelo de IA asi como eventos de seguridad detectados por los modulos de IA e integrarlos a SIEM de DSI Splunk

---

#### `Google-Vertex AI-5253` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Implementación de servicio Security Command Center para servicios de IA

**Por qué importa**: Implementación de servicio Security Command Center para servicios de IA

**Cómo cumplirlo**: Implementación de servicio Security Command Center para servicios de IA

---

#### `Google-Vertex AI-5254` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: AI/ML

**Qué exige**: Habilitar la encripción en transito y reposo del Modelo de AI y que sea administrado por Totalplay

**Por qué importa**: Habilitar la encripción en transito y reposo del Modelo de AI y que sea administrado por Totalplay

**Cómo cumplirlo**: Habilitar la encripción en transito y reposo del Modelo de AI y que sea administrado por Totalplay

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="vertexai.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-vertex-ai.json`](../data/controls-vertex-ai.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |