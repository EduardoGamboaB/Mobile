# Build e impresión térmica

## Ejecutar en Expo Go (rápido)

```bash
npm install
npm start
```

Todo funciona en Expo Go **excepto** la impresión Bluetooth directa: sin el
módulo nativo, el ticket se genera como PDF y se comparte con el diálogo del
sistema (desde ahí puedes imprimir con la app de tu impresora).

## Development build con impresora térmica

1. Instala el módulo nativo ESC/POS:

   ```bash
   npx expo install react-native-bluetooth-escpos-printer
   ```

   El servicio `src/services/printing/printer.ts` lo carga dinámicamente:
   si está presente, imprime los bytes ESC/POS directo por Bluetooth; si no,
   usa el fallback de PDF.

2. Genera el build:

   ```bash
   npx expo prebuild
   npx eas build --profile development --platform android
   ```

3. En el dispositivo: empareja la impresora térmica por Bluetooth
   (ajustes del sistema) y captura su **dirección MAC** en
   `Configuración → Impresora térmica` dentro de la app, junto con el ancho
   de papel (58 u 80 mm).

Los permisos Bluetooth (`BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`) y de cámara
ya están declarados en `app.json`.

## Impresoras probadas / compatibles

Cualquier impresora térmica que acepte ESC/POS crudo por Bluetooth SPP
(la gran mayoría de impresoras genéricas de 58/80 mm: Goojprt, Xprinter,
Bixolon, Epson TM…). El generador está en `src/services/printing/escpos.ts`
y tiene pruebas unitarias.
