# Networking (Cloud LB + CDN + Armor) — Controles G3

**15 controles** combinados de las 3 capas de red públicas.

## `Google-Cloud Armor-01` — Cloud Armor · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Mientras el backend sea de tipo HTTPS y se utilice un balanceador de cargas en GCP, las aplicaciones expuestas a internet pueden contar con protección de Cloud armor, cuyas políticas deben tener una regla default de negación y el set de reglas inicial para mitigar el Top 10 de OWASP

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/armor/docs/integrating-cloud-armorhles-419 https://cloud.google.com/architecture/owasp-top-ten-mitigationhles-419google_cloud_armor_a02 https://cloud.google.com/armor/docs/rule-tuningsql_injection_sqli https://cloud.google.com/architecture/owasp-top-ten-mitigationhles-419insecure-

---

## `Google-Cloud Armor-02` — Cloud Armor · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Mediante permisos IAM pueden validar los permisos que se asignan o requiera Cloud Armor

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/armor/docs/configure-security-policieshles-419iam-perms

---

## `Google-Cloud Armor-03` — Cloud Armor · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Mediante el uso de Cloud Logging y cloud monitoring se tiene control sobre los logs de manera automática, adicionalmente se debe integrar con logs based metrics para determinar alertas basadas en umbrales y alertas mínimas de creación, eliminación, encendido y apagado

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/armor/docs/audit-logginghles-419 https://cloud.google.com/logginghles https://cloud.google.com/logging/docs/logs-based-metricshles_419

---

## `Google-Cloud CDN-01` — Cloud CDN · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Habilitar los logs estándar para recibir los logs de cada solicitud enviada a la distribución

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/cdn/docs/logginghles_419

---

## `Google-Cloud CDN-02` — Cloud CDN · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Se deberá configurar cloud CDN sobre balanceadores asegurándose que todas sean peticiones HTTPS.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/load-balancing/docs/https/setting-up-http-https-redirecthles-419 https://cloud.google.com/cdn/docs/setting-up-cdn-with-mighles-419load-balancer

---

## `Google-Cloud CDN-03` — Cloud CDN · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Controlar el acceso al contenido almacenado en caché mediante autenticación de las solicitudes .

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/cdn/docs/authenticate-contenthles-419

---

## `Google-Cloud CDN-04` — Cloud CDN · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Se deberá configurar una política de Cloud Armor para la geo restricción

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/media-cdn/docs/security-policieshles-419

---

## `Google-Cloud CDN-05` — Cloud CDN · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Asegurar la configuración hacia el origen utiliza HTTPS TLS 1.2

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/cdn/docs/web-security-best-practices https://cloud.google.com/cdn/docs/configure-private-origin-authenticationhles-419gcloud

---

## `Google-Cloud CDN-06` — Cloud CDN · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Asegurar mediante Cloud Armor que todos los balanceadores de carga con Cloud CDN tengan integrada la protección del firewall activo

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/armor/docs/integrating-cloud-armorhles-419cloud-cdn https://cloud.google.com/armor/docs/configure-security-policieshles-419https-load-balancer

---

## `Google-Balanceador de carga-01` — Cloud Load Balancing · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Cloud Load Balancing internos te permite ubicar tus recursos detrás de una sola dirección IP que sea accesible de manera interna sin exponer IPs ni recursos a internet.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/load-balancing/docs/load-balancing-overviewhles_419 https://cloud.google.com/load-balancing/docs/featureshles_419health-checks

---

## `Google-Balanceador de carga-02` — Cloud Load Balancing · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Toda instancia virtual detrás de un Load Balancer deberá configurar su consumo de internet a través de proyecto de salida a Internet segura.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/vpc/docs/shared-vpchles_419

---

## `Google-Balanceador de carga-03` — Cloud Load Balancing · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: En service projects solo utilizar Load Balancers de tipo local.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/load-balancing/docs/l7-internalhles-419

---

## `Google-Balanceador de carga-04` — Cloud Load Balancing · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Habilitar flow logs en las subredes donde se despliegan Load Balancers.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/vpc/docs/flow-logshles-419vm-to-vm-flows-internal-tcp-udp-lb https://cloud.google.com/logging/docs/view/logs-explorer-summaryhles

---

## `Google-Balanceador de carga-05` — Cloud Load Balancing · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Mediante reglas de Firewall se pueden acotar orígenes, destinos y servicios a través de reglas de firewall

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/load-balancing/docs/httpshles_419firewall-rules

---

## `Google-Balanceador de carga-06` — Cloud Load Balancing · Ponderación 3

- [ ] **Estado en G3**: pendiente · responsable: _________

**Qué exige**: Todo Load Balancer deberá contar con la protección de un WAF

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/armor/docs/configure-security-policieshles-419https-load-balancer

---
