# G3 Drive · Manual del operador

> Manual de uso de la app **G3 Drive** para conductores. Pensado para
> leerse en 30 minutos y consultarse rápido cuando ya estás en
> carretera. Versión 1.0 · 2026.

---

## Cómo usar este manual

- **Si es tu primer día con G3 Drive**, lee del 1 al 5 en orden.
- **Si ya la usas todos los días**, salta a la sección que necesites
  desde el [índice](#índice).
- **Si algo no funciona como dice este manual**, no asumas que tú te
  equivocaste — repórtalo (ver [§16 Soporte](#16-soporte)).

## Índice

1. [Lo que necesitas antes de empezar](#1-lo-que-necesitas-antes-de-empezar)
2. [Primer ingreso a la app](#2-primer-ingreso-a-la-app)
3. [Tu pantalla principal · el dashboard](#3-tu-pantalla-principal--el-dashboard)
4. [Un día completo con G3 Drive](#4-un-día-completo-con-g3-drive)
5. [Inspección pre-viaje · 12 puntos](#5-inspección-pre-viaje--12-puntos)
6. [Bitácora NOM-087 · horas de servicio](#6-bitácora-nom-087--horas-de-servicio)
7. [Evidencias con la cámara](#7-evidencias-con-la-cámara)
8. [Durante el viaje · ubicación y ETA](#8-durante-el-viaje--ubicación-y-eta)
9. [Llegada y entrega · firma POD](#9-llegada-y-entrega--firma-pod)
10. [Chat con dispatch](#10-chat-con-dispatch)
11. [Incidentes y SOS](#11-incidentes-y-sos)
12. [Tus pagos e ingresos](#12-tus-pagos-e-ingresos)
13. [Cuando no hay señal · modo offline](#13-cuando-no-hay-señal--modo-offline)
14. [Tu perfil y ajustes](#14-tu-perfil-y-ajustes)
15. [Problemas comunes y cómo resolverlos](#15-problemas-comunes-y-cómo-resolverlos)
16. [Soporte](#16-soporte)
17. [Glosario corto](#17-glosario-corto)

---

## 1. Lo que necesitas antes de empezar

### Antes de descargar

- **Tu nombre dado de alta por la empresa** en G3 (lo hace el
  dispatcher o el coordinador de operadores)
- **El número de teléfono que te registraron** o el correo electrónico
- **Tu licencia federal vigente** (la app te la va a pedir)

### Tu teléfono

- Mínimo **Android 10** o **iOS 14**
- **2 GB de RAM libre** (la app es ligera, no es el cuello)
- **Espacio: 200 MB** para la app + 1 GB recomendados para evidencias
  guardadas
- **Cámara funcional** — sin cámara, no puedes capturar evidencias
- **GPS activado** — necesario para registrar ubicación de eventos

### Permisos que la app va a pedir

Los pide al instalar o la primera vez que usas cada función. **No
hay nada raro** — solo lo mínimo para que tu trabajo quede registrado:

| Permiso | Para qué se usa |
|---|---|
| 📷 Cámara | Foto de recibos, carta porte, evidencias de entrega |
| 📍 Ubicación | Posición durante el viaje, foto con coordenadas |
| 💾 Almacenamiento | Guardar evidencias antes de subirlas |
| 🔔 Notificaciones | Avisos del dispatcher y de pagos liberados |
| 📞 Llamadas (opcional) | Llamar a soporte / dispatch desde la app |

**Si rechazas un permiso**, la función específica deja de funcionar.
Puedes activarlo después desde Ajustes del teléfono → G3 Drive.

---

## 2. Primer ingreso a la app

### Onboarding (4 pantallas)

Cuando abres la app por primera vez ves **4 pantallas de bienvenida**:

1. **Tu unidad operativa, en el bolsillo** — qué es G3 Drive
2. **Bitácora sin papel** — cómo se reemplaza la libreta
3. **Mapa en vivo** — el dispatcher te ve en tiempo real
4. **Cobros más rápidos** — cómo se libera el pago

Puedes **saltar** en cualquier momento (botón arriba a la derecha) o
ir paso a paso con **Continuar**.

### Iniciar sesión

Hay 2 formas. La que tu empresa te asignó:

#### Con teléfono (recomendado)

1. Selecciona país: **🇲🇽 +52** (sale por default)
2. Escribe tu número de **10 dígitos** sin espacios
3. Toca **Continuar**
4. Te llega un **código de 6 dígitos por SMS**
5. Escribe el código en las 6 casillas
6. Si tarda, espera 42 segundos y toca **Reenviar**

> **Si no te llega el SMS** después de 1 minuto: revisa que el número
> sea el correcto, que tengas señal, y que tu plan no esté
> restringiendo SMS internacionales. Si todo está bien, llama a tu
> dispatcher para que verifique tu alta.

#### Con correo y contraseña

1. Toca **Continuar con correo** abajo del botón principal
2. Escribe tu **correo electrónico** (ej. pedro@miempresa.mx)
3. Escribe tu **contraseña**
4. Toca **Iniciar sesión**

**Olvidaste tu contraseña?** Toca el enlace, escribe tu correo y
te llega un link para crear una nueva. El link **dura 24 horas**.

---

## 3. Tu pantalla principal · el dashboard

Después de iniciar sesión llegas al **Dashboard**. Esto es lo que
ves en orden de arriba abajo:

```
┌─────────────────────────────┐
│ Hola, Pedro                 │  ← saludo + tu nombre
│ Bitácora              🔔 ●3 │  ← 3 notificaciones sin leer
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ VIAJE ACTIVO            │ │  ← si tienes un viaje asignado
│ │ G3-2026-00134           │ │     aparece este bloque naranja
│ │ CDMX → Monterrey        │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Próxima acción              │  ← qué te toca hacer ahora
│ ▸ Inspección pre-viaje      │     (cambia según el estado)
├─────────────────────────────┤
│ Eventos hoy                 │  ← cosas que ya registraste
│ ⛽ Diesel · 180L      $4,860│
│ 🚧 Caseta 95         $340   │
├─────────────────────────────┤
│ [+ Registrar evento ]       │  ← botón grande naranja
└─────────────────────────────┘
```

### Las 3 zonas importantes

- **Bloque del viaje activo (naranja)**: tócalo para abrir el detalle
- **Próxima acción**: te dice qué te falta hacer (inspección,
  llegada, evidencia de entrega…) — actúa como guía
- **Botón naranja grande**: con eso registras gasto, caseta o nota

### Notificaciones (campana arriba derecha)

Toca la **🔔** para ver tus notificaciones. Hay 3 tipos:

| Tipo | Ejemplo |
|---|---|
| 📦 **Viaje** | "Viaje asignado · G3-2026-00135" |
| 💰 **Pago** | "$18,500 liberados · G3-2026-00133" |
| ⚠️ **Documento** | "Licencia federal vence en 14 días" |

Las del tipo **documento** son las que más importan revisar — si tu
licencia o examen médico vence, no puedes salir a viaje.

---

## 4. Un día completo con G3 Drive

Para que veas cómo se usa, así se ve un día típico de viaje
CDMX → Monterrey:

```
06:00  Llegas al patio
       Abres G3 Drive · Dashboard muestra el viaje asignado

06:10  Inspección pre-viaje
       12 puntos · foto + OK/Falla por cada uno
       (ver §5)

06:30  Sales del patio
       App registra hora y ubicación automáticamente
       Estado del viaje: en tránsito

07:18  Caseta 95
       Toca "+ Registrar evento" · selecciona 🚧 Caseta
       Escribe $340 · foto opcional del recibo

09:30  Carga diesel
       Toca "+ Registrar evento" · selecciona ⛽ Diesel
       Foto del recibo · OCR captura monto y litros solos

10:42  Dispatcher pregunta cómo vas
       Chat suena · respondes con ubicación en vivo

11:05  Tope no marcado en Sayula
       Toca "Reportar incidencia" · tipo: Demora en ruta
       Incident_create envía a admin

14:30  Llegas a Monterrey
       Toca "Marcar como llegué" en el viaje
       App pide foto de la carta porte sellada

14:45  POD digital
       Cliente firma con el dedo en la pantalla
       Cierras el viaje · se notifica al admin

15:00  Admin libera el pago
       Te llega notificación: "$18,500 liberados"
```

**Total de tiempo dentro de la app durante el día: ~5 minutos.**
El resto del tiempo estás manejando.

---

## 5. Inspección pre-viaje · 12 puntos

**Cuándo se hace**: antes de salir del patio, siempre.

**Por qué importa**: si pasa algo en carretera y no había
inspección, no estás protegido. Y si la unidad falla por algo que
debió revisarse antes, la responsabilidad es nuestra colectivamente.

### Paso a paso

1. Desde el dashboard, toca **Próxima acción · Inspección pre-viaje**
2. Ves la lista de **12 puntos** con progreso (0/12 al inicio)
3. **Toca cada punto** para abrirlo (el actual queda con borde naranja)

### En cada checkpoint

```
┌─────────────────────────────┐
│ ← Inspección                │
├─────────────────────────────┤
│ PUNTO 3 / 12                │
│                             │
│ Luces                       │
│ Revisa todas las luces      │
│ externas: delanteras,       │
│ traseras, direccionales.    │
│                             │
│ ┌─────────────────────────┐ │
│ │       📷                │ │  ← toca para foto
│ │   Toma una foto         │ │
│ └─────────────────────────┘ │
│                             │
│ ESTADO                      │
│ [ ✓ OK ]   [ ⚠ Falla ]      │  ← selecciona uno
│                             │
│ [ Siguiente punto → ]       │
└─────────────────────────────┘
```

### Los 12 puntos

| # | Punto | Qué revisar |
|---|---|---|
| 1 | Llantas delanteras | Profundidad mín 4 mm, presión, golpes |
| 2 | Llantas traseras | Mismo + revisar pares |
| 3 | Luces | Cuartos, altas, bajas, frenos, direccionales |
| 4 | Frenos | Aire, pedal, manguera, fugas |
| 5 | Aceite y niveles | Motor, dirección, refrigerante |
| 6 | Combustible | Cuánto cargas, lectura inicial del odómetro |
| 7 | Cabina | Cinturones, vidrios, espejos, asiento |
| 8 | Carga | Estiba, lonas, sellos (si caja seca) |
| 9 | Documentos unidad | Tarjeta de circulación, póliza vigente |
| 10 | Documentos operador | Licencia, examen médico vigentes |
| 11 | Extintor y botiquín | Carga, sellos, vigencia |
| 12 | Aspecto exterior | Daños previos, fotos para evidencia |

### Si encuentras una falla

- Marca **⚠ Falla** en el checkpoint
- La app pide que **describas brevemente** qué pasó
- Toma **foto obligatoria**
- El dispatch recibe la alerta y decide:
  - Si es menor → te autoriza salir y se programa servicio
  - Si es mayor → cambian la unidad o se reagenda el viaje

**No salgas con fallas mayores ocultadas**. Es tu seguridad y la de
otros en la carretera. La empresa entiende reagendar — no entiende
accidentes evitables.

---

## 6. Bitácora NOM-087 · horas de servicio

La bitácora es el **documento oficial** que la SCT y Policía Federal
pueden inspeccionarte en retén. Su formato lo manda la
**NOM-087-SCT-2-2017** (Norma Oficial Mexicana de tiempos de
conducción y pausas). Antes era libreta de papel; G3 Drive la lleva
sola y al final genera el PDF oficial que firmas y entregas.

> **Tu trabajo principal**: ninguno. La app captura todo automático.
> Tu trabajo solo aparece en momentos puntuales: declarar qué estás
> haciendo cuando no estás manejando, y registrar casos especiales.

### Las 5 categorías de la bitácora

Cada hora del día cae en **una de estas 5**:

| Categoría | Cuándo aplica |
|---|---|
| **CONDUCIENDO** | Estás manejando · la app lo detecta sola por GPS |
| **PAUSA** | Estás detenido sin actividad declarada (≤30 min) |
| **ACTIVIDADES AUXILIARES** | Cargando, descargando, llenando diesel, en retén, trámites |
| **CASOS DE EXCEPCIÓN** | Algo extraordinario: accidente, avería, bloqueo, clima |
| **DESCANSO** | Tu descanso oficial (ideal 8h continuas entre turnos) |

### Pantalla de bitácora del día

Desde el dashboard toca **Bitácora del día**:

```
┌─────────────────────────────────────┐
│ ← Bitácora · DÍA 1                  │
│ MIE 28 MAY 2026                     │
├─────────────────────────────────────┤
│ CONDUCIENDO     06:00 ━━━━━━━━━ 14h│
│ PAUSA                              .│
│ AUX                          .  .  .│
│ EXCEPCIÓN                           │
│ DESCANSO   ━━━━━                    │
│        0   6   12   18   24         │
├─────────────────────────────────────┤
│ Conduciendo:        7h 15min        │
│ Pausa:              1h 30min        │
│ Auxiliares:         2h 00min        │
│ Descanso:           8h 00min        │
│ Excepciones:        0h 00min        │
├─────────────────────────────────────┤
│ ✓ Cumple NOM-087 al 100%            │
└─────────────────────────────────────┘
```

Las barras horizontales muestran **24 horas** de tu día. Cada
categoría tiene su renglón.

### Registrar evento (la versión NOM-087)

Toca el botón naranja **+ Registrar evento**. Ahora hay más
opciones, cada una se clasifica automáticamente:

| Evento | Categoría NOM-087 | Cuándo lo usas |
|---|---|---|
| ⛽ Carga de combustible | AUXILIAR | Cargaste diesel — registras monto y litros |
| 🚧 Caseta / peaje | (sigue conduciendo) | Solo es gasto, no cambia tu estado |
| 🍔 Comida | PAUSA | Te paraste a comer — cuenta hacia tu pausa obligatoria |
| 📦 Inicio de carga | AUXILIAR | Empezaste a cargar la mercancía |
| ✓ Fin de carga | (vuelves a conducir) | Terminaste de cargar |
| 📤 Inicio de descarga | AUXILIAR | Empezaste a descargar |
| ✓ Fin de descarga | (vuelves a conducir) | Terminaste de descargar |
| 🛑 Retén / Inspección | AUXILIAR | G.N. / F.G.R. / SEDENA te detuvo |
| 💤 Iniciar descanso | DESCANSO | Vas a descansar formalmente (mín 30 min, ideal 8h) |
| ▲ Avería del vehículo | EXCEPCIÓN | El tracto se descompuso (ver §6.4) |

### 6.1 · Las reglas que la app hace cumplir

La NOM-087 dice exactamente cuántas horas puedes manejar y cuándo
debes pausar. No las recuerdas tú — **te las recuerda la app**.

#### Pausa de 30 min cada 5 horas

Si llevas **5 horas continuas conduciendo**, debes pausar 30 min.
Esto no se puede acumular: una pausa de 15 min ahora + otra de 15
min después **no cuenta**.

La app te avisa:

| Tiempo | Aviso |
|---|---|
| 4h 30min | 🟡 "30 min más y debes hacer pausa por NOM-087" |
| 4h 50min | 🟠 "Pausa obligatoria en 10 min" |
| 5h 00min | 🔴 **Pantalla bloqueante** — no puedes seguir conduciendo |

#### Máximo 14 horas en 24 horas

No puedes manejar más de **14 horas en un día**. Es ley.

| Tiempo | Aviso |
|---|---|
| 12h | 🟡 "Quedan 2 horas — empieza a buscar lugar de descanso" |
| 13h | 🟠 "Queda 1 hora — encuentra patio o gasolinera segura" |
| 14h | 🔴 **Bloqueo total** — debes iniciar descanso de 8h continuas |

#### 8 horas de descanso continuas

Antes de un nuevo turno que requiera 14h de conducción, debes
descansar **8 horas continuas** (no fraccionadas).

La app verifica esto al asignarte un viaje nuevo. Si no cumples,
**avisa al dispatcher antes de salir**.

### 6.2 · Pantalla de pausa obligatoria

Cuando llegas a 5h continuas, esta pantalla **bloquea todo**:

```
┌─────────────────────────────────────┐
│            ⏸️  PAUSA                 │
│         OBLIGATORIA                 │
│                                     │
│   Has conducido 5h continuas.       │
│   Por NOM-087 debes pausar 30 min.  │
│                                     │
│         ┌───────────┐               │
│         │   30:00   │               │ ← contador en vivo
│         └───────────┘               │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ ⚠ Reportar Caso de Excepción│   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Qué hacer**:
- Estaciona en lugar seguro
- Apaga motor y descansa 30 min completos
- La app vibra cada 5 min para confirmar que no te dormiste
- Cuando termine el contador, regresa al dashboard normal

**Si tienes una emergencia real** (vas escapando de algo, te
persiguen, falla mecánica grave), toca **Reportar Caso de Excepción**
— ahí explicas qué pasa.

### 6.3 · Casos de Excepción

La norma reconoce que **a veces no puedes cumplir** las reglas
porque hay algo extraordinario. Los **Casos de Excepción** son:

- 🚨 **Percance vial** (accidente — el tuyo o uno que presencias)
- ▲ **Avería del vehículo** (descompostura grave)
- 🚧 **Bloqueo carretero** (manifestación, accidente cerrando la vía)
- 🌪️ **Eventos climatológicos** (huracán, granizada, tormenta de
  arena, niebla extrema)
- ✏️ **Otros** — siempre con descripción escrita

Para registrar uno:

1. Desde la bitácora toca **+ Caso de Excepción**
2. Selecciona el **tipo**
3. **Describe** lo que pasa (mínimo 1 línea, sé claro)
4. **Foto obligatoria** — la app no te deja avanzar sin foto
   (la NOM-087 exige "evidencia documental")
5. La hora y ubicación se sellan automáticamente
6. Toca **Reportar ahora**

El dispatcher y el admin reciben la alerta inmediato.

> **No abuses de los casos de excepción**. Si los usas para evitar
> la pausa de 30 min sin razón real, la SCT lo nota en auditoría.
> Solo cuando hay emergencia real.

### 6.4 · Exportar la bitácora (PDF oficial)

Al cierre del viaje, generas el **PDF oficial NOM-087**:

1. Desde la bitácora toca **Exportar**
2. Confirma el periodo (1 o 2 días)
3. La app muestra una **vista previa** del PDF
4. Toca **Generar PDF oficial**
5. **Firma con el dedo** en el espacio del conductor
6. El PDF se guarda y se envía al admin

El PDF que genera la app es **idéntico al formato oficial** que
manda la NOM-087. Tiene:

- Datos del permisionario, del vehículo y tuyos
- Grid 24h × 5 categorías para 1 o 2 días
- Eventos puntuales con sus símbolos oficiales
- Casos de Excepción totalizados con su evidencia
- Tu firma digital + firma del responsable
- **QR code** que el inspector puede escanear para verificar
  autenticidad contra el sistema

**En retén te lo van a pedir**: tienes el PDF en la app (Bitácora →
Historial → toca el día → Compartir). Lo enseñas desde el celular o
lo imprimes si tienes oportunidad.

### 6.5 · Gastos que no son NOM-087

Los gastos puros (casetas, comida, propinas, refacciones pequeñas)
**siguen ahí** dentro del módulo Bitácora — sirven para el
seguimiento del costo del viaje y para que el admin libere tu pago.
Pero **no afectan tu estado regulatorio**.

### Lo que pasa cuando no hay señal

La bitácora sigue funcionando offline. La app guarda todo
localmente y sincroniza cuando vuelva la red. Ver
[§13 · Modo offline](#13-cuando-no-hay-señal--modo-offline).

---

## 7. Evidencias con la cámara

Hay 3 momentos donde la cámara es protagonista:

### A. Recibos (gasolina, casetas)

Ya cubierto en §6. La cámara abre automáticamente cuando registras
un evento de gasto.

### B. Carta porte y comprobantes

Cuando el cliente te entrega la **carta porte sellada** al cargar
o descargar:

1. Desde el detalle del viaje, toca **Subir evidencia**
2. La cámara abre con **guías en las esquinas** del marco
3. Coloca el documento **dentro del marco** — la app lo detecta
4. **Toma la foto** con el botón blanco grande
5. **Revisa** — si quedó borrosa, toca **Retomar**
6. Confirma con **Usar foto**

### C. Daños o evidencias de incidente

- Para reportar daño previo a la unidad (durante la inspección
  pre-viaje)
- Para evidencia de un incidente en carretera (en
  [§11](#11-incidentes-y-sos))

### Consejos para fotos útiles

- **Buena luz** — si está oscuro, prende el flash 🔆 (icono arriba)
- **Documento completo** — que se vea de borde a borde, no solo el
  centro
- **Texto legible** — si no se lee, no sirve como evidencia legal
- **Sin manos en la foto** — si necesitas sujetar, recarga el
  documento contra algo

### Scanner QR

Algunos clientes manejan **códigos QR** en sus puntos de carga y
descarga. Cuando llegues a un patio con código QR:

1. Desde el viaje toca **Escanear QR**
2. La cámara abre en modo escáner (las esquinas se ven naranja)
3. **Apunta al código** — escanea automático cuando lo detecta
4. La app confirma con un sonido ✓ y registra entrada/salida

---

## 8. Durante el viaje · ubicación y ETA

### Cuando arrancas

Al salir del patio, la app **automáticamente** marca:

- Hora de salida
- Coordenadas GPS
- Lectura inicial del odómetro (si la capturaste en la inspección)

Tú no haces nada — solo tienes que tener **GPS activado** y la
app abierta (puede estar en background).

### Mapa en vivo (planes Pro+)

Si tu empresa tiene plan Pro o superior:

- Dispatch ve tu posición en tiempo real
- El cliente del flete también puede ver el viaje (si el dispatcher
  lo comparte)
- Cuando saltes un desvío, aparece una **alerta automática** en
  admin

**Privacidad**: el GPS solo registra durante viajes activos. **Al
cerrar el viaje, deja de transmitir**. La empresa no te rastrea en
tu tiempo libre.

### Compartir ubicación en vivo desde el chat

Si dispatch te pide "¿dónde vas?", tienes 2 formas de responder:

1. Texto: "Voy en Querétaro km 95"
2. **Ubicación en vivo** (más útil): toca 📍 en el chat → confirma →
   dispatch ve tu posición moverse en su mapa

La ubicación se comparte **por 30 minutos** y se detiene sola. Puedes
extenderla o cancelarla cuando quieras.

### ETA dinámico

El **ETA (Estimated Time of Arrival)** se calcula en el servidor
con tu posición, velocidad promedio y rutas conocidas. **No es una
adivinanza** — se actualiza cada 60 segundos.

Si dispatch te dice "tu ETA dice 17:30, ¿es real?", la respuesta
correcta es **sí, a menos que haya algo que el sistema no sepa**
(bloqueo, retén, falla).

---

## 9. Llegada y entrega · firma POD

POD significa **Proof of Delivery** — acuse de entrega.

### Al llegar al destino

1. Reduce velocidad y estaciona en lugar seguro
2. En el viaje, toca **Marcar como llegué**
3. La app registra hora y coordenadas
4. **Espera** mientras coordinan la descarga (usa el chat con
   dispatch si tarda mucho)

### Después de descargar

1. Pide al cliente que **firme la carta porte** (papel) y la selle
2. En la app, abre el viaje → **Cerrar viaje** → **Acuse de entrega**
3. Llena los datos:
   - **Recibe** (nombre completo de quien recibió)
   - **Foto del sello de la carta porte** (que se lea claramente)
   - **Firma con el dedo** sobre el espacio en blanco

```
┌─────────────────────────────┐
│ FIRMA                       │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │     ~~~~~~~~~~~~~       │ │  ← el cliente firma aquí
│ │   ~~     con el dedo    │ │
│ │                         │ │
│ └─────────────────────────┘ │
│   [ Confirmar entrega ]     │
└─────────────────────────────┘
```

4. Toca **Confirmar entrega** — el viaje pasa al estado `delivered`
5. **El admin recibe notificación inmediata** para autorizar tu pago

### Si el cliente no quiere firmar en la app

Acepta firma en papel **siempre**. Toma **foto clara** del documento
firmado y súbela como evidencia. Esto es válido.

---

## 10. Chat con dispatch

El chat se ve como WhatsApp porque está diseñado para que ya sepas
usarlo desde el primer día.

### Cuándo usarlo

| Sí usa el chat | No uses el chat |
|---|---|
| Dudas durante el viaje | Emergencias graves (usa SOS) |
| Avisos de demora | Detalles del pago (ve a Pagos) |
| Confirmar instrucciones | Chistes / contenido personal |
| Compartir ubicación con dispatch | Promociones / cadenas |
| Reportar problemas menores | Reclamos formales |

### Tipos de mensaje

- **Texto** — el normal
- **Foto** — toca 📷, abre cámara o galería
- **Ubicación en vivo** — toca 📍, dura 30 min
- **Audio** — mantén presionado el micrófono 🎙️

### Indicadores

- 🟢 **En línea** — el dispatcher está activo
- ⚪ **Visto** — leyó tu mensaje pero no ha respondido
- 🟠 **3** (badge naranja) — tienes 3 mensajes sin leer

### Conversaciones múltiples

Puedes tener varias conversaciones activas:

- **Dispatch** (el principal)
- **Admin** (cuando hay algo escalado)
- **Otros operadores** (si tu empresa lo permite)

Cada uno aparece en la lista de mensajes.

---

## 11. Incidentes y SOS

Hay **2 niveles** muy diferentes:

### Incidente normal (no urgente)

Para reportar cosas que pasaron pero no son emergencia:

- Demora en patio del cliente
- Falla mecánica menor
- Cambio de ruta no planeado
- Problema con la carga

#### Cómo reportarlo

1. Desde el dashboard o el viaje, toca **Incidencias**
2. Toca el botón **+** abajo a la derecha
3. Selecciona el **tipo**:
   - ⚠️ Falla mecánica
   - 🚧 Demora en ruta
   - 📦 Problema con la carga
   - 🛡️ Seguridad
   - Otro
4. **Describe** lo que pasó (mínimo 1 línea, sé claro)
5. **Foto opcional** — si aplica
6. Toca **Reportar ahora**

El admin recibe la alerta y te contacta por chat si necesita más
info.

### SOS · solo emergencias

El **botón SOS** es para emergencias reales:

- Accidente (tuyo o que presencias)
- Intento de robo / asalto
- Falla mecánica grave en carretera peligrosa
- Crisis médica del operador
- Cualquier cosa donde necesites ayuda inmediata

#### Cómo usarlo

El SOS está **siempre accesible** desde el menú inferior — no
necesitas buscarlo.

```
┌─────────────────────────────┐
│           SOS               │
│                             │
│         ┌───────┐           │
│         │       │           │
│         │  🆘   │  ← mantén presionado 3 seg
│         │       │
│         └───────┘
│                             │
│ Mantén presionado           │
│ 3 segundos para enviar SOS  │
└─────────────────────────────┘
```

1. Toca **SOS** desde el menú
2. **Mantén presionado** el botón rojo grande
3. Cuenta **3 segundos** (la app muestra contador)
4. Al soltar, el SOS **se dispara automáticamente**:
   - Notifica a **Dispatch** + **Admin** + **Seguridad**
   - Comparte **tu ubicación en vivo**
   - Activa **grabación de audio** ambiente (si el teléfono lo permite)

**¿Por qué 3 segundos?** Para evitar SOS por accidente (que el
teléfono se aprete en el bolsillo). El primer paso es confirmar que
es real.

#### Después de un SOS

- Te llaman **dentro del primer minuto**
- Si no contestas, **se considera emergencia confirmada** y se activan
  protocolos
- **No canceles el SOS** a menos que sea claramente un error — mejor
  que se active de más a que no se active cuando se necesita

---

## 12. Tus pagos e ingresos

### Pantalla de ingresos

Desde el menú toca **Ingresos** o **Pagos**:

```
┌─────────────────────────────┐
│ MAYO 2026                   │
│                             │
│ $58,400                     │  ← ingreso del mes
│ +18% vs abril               │
│ 9 viajes liberados ✓        │
├─────────────────────────────┤
│ Liberados        $58,400    │  ← ya cobrados
│ 9 viajes         (verde)    │
│                             │
│ Pendientes       $22,100    │  ← por autorizar
│ 2 viajes         (ámbar)    │
└─────────────────────────────┘
```

### Detalle de un pago

Toca cualquier pago para ver:

- **Monto exacto**
- **Folio del viaje** asociado
- **Ruta** (origen → destino)
- **Distancia recorrida**
- **Quién autorizó** el pago (admin/owner)
- **Fecha y hora** de liberación
- **Referencia bancaria** (para casarlo con tu nómina)

### Cuándo se libera el pago

El admin lo libera **después de revisar**:

1. Que la entrega esté confirmada (POD con firma o foto)
2. Que las evidencias del viaje estén subidas
3. Que no haya incidencias sin resolver

**Tiempo promedio**: 24-48 horas después de cerrar el viaje. Si pasa
más, pregúntale al dispatcher por qué.

### Si crees que falta un pago

1. Verifica en **Pagos** que el viaje no esté en pendiente
2. Si está como liberado pero no llegó a tu cuenta, **toca el pago**
   → comparte la referencia bancaria con tu nómina
3. Si está pendiente por más de 1 semana sin razón, abre incidencia
   tipo **Problema con pago**

---

## 13. Cuando no hay señal · modo offline

México tiene zonas serranas, túneles, autopistas sin cobertura.
G3 Drive **funciona offline** para que no pierdas información.

### Qué funciona sin señal

- ✅ Abrir la app
- ✅ Ver tu viaje activo
- ✅ Registrar eventos de bitácora
- ✅ Tomar fotos de evidencias
- ✅ Marcar checkpoints de inspección
- ✅ Ver tus pagos previos (los que ya descargaste)

### Qué NO funciona sin señal

- ❌ Mapa en vivo (necesita data)
- ❌ Chat con dispatch
- ❌ Recibir nuevos viajes asignados
- ❌ Ver ingresos actualizados al día
- ❌ Botón SOS (intenta pero puede fallar si no hay red)

### La pantalla de pendientes

Cuando estás offline, en el dashboard aparece arriba un aviso:

```
⚠ Sin conexión
4 eventos esperando
```

Toca el aviso para abrir **Pendientes por sincronizar**:

```
┌─────────────────────────────┐
│ Pendientes por sincronizar  │
├─────────────────────────────┤
│ Evento de bitácora          │
│ Diesel · 180L · 09:30    🟠 │
├─────────────────────────────┤
│ Foto evidencia              │
│ Carta porte · 11:15      🟠 │
├─────────────────────────────┤
│ Punto de inspección         │
│ Luces · OK               🟠 │
├─────────────────────────────┤
│ [ Reintentar sincronización]│
└─────────────────────────────┘
```

### Qué pasa cuando vuelve la señal

- La app **sincroniza sola** en cuanto detecta red
- Los puntos naranjas pasan a **verdes ✓** uno por uno
- Recibes notificación: "**4 eventos sincronizados**"
- Si algún evento falla, queda en la lista para reintento manual

### No borres la app si tienes pendientes

Si por alguna razón tienes que reinstalar G3 Drive, **espera a
estar con señal y sincronizar todo primero**. Si borras la app con
eventos pendientes, **se pierde la información**.

---

## 14. Tu perfil y ajustes

### Perfil

Desde el menú toca **Perfil**. Ves:

- **Tu foto** (la pones desde Ajustes)
- **Nombre completo**
- **Empresa** a la que perteneces
- **Licencia federal**: número y vigencia (en verde si está
  vigente, ámbar si está por vencer en 30 días, rojo si ya venció)
- **Score de seguridad**: 0 a 10, calculado por tu historial
- **Viajes acumulados** y **kilómetros**
- **Posición en ranking**: si eres top 10%, te aparece visible

### Ajustes

Desde el menú toca **Ajustes**. Las secciones:

#### Notificaciones

Activa o desactiva cada tipo:

- Viaje asignado ✓
- Pago liberado ✓
- Mensaje de dispatch ✓
- Documento por vencer ✓
- Promociones ✗ (desactivada por default, no hay)

#### Idioma

- Español (México) — default
- Inglés — para operadores bilingües
- Más en el futuro

#### Privacidad

- Permisos del dispositivo (cámara, ubicación, etc.)
- Política de privacidad completa
- Solicitar borrado de mis datos (LFPDPPP)

#### Cuenta

- Cambiar contraseña
- Cambiar foto de perfil
- Cerrar sesión

#### Acerca de

- Versión de la app (ej. 1.0.0)
- Build (ej. 1024)
- Ver cambios recientes
- Soporte: enlaces a chat y correo

---

## 15. Problemas comunes y cómo resolverlos

### La app no abre

1. **Cierra completamente** (desliza desde apps recientes)
2. Vuelve a abrir
3. Si sigue, **reinicia el teléfono**
4. Si sigue, **revisa actualización** en la tienda de apps
5. Si sigue, llama a soporte

### No me llega el SMS del código

- Verifica el **número** que pusiste (los 10 dígitos correctos)
- Espera **1 minuto completo** — algunas operadoras tardan
- Revisa que tu **plan tenga SMS**
- Si nada, contacta a tu **dispatcher** para que verifique tu alta

### El GPS no marca mi ubicación

1. Abre **Ajustes del teléfono** → **G3 Drive** → **Permisos**
2. Verifica que **Ubicación** esté en **Permitir siempre** (no
   "solo al usar")
3. Verifica que **el GPS del teléfono** esté activado (en el panel
   de notificaciones)
4. Si estás en zona cerrada (túnel, gasolinera con techo), sal a
   cielo abierto

### La cámara queda en blanco

- Cierra la app, **revoca y vuelve a dar permiso** de cámara
- Reinicia el teléfono
- Verifica que no haya **algo tapando** el lente (calcomanía,
  funda mal puesta)

### La foto sale oscura

- Activa el **flash** (icono ⚡ arriba)
- Coloca el documento bajo **mejor luz**
- Toca la pantalla **sobre el documento** — enfoca y ajusta
  exposición
- Si el ambiente es muy oscuro, busca luz indirecta (no apuntar
  flash directo al papel, da reflejo)

### El OCR no leyó bien mi recibo

- Toma de nuevo la foto con **mejor encuadre** y luz
- Si igual no funciona, **edita los campos a mano** (la app lo
  permite)
- Avisa al dispatcher si el OCR falla mucho — es señal de que
  hay que reportar el bug

### No puedo cerrar el viaje

- Verifica que tengas:
  - Foto de la carta porte sellada
  - Nombre de quien recibió
  - Firma o foto del documento firmado
- Si falta uno, la app te lo dice arriba en rojo

### No me llegó el pago

Ver [§12 · Si crees que falta un pago](#12-tus-pagos-e-ingresos).

### La app va lenta

- Cierra otras apps en segundo plano
- Revisa que tengas **al menos 1 GB de espacio libre**
- Limpia caché: **Ajustes → G3 Drive → Liberar espacio**
- Si va lento solo con poca señal, es normal

### Olvidé mi contraseña y no me llega el correo de recuperación

- Revisa **carpeta de spam** o **promociones**
- Espera **5 minutos** (a veces el correo tarda)
- Si nada, llama a **soporte** con tu número de teléfono — te
  pueden hacer reset manual

---

## 16. Soporte

### Soporte de tu empresa (G3 Logistics)

Primero contacta:

- **Dispatcher** — para dudas operativas, asignaciones, pagos
- **Coordinador de operadores** — para temas de contrato,
  capacitación, equipo

### Soporte técnico de G3 Drive

Cuando el problema es de la app:

| Canal | Cuándo |
|---|---|
| 💬 Chat en la app (Ajustes → Soporte) | Dudas no urgentes |
| 📧 soporte@g3logistics.mx | Dudas con captura adjunta |
| 📞 +52 55 5555 0000 | Urgencias técnicas, 8 a 22 hrs |
| 🚨 SOS desde la app | Emergencias operativas (no app) |

### Tiempos de respuesta

- Chat / correo: **< 4 horas hábiles**
- Llamada: **inmediato**
- SOS: **< 60 segundos** (estamos diseñados para eso)

---

## 17. Glosario corto

| Término | Qué significa |
|---|---|
| **Bitácora** | Registro de todos los gastos y eventos del viaje |
| **POD** | Proof of Delivery — acuse de entrega con firma |
| **OCR** | Optical Character Recognition — la IA lee texto en fotos |
| **ETA** | Estimated Time of Arrival — hora estimada de llegada |
| **Folio** | Identificador único de tu viaje: G3-AAAA-NNNNN |
| **Dispatch** | El despachador / coordinador del viaje en oficina |
| **Owner** | Dueño de la flota |
| **Tier / Plan** | Nivel de suscripción de tu empresa (Free, Starter, Pro…) |
| **Sincronizar** | Subir los datos guardados localmente al servidor |
| **Modo offline** | Cuando la app funciona sin internet |
| **Checkpoint** | Cada uno de los 12 puntos de inspección pre-viaje |

---

## Versiones de este manual

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-05-19 | Manual inicial — 17 secciones |

**G3 Logistics** · g3logistics.mx · soporte@g3logistics.mx
