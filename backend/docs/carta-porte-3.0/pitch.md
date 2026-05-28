# Pitch comercial · Carta Porte 3.0

> Cómo vender el módulo de Carta Porte 3.0 al transportista
> mexicano. Lenguaje del sector (sin tecnicismos), enfoque en
> dolor concreto, cierre con garantía.

## Posicionamiento de una frase

> **"Tu carta porte sale bien la primera vez. Garantizada
> por SAT, o no te la cobramos."**

## Audiencia

**Comprador primario**: dueño de flotilla (3-30 unidades) que ya
emite CFDI por su cuenta o paga a contador externo. Frustrado
porque cada cambio del SAT le pega.

**Comprador secundario**: contador o administrador interno que
maneja la facturación. Aliado del cierre.

## El dolor (cómo lo decimos en voz)

> Cada año el SAT cambia el complemento Carta Porte. CONTPAQi y
> tu PAC tardan 3-6 meses en actualizar. Mientras tanto:
>
> - Tu cliente no acredita IVA → no te paga
> - Te llegan multas por estructura inválida
> - Tu contador cobra extra "por la actualización"
> - El operador llega al retén y le piden la carta porte impresa
>   y no la tiene
>
> **Cada flete con carta porte mal hecha es un dolor de cabeza.**
> **Cada mes con SAT cambiando es un dolor de cartera.**

## La solución

> G3 te genera la carta porte 3.0 oficial automática **el mismo
> día que SAT actualiza la norma**. Si la primera vez no la
> acepta SAT, no te cobramos el timbre. Punto.
>
> Y no te cobramos extra por la "actualización" cada año porque
> nuestra plataforma se actualiza sola.

## Tres formas de comprar

### Opción 1 · Add-on al plan que ya tienes
Si ya pagas G3 Pro, Business o Corporativo: **incluido** sin
costo extra.

### Opción 2 · Stand-alone para clientes que solo quieren esto
$199 MXN/unidad/mes. Te incluye:
- Carta porte 3.0 automática
- Hasta 200 timbres/unidad/mes
- Garantía de aceptación SAT 1er intento
- PDF + XML + acuse SAT al instante
- Envío automático al cliente por correo

### Opción 3 · Plan Gratis
Hasta 20 cartas porte/mes incluidas.

## La garantía explícita

### Qué cubre
Si SAT rechaza la carta porte por error nuestro, **te
reembolsamos el timbre** automáticamente. No necesitas
reclamar ni llamar — el sistema te avisa y emite nueva carta
sin costo.

### Qué NO cubre
- Errores tuyos: RFC del cliente equivocado, régimen fiscal
  incompatible, datos del operador desactualizados. La app te
  los marca antes de timbrar, pero si los ignoras es tu
  responsabilidad
- SAT caído del lado de SAT (raro)
- Cambios en el cliente después de timbrado (cambia su domicilio
  fiscal, etc.)

### Cómo se calcula

Hay una lista de códigos de error del SAT clasificados como
"nuestros" (estructura mal formada, certificado vencido del PAC,
etc.) vs "tuyos" (RFC inválido, datos del cliente mal). Si
recae en la lista nuestra → reembolso automático. Política
documentada en `backend/services/invoicing/src/pac/error-codes.ts`.

## El gancho de adquisición

> "Si llevas 6 meses peleando con tu carta porte, prueba G3
> gratis. Te abrimos cuenta, te conectamos al SAT, y emitimos
> tus primeras 20 cartas porte de este mes **sin costo**. Si te
> sirve, te quedas. Si no, te llevas tus XMLs y no te cobramos
> nada."

## Script para llamada de venta (10 minutos)

```
[0:00 — apertura · 30 seg]
"Hola, [nombre]. Te hablo de G3 Logistics, somos
transportistas mexicanos que también construimos software
para flotas. ¿Tienes 8 minutos? Quiero enseñarte una cosa
específica."

[0:30 — calificación · 1 min]
"Antes de empezar, ¿cuántas unidades operas? · ¿cómo emites
tus cartas porte hoy? · ¿usas CONTPAQi, Excel, o algún
software específico? · ¿alguna vez te ha rechazado el SAT
una carta porte?"

[1:30 — descubrir dolor · 2 min]
[Si dice que sí lo han rechazado] "¿Hace cuánto te pasó? ·
¿cuánto te costó esa demora con el cliente? · ¿cómo
resolviste?"

[Si dice que no] "¿Tu contador o tu PAC nunca han tardado
en actualizar el complemento cuando SAT lo cambia? ¿Cuánto
te costó eso?"

[3:30 — pitch corto · 2 min]
"Nosotros construimos G3 Drive y G3 Admin para flotas.
Incluye la carta porte 3.0 automática. Cuando cierras el
viaje en el celular, la carta porte se genera sola, te
prevalidamos contra SAT, la timbramos en ~10 segundos, y la
mandamos al cliente. Si por algo nuestro SAT la rechaza, no
te cobramos el timbre."

[5:30 — demo de 90 segundos · 2 min]
[Compartes pantalla] "Mira, este es el panel. Aquí están
los viajes cerrados de hoy. Toco 'Generar carta porte',
verifico que los datos estén bien (origen, destino, cliente,
operador), tap timbrar, y… listo. UUID del SAT y PDF en
segundos."

[7:30 — pricing y cierre · 1.5 min]
"Tienes tres opciones: [explicar las 3]. La mayoría de
flotas como la tuya empiezan con la cuenta gratis para
probar las primeras 20 cartas porte. ¿Te paso el link para
crearla ahora? Tarda 3 minutos."

[9:00 — siguiente paso · 1 min]
"Te mando el link por WhatsApp. Si tienes preguntas, llámame
directo a [número]. ¿Tienes alguna duda antes de colgar?"
```

## Objeciones frecuentes y respuestas

### "Ya tengo CONTPAQi"
> "Perfecto, no tienes que cambiar tu contabilidad. G3 emite
> la carta porte y se conecta con tu CONTPAQi como complemento.
> Tu contador sigue trabajando igual. Lo que cambia es que la
> carta porte sale el día que cierras el viaje, no el día que
> tu contador llega a la oficina."

### "Mi PAC ya me la timbra"
> "Sí, pero ¿quién la genera con los datos del viaje? Probable
> que tu administrador la captura a mano. G3 la genera
> automática desde el viaje en G3 Drive — la app móvil. Ahorras
> tiempo de captura y eliminas errores."

### "Es caro"
> "El plan gratis incluye 20 cartas porte al mes. Si emites
> más, son $199 al mes por unidad. Compara con lo que pagas
> al contador externo + las multas por rechazo + el tiempo
> de tu administrador. La mayoría de flotas ahorra más de lo
> que paga."

### "No confío en el SAT digital"
> "Es válido tu punto. Por eso G3 conserva el XML y el PDF en
> tu cuenta para siempre — descargable cuando quieras. Y SAT
> publicó ya hace 2 años que las cartas porte digitales tienen
> la misma validez legal que las impresas. De hecho, el SAT
> exige que se emita digital."

### "Yo nunca he tenido problema con la carta porte"
> "Excelente. Significa que tienes un proceso muy bueno. Lo que
> ofrecemos es que ese proceso esté en una sola app con tu
> bitácora, evidencias y pagos. Una herramienta menos en tu
> flujo. Si después de probarlo decides quedarte con tu setup
> actual, te llevas tus datos sin costo."

### "¿Y si SAT cambia la norma de nuevo?"
> "Nosotros la actualizamos el mismo día. Es nuestra
> responsabilidad. Por eso firmamos con 2 PACs SAT en paralelo
> — si uno tarda, el otro toma el relevo. Tú solo te enteras
> porque sigue funcionando."

## Materiales para el equipo comercial

### Landing page (sección destacada)

```html
<section class="cta-carta-porte">
  <h1>Tu carta porte sale bien la primera vez.</h1>
  <h2>Garantizada por SAT — o no te la cobramos.</h2>

  <ul>
    <li>✓ Carta porte 3.0 automática (la actualizamos cuando SAT cambia)</li>
    <li>✓ Generada el mismo día que cierras el viaje</li>
    <li>✓ Pre-validada contra SAT antes de timbrar</li>
    <li>✓ PDF + XML + acuse al instante</li>
    <li>✓ Si SAT rechaza por error nuestro, reembolso automático</li>
  </ul>

  <a class="btn-primary">Empezar gratis · 20 cartas porte/mes</a>
  <p>Sin tarjeta · sin contratos · cambias o cancelas cuando quieras</p>
</section>
```

### Mensaje WhatsApp (para outbound a base existente)

```
Hola [Nombre], soy [tu nombre] de G3 Logistics.

Te mando porque acabamos de lanzar la carta porte 3.0
automática para flotas como la tuya.

Es esto:
1. Cierras el viaje en G3 Drive (app del operador)
2. La carta porte se genera sola
3. La timbramos con SAT en 10 segundos
4. El cliente la recibe por correo

Si SAT rechaza por error nuestro, no te cobramos. Garantizado.

¿Te paso el link para probar gratis? Las primeras 20 al mes
son sin costo.
```

### Email de seguimiento post-demo

```
Asunto: Tu carta porte 3.0 automática · siguiente paso

Hola [Nombre],

Gracias por la llamada de hoy.

Te resumo lo que vimos:
- G3 emite tu carta porte 3.0 al cerrar cada viaje en la app
- Si SAT rechaza por error nuestro, te reembolsamos el timbre
- Para tus 12 unidades, el plan FLOTILLA ($899/mes) incluye:
  · App G3 Drive para tus operadores
  · Panel G3 Admin para tu oficina
  · Carta porte 3.0 ilimitada
  · Bitácora NOM-087 + Inspección NOM-068

Te mandé un link para crear cuenta gratis (primeras 20
cartas/mes sin costo) en este WhatsApp: [link].

Si quieres, te conecto con un cliente actual que tiene 18
unidades para que te platique cómo le ha ido: [contacto].

Cualquier cosa, marca o escribe.

[firma]
```

## Métricas de éxito del pitch

| Métrica | Target |
|---|---|
| Conversion rate llamada → cuenta gratis | ≥ 40% |
| Conversion rate cuenta gratis → plan pagado | ≥ 25% en 90 días |
| Time-to-first-stamp (desde cuenta creada) | < 24 hrs |
| NPS post-onboarding | ≥ 65 |
| Cliente refiere a otro (en 6 meses) | ≥ 30% |

---

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-05-28 | Pitch inicial con script + objeciones + materiales |
