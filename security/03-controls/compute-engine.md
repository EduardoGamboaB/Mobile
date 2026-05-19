# Compute Engine VMs — Controles de seguridad G3

**45 controles** del catálogo DSI Grupo Salinas
aplicables a este servicio.

- Críticos (ponderación 5): **16**
- Importantes (ponderación 3): **26**
- Otros: **3**

## Checklist de cumplimiento

Para cada control, marca el estado. El servicio NO puede ir a producción
si quedan controles críticos sin cumplir o mitigación documentada.

### Críticos (ponderación 5)

#### `Google-Compute Engine VMs-101` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberán crear de los usuarios rtcyaa y app_care para Administración y Conciliación por parte del DSI CyAAL IT

**Por qué importa**: Garantizar accesos para administración y validación de puntos de seguridad y gestión de usuarios así como conexión en caso de contingencia

**Cómo cumplirlo**: Generando los usuarios en el servidor Se valida con el Formato de listado de usuarios ubicado en la ayuda de IEECO

---

#### `Google-Compute Engine VMs-102` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Si el sistema lo soporta ningún perfil/rol a excepción del administrativo y el correspondiente a DSI CyAAL deberá contar con permiso para la gestión de usuarios y privilegios.

**Por qué importa**: Eliminar el riesgo de movimientos a usuarios y/o privilegios del servidor no autorizados

**Cómo cumplirlo**: Adjuntando el Formato de usuarios y privilegios ubicado en la ayuda de IEECO donde se deberá indicar los usuarios que pertenecen a cada grupo

---

#### `Google-Compute Engine VMs-103` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberá proporcionar listado de usuarios indicando área, responsable y grupo asignado así como los grupos existentes en el servidor

**Por qué importa**: Identificar los usuarios y grupos existentes en el servidor.

**Cómo cumplirlo**: Para Linux - adjuntando la salida que genera la ejecución del shell jason, con el contenido del archivo passwd y group Para Windows - adjuntando la imagen que muestre el listado de usuarios

---

#### `Google-Compute Engine VMs-104` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Todos los usuarios con altos privilegios deberán ser resguardados en la bóveda de Seguridad Cyberark

**Por qué importa**: Permite tener el registro de las personas que ingresan al equipo con altos privilegios

**Cómo cumplirlo**: Adjuntando la imagen de la cuenta integrada a Cyberark

---

#### `Google-Compute Engine VMs-106` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: No deberán existir cuentas locales personalizadas. Todas las cuentas deben estar justificadas y deberán contar con los privilegios mínimos necesarios.

**Por qué importa**: Diferenciar y asignar accesos basados en privilegios específicos por rol.

**Cómo cumplirlo**: Adjuntando el formato de usuarios ubicado en la ayuda de IEECO

---

#### `Google-Compute Engine VMs-107` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: En el servidor ningún usuario deberá contar con permisos de root

**Por qué importa**: Garantizar la Restricción de altos privilegios

**Cómo cumplirlo**: Ningún usuario deberá tener UID0 ni con permisos de root en la plantilla de SUDO

---

#### `Google-Compute Engine VMs-108` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberá tener restricción de acceso por IP

**Por qué importa**: Controlar y limitar las conexiones autorizadas

**Cómo cumplirlo**: Para Linux adjuntando la salida que genera la ejecución del Shell jason, que muestre el archivo hosts/hosts.allow/iptables Para Windows configurando las reglas de Firewall contenidas en el Manual de Configuración para Enrolamiento a Bóveda

---

#### `Google-Compute Engine VMs-109` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberá habilitar la Restricción de acceso directo al servidor con usuario root Nota: El control solo aplica para S.O Linux

**Por qué importa**: Evitar accesos directos con el superusuario

**Cómo cumplirlo**: La salida que genera la ejecución del shell jason deberá incluir el parámetro PermitRootLogin NO

---

#### `Google-Compute Engine VMs-110` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberá Configurar plantilla SUDO donde se defina los siguientes perfiles: Administración de usuarios Cambios de contraseña Cyberark Restricción SU Nota: El control solo aplica para S.O Linux

**Por qué importa**: Limitar privilegios a usuarios

**Cómo cumplirlo**: La salida que genera la ejecución del shell jason deberá incluir la configuración del archivo sudoers con los comandos requeridos

---

#### `Google-Compute Engine VMs-111` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberán configurar políticas de seguridad local para gestión de contraseñas

**Por qué importa**: Garantiza la robustez de contraseñas, así como su rotación

**Cómo cumplirlo**: Para Linux - adjuntando la salida que genera la ejecución del shell jason, que incluya los siguientes valores: PASS_MAX_DAYS 90 PASS_MIN_DAYS 0 PASS_MIN_LEN 16 PASS_WARN_AGE 7 Para Windows - configurando las políticas contenidas en el Manual de Configuración para Enrolamiento a Bóveda

---

#### `Google-Compute Engine VMs-105` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: El servidor deberá enviar al colector de LOGS aquellos correspondientes al ABC de usuarios y ACLs

**Por qué importa**: Permite identificar los movimientos generados relacionados con la gestión de usuarios y privilegios

**Cómo cumplirlo**: Adjuntando la imagen que muestre la configuración de este punto TotalPlay - 10.180.249.10 / 10.180.239.10 / 10.216.4.50 / 10.180.239.217

---

#### `Google-N2-4746` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: En el servidor ningún usuario deberá contar con permisos de root.

**Por qué importa**: Garantizar la Restricción de altos privilegios.

**Cómo cumplirlo**: Ningún usuario deberá tener UID0 ni con permisos de root en la plantilla de SUDO.

---

#### `Google-N2-4759` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberá tener restricción de acceso por IP.

**Por qué importa**: Controlar y limitar las conexiones autorizadas.

**Cómo cumplirlo**: Para Linux adjuntando la salida que genera la ejecución del Shell jason, que muestre el archivo hosts/hosts.allow/iptables Para Windows configurando las reglas de Firewall contenidas en el Manual de Configuración para Enrolamiento a Bóveda.

---

#### `Google-N2-4761` — Ponderación 5 · CyAAL IT

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deberá Configurar plantilla SUDO donde se defina los siguientes perfiles: Administración de usuarios Cambios de contraseña Cyberark Restricción SU Nota: El control solo aplica para S.O Linux.

**Por qué importa**: Limitar privilegios a usuarios.

**Cómo cumplirlo**: La salida que genera la ejecución del shell jason deberá incluir la configuración del archivo sudoers con los comandos requeridos.

---

#### `Google-Compute Engine VMs-3061` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Utilizar reglas de firewall como mecanismo primario para controlar el acceso de red a la instancia, autorizando accesos específicos cumpliendo con el principio de menor privilegio.

**Por qué importa**: Ayuda acotar los accesos a los recursos

**Cómo cumplirlo**: DSI valida con usuario de GCP

---

#### `Google-Compute Engine VMs-3062` — Ponderación 5 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se requiere validar que el elemento envía Logs a un servidor Syslog. Tanto del SO como del aplicativo

**Por qué importa**: En tener trazabilidad de todos los cambios que se lleguen a ejecutar en los elementos.

**Cómo cumplirlo**: Realizar configuración de syslog en elementos y compartir evidencia.

---

### Importantes (ponderación 3)

#### `Google-Compute Engine VMs-01` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Las opciones de SO son RHEL, SUSE y Windows, en caso de ocupar otra imagen se debe validar con el área de CSA.

**Por qué importa**: Compute Engine ofrece numerosas imágenes públicas preconfiguradas con sistemas operativos Linux o Windows compatibles. Usa estas imágenes de sistema operativo para crear y, luego, iniciar instancias. Compute Engine usa tu imagen seleccionada a fin de crear un disco de arranque persistente para cada instancia.

**Cómo cumplirlo**: Favor de revisar el documento en la sección de Ayuda para mayor referencia. https://cloud.google.com/compute/docs/images

---

#### `Google-Compute Engine VMs-02` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: El servicio no es para persistir datos, la persistencia se debe de realizar en servicios definidos para este fin como discos adicionales o servicios de bases de datos

**Por qué importa**: Compute Engine ofrece varios tipos de opciones de almacenamiento para tus instancias. Cada una de las siguientes opciones de almacenamiento tiene características únicas de precio y rendimiento: Disco persistente zonal: Almacenamiento en bloque eficaz y confiable Disco persistente regional: Almacenamiento en bloque regional replicado en dos zonas SSD local: almacenamiento en bloque local transitori

**Cómo cumplirlo**: Favor de consultar el manual en la sección de ayuda, en el se encuentra como cumplir el punto.

---

#### `Google-Compute Engine VMs-04` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deben mantener actualizado los parches. Este punto se cumple estando sin requerimiento de parches en el servicio de OS patch management.

**Por qué importa**: Usa la Administración de parches de SO para aplicar parches del sistema operativo en un conjunto de instancias de VM de Compute Engine. Las VM de larga duración requieren actualizaciones periódicas del sistema para proteger contra defectos y vulnerabilidades.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/os-patch-management

---

#### `Google-Compute Engine VMs-05` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se deben de actualizar las versiones de SO para cumplir con la definición de DSI. Este control sirve para que las versiones de SO que se usen tengan soporte y que dicha versión no cuente con vulnerabilidad crítica. Este punto se cumple teniendo un SO con soporte.

**Por qué importa**: Usa la Administración de parches de SO para aplicar parches del sistema operativo en un conjunto de instancias de VM de Compute Engine. Las VM de larga duración requieren actualizaciones periódicas del sistema para proteger contra defectos y vulnerabilidades.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/images/os-details

---

#### `Google-Compute Engine VMs-06` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Certificar la instancia de acuerdo a su función con el checklist de CSA vigente Este punto se cumple teniendo en los SO el porcentaje del CIS requeridos por DSI y estar registrado en IEECO.

**Por qué importa**: Sometemos nuestros productos a verificaciones independientes periódicas de los controles de seguridad, privacidad y cumplimiento, lo que nos permite obtener informes de auditoría y certificaciones para demostrar el cumplimiento. También creamos documentos de recursos y mapeos que te ayudarán con el cumplimiento para casos en los que no se requieran o no se puedan aplicar certificaciones formales.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/security/compliance

---

#### `Google-Compute Engine VMs-07` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Utilizar reglas de firewall como mecanismo primario para controlar el acceso de red a la instancia, autorizando accesos específicos cumpliendo con el principio de menor privilegio.

**Por qué importa**: Las reglas de firewall se definen a nivel de red y solo se aplican a la red en la que se crean sin embargo, el nombre que elijas para cada una de ellas debe ser exclusivo del proyecto y se debe poner una descripción referente a la funcionalidad o uso.. Para cada interfaz de red, Cloud Console enumera todas las reglas de firewall que se aplican a la interfaz y las reglas que están en uso. Las regla

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/vpc/docs/using-firewallslisting-rules-vm

---

#### `Google-Compute Engine VMs-08` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Usar cuentas de servicio de corta duración cuando el Engine necesite consumir otros servicios de GCP

**Por qué importa**: Una cuenta de servicio es un tipo especial de cuenta que usa una aplicación o carga de trabajo de procesamiento, como una instancia de máquina virtual VM de Compute Engine, en lugar de una persona.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/iam/docs/creating-short-lived-service-account-credentialshles-419

---

#### `Google-Compute Engine VMs-10` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Metadata accesible: Deshabilitada.

**Por qué importa**: gcloud compute instances remove-metadata puede ser usado para remover metadata de las instancias

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sdk/gcloud/reference/compute/instances/remove-metadata https://cloud.google.com/compute/docs/metadata/querying-metadata https://cloud.google.com/compute/docs/metadata/overview

---

#### `Google-Compute Engine VMs-11` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Activar protección contra terminación accidental

**Por qué importa**: Como parte de tu carga de trabajo, puede haber ciertas instancias de VM que sean críticas para ejecutar tu aplicación o servicios, como una instancia que ejecuta un servidor SQL, un servidor utilizado como administrador de licencias, etcétera. Es posible que estas instancias de VM deban permanecer en ejecución de forma indefinida, por lo que necesitas una forma de proteger estas VM para que no se 

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/instances/preventing-accidental-vm-deletion

---

#### `Google-Compute Engine VMs-12` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Registro de Tags: Ecosistema y área

**Por qué importa**: Las etiquetas son pares clave-valor que se pueden usar en Google Cloud para agrupar recursos relacionados o asociados. Por ejemplo, en Compute Engine, puedes usar etiquetas para agrupar las VM en categorías como producción, etapa de pruebas o desarrollo, de modo que puedas buscar recursos que pertenezcan a cada etapa de desarrollo

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/labeling-resources

---

#### `Google-Compute Engine VMs-13` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Generar alerta cuando: Una instancia sea creada Una instancia sea apagada Una instancia sea encendida Una instancia sea reiniciada

**Por qué importa**: Una política de alertas describe el conjunto de condiciones que quieres supervisar. Estas condiciones pueden relacionarse con el estado de una aplicación, el valor de una métrica del sistema o con el consumo de recursos. Por ejemplo, puede ser conveniente que una política supervise una verificación de tiempo de actividad o una que supervise el uso de la API de Cloud Monitoring. Una política de ale

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/monitoring/alerts/using-alerting-ui https://cloud.google.com/compute/docs/reference/rest/v1/instances

---

#### `Google-Compute Engine VMs-14` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Cuentas de servicio asociadas a instancias no deben tener acceso completo a la API

**Por qué importa**: El principio de privilegio mínimo POLP, también conocido como principio de autoridad mínima, es el concepto de seguridad de otorgar al usuario/sistema/servicio el conjunto mínimo de permisos necesarios para realizar con éxito sus tareas. El principio de privilegios mínimos evita una posible escalada de privilegios, se debe asegurar que las instancias de Google Compute Engine no estén configuradas 

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud Se debe revisar el Cloud API Access scope para determinar que los permisos asociados al service account por default no se puedan ocupar para elevar privilegios, en este ejemplo se revisa que en diversos servicios se encuentra deshabilitados y solo se tienen accesos a ciertos servicios con permisos específicos, cumpliendo con el principio del menor privilegio https://cloud.google.com/compute/docs/access/

---

#### `Google-Compute Engine VMs-15` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Las imágenes de disco no deben estar compartidas públicamente

**Por qué importa**: : Para evitar exponer datos confidenciales

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/imageshles_419

---

#### `Google-Compute Engine VMs-16` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Las instancias de máquinas virtuales no deben tener direcciones IP públicas

**Por qué importa**: Evita exponer IaaS y sufrir un ataque de infiltrado a recursos internos

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/ip-addresseshles-419externaladdresses

---

#### `Google-Compute Engine VMs-17` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Deshabilitar la eliminación automática para discos persistentes de instancias de VM

**Por qué importa**: Evita que se pueda eliminar el disco cuando se elimina la máquina virtual VM.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/sdk/gcloud/reference/compute/instances/set-disk-auto-delete

---

#### `Google-Compute Engine VMs-18` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Deshabilitar el IP Forwarding para instancias de máquinas virtuales

**Por qué importa**: Las instancias de VM solo puedan enviar paquetes cuyos orígenes están configurados para coincidir con una dirección IP interna de su interfaz en la red.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/vpc/docs/using-routescanipforward

---

#### `Google-Compute Engine VMs-19` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Desactivar la compatibilidad con la consola serial interactiva Interactive Serial Console Support

**Por qué importa**: Restringe el acceso a la VM para evitar el mal uso de la terminal o interactuar con cualquiera de los puertos en serie de la instancia

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/troubleshooting/troubleshooting-using-serial-consolehles-419disable_access

---

#### `Google-Compute Engine VMs-20` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Habilitar la función de seguridad Block Project-Wide SSH Keys

**Por qué importa**: En evitar que los usuarios accedan a instancias de máquina virtual VM mediante la eliminación y el bloqueo de claves SSH de las VM

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/connect/restrict-ssh-keys

---

#### `Google-Compute Engine VMs-21` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Habilitar la función de seguridad Shielded VM

**Por qué importa**: En ofrecer integridad verificable de las instancias de VM de Compute Engine, para que se pueda estar seguro de que las instancias no se expusieron a software malicioso o rootkits de nivel de inicio y kernel.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/shielded-vm/docs/shielded-vm

---

#### `Google-Compute Engine VMs-22` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Habilitar la función de computación confidencial para instancias de máquinas virtuales Confidential Computing for Virtual Machine Instances, siempre y cuando el modelo de instancia sea compatible.

**Por qué importa**: Confidential Computing es la protección de los datos en uso con entorno de ejecución confiable TEE basado en hardware

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/confidential-vm/docs/about-cvmhles-419

---

#### `Google-Compute Engine VMs-23` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Habilitar la función OS Login for GCP Projects

**Por qué importa**: Permite usar las funciones de administración de identidades y accesos IAM de Compute Engine para otorgar o revocar el acceso SSH a tus instancias de Linux. El Acceso al SO es una alternativa para administrar el acceso a instancias si agregas y quitas llaves SSH en los metadatos.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/oslogin/set-up-oslogin

---

#### `Google-Compute Engine VMs-24` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se debe usar el inicio de sesión del SO con autenticación 2FA para instancias de VM

**Por qué importa**: En agregar una capa de seguridad adicional mediante la verificación en dos pasos, también conocida como autenticación de dos factores o 2FA.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/compute/docs/oslogin/setup-two-factor-authenticationhles_419

---

#### `Google-Compute Engine VMs-25` — Ponderación 3 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Habilitar Virtual Machine Disk Encryption con Customer-Managed Keys

**Por qué importa**: En crear y administrar tus claves a través de Cloud Key Management Service. Las claves de encriptación administradas por el cliente se pueden almacenar como claves de software, en un clúster de HSM o de forma externa

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/storage/docs/encryption/customer-managed-keys

---

#### `Google-TODOS-1547` — Ponderación 3 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Security Groups Deben de ser acotados en orígenes, destinos y servicios

**Por qué importa**: Evita que se tenga acceso desde cualquier origen desconocido

**Cómo cumplirlo**: Adjuntar imagen de los Security Groups asociados

---

#### `Google-Compute Engine VMs-3064` — Ponderación 3 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Disco duro cifrado

**Por qué importa**: Robustecer la seguridad de la información almacenada

**Cómo cumplirlo**: Compartir evidencia de la configuración del apartado Disk

---

#### `Google-Compute Engine VMs-3065` — Ponderación 3 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Sin direccionamiento público expuesto en instancias virtuales

**Por qué importa**: En evitar IPs expuestas a internet

**Cómo cumplirlo**: Compartir evidencia del apartado de configuración EIP

---

### Otros

#### `Google-Compute Engine VMs-03` — Ponderación 4 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Se debe contar con monitoreo de vulnerabilidades y amenazas en Compute Engine

**Por qué importa**: Security Command Center te permite filtrar y ver las vulnerabilidades y los hallazgos de amenazas de muchas formas diferentes, como filtrar según un tipo de hallazgo específico, un tipo de recurso o un elemento específico. Cada fuente de seguridad podría proporcionar más filtros para ayudarte a organizar los hallazgos de tu organización.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/security-command-center/docs/concepts-security-sources

---

#### `Google-Compute Engine VMs-09` — Ponderación 4 · CSA

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Instalar agentes para registrar la actividad del sistema en el registro de eventos de Windows Ejemplo: Sysmon, Servicio de logs Ejemplo: Splunk y Threat Prevention: Deep Security según aplique en el SO

**Por qué importa**: El agente de Logging transmite registros de tus instancias de VM y de paquetes de software de terceros seleccionados a Cloud Logging. Se recomienda ejecutar el agente de Logging en todas las instancias de VM.

**Cómo cumplirlo**: Favor de revisar el documento que se encuentra en la sección de Ayuda - Ayuda- Manuales Cloud https://cloud.google.com/logging/docs/agent/logging/installation

---

#### `Google-Compute Engine VMs-3063` — Ponderación 4 · NetSec

- [ ] **Estado en G3**: pendiente · responsable: _________

- Tipo: Compute

**Qué exige**: Reglas de Firewall deben de ser acotados en orígenes, destinos y servicios No redes abiertas /0 No servicios ALL No redes abiertas /8, /16, /24 para puertos críticos 3389, 22, 23, 21

**Por qué importa**: Evita que se tenga acceso desde cualquier origen desconocido

**Cómo cumplirlo**: DSI revisa con usuario de GCP

---


## Verificación automatizada

Comandos de auditoría recomendados con `gcloud`:

```bash
# Listar recursos del servicio en el proyecto
gcloud asset search-all-resources \
  --asset-types="computeenginevms.googleapis.com/*" \
  --project=$PROJECT_ID
```

## Fuente de datos

Ver controles crudos en [`../data/controls-compute-engine-vms.json`](../data/controls-compute-engine-vms.json)

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-19 | Generado desde catálogo DSI |