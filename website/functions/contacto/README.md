# g3-contacto · formulario de contacto en GCP

Cloud Run function (gen2, Node 20, `us-central1`) que recibe el formulario de
www.g3logistics.mx y lo envía por correo a **fletes@g3logistics.mx**.

- Valida los campos y bloquea spam con un campo trampa y un límite de 5 envíos cada 10 minutos por IP.
- Envía el correo con "responder a" apuntando al cliente, para contestarle directo desde el buzón de fletes.
- Crea o actualiza el contacto en **HubSpot** (por correo, estado de lead "Nuevo") y le agrega una nota con el detalle de la solicitud.
- Correo y HubSpot van en paralelo: basta con que uno funcione para dar la solicitud por recibida.
- Registra cada solicitud en Cloud Logging (`lead_recibido`), así no se pierde aunque fallen ambos.
- Respeta la casilla "No deseo que mis datos se usen para mercadotecnia" y la anota en el correo y en HubSpot.
- Solo acepta peticiones de `https://www.g3logistics.mx` y `https://g3logistics.mx` (CORS).

## Envío del correo (SMTP)

GCP no tiene un servicio propio de correo, así que la función usa SMTP. Opciones:

| Si el correo de g3logistics.mx está en… | SMTP_HOST | SMTP_PORT | SMTP_USER / contraseña |
|---|---|---|---|
| Google Workspace (recomendado) | `smtp.gmail.com` | `465` | la cuenta que envía y una [contraseña de aplicación](https://myaccount.google.com/apppasswords) (requiere verificación en 2 pasos) |
| Otro proveedor (Microsoft 365, hosting, SendGrid, Mailgun…) | el SMTP del proveedor | `465` o `587` | usuario y contraseña SMTP del proveedor |

## Despliegue (una sola vez)

```bash
gcloud auth login
gcloud config set project g3-prod

# 1. Guardar la contraseña SMTP en Secret Manager
printf '%s' 'CONTRASEÑA_SMTP' | gcloud secrets create g3-smtp-pass --data-file=-

# 2. (Opcional) Conectar HubSpot: token de una app privada con permisos
#    crm.objects.contacts.read y crm.objects.contacts.write
#    (HubSpot → Configuración → Integraciones → Apps privadas)
printf '%s' 'pat-na1-...' | gcloud secrets create g3-hubspot-token --data-file=-

# 3. Desplegar la función
cd website/functions/contacto
PROJECT_ID=g3-prod SMTP_USER=fletes@g3logistics.mx ./deploy.sh

# 4. Publicar el sitio: toma la URL de la función automáticamente
cd ../..
PROJECT_ID=g3-prod BUCKET=g3-website-prod ./deploy/deploy.sh
```

Para cambiar la contraseña: `printf '%s' 'NUEVA' | gcloud secrets versions add g3-smtp-pass --data-file=-`
y vuelve a correr `./deploy.sh`.

## Probar

```bash
npm test                     # pruebas unitarias
URL=$(gcloud functions describe g3-contacto --gen2 --region=us-central1 --format='value(serviceConfig.uri)')
curl -X POST "$URL" -H 'Origin: https://www.g3logistics.mx' -H 'Content-Type: application/json' \
  -d '{"nombre":"Prueba","empresa":"G3","correo":"prueba@g3logistics.mx","telefono":"6681255045","servicio":"Flete completo nacional"}'
```

Las solicitudes quedan en Cloud Logging: filtro `resource.labels.service_name="g3-contacto" jsonPayload.message="lead_recibido"`.
