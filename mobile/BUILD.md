# G3 Drive · Cómo generar el APK

La app es **Expo SDK 51 / React Native 0.74** (workflow managed). El proyecto
está build-ready: assets generados (`assets/`), `eas.json` configurado,
typecheck limpio.

> ⚠️ El APK **no puede compilarse dentro del sandbox de Claude Code web**:
> la política de red bloquea `dl.google.com`, de donde se descargan el
> Android SDK y el Android Gradle Plugin. Usa cualquiera de estas dos rutas
> en tu máquina (o pide al admin permitir `dl.google.com` en el
> environment y Claude lo compila).

## Ruta A · EAS Build (recomendada — sin instalar Android Studio)

Compila en la nube de Expo. Solo necesitas una cuenta gratuita de Expo:

```bash
cd mobile
npm install
npx eas-cli login                     # primera vez
npx eas-cli build -p android --profile preview
```

- El perfil `preview` de `eas.json` produce un **APK instalable** (no AAB).
- Al terminar, EAS te da la URL de descarga del APK (~10 min).
- Para el AAB de Play Store usa `--profile production`.

## Ruta B · Build local (requiere Android SDK + JDK 17)

```bash
cd mobile
npm install
npx expo prebuild -p android          # genera la carpeta android/
cd android && ./gradlew assembleRelease
# APK en: android/app/build/outputs/apk/release/app-release.apk
```

Requisitos: `ANDROID_HOME` apuntando a un SDK con `platforms;android-34` y
`build-tools;34.0.0`, y JDK 17. El template de Expo firma el release con el
keystore de debug — suficiente para instalar en dispositivos propios y MDM;
para Play Store genera un keystore propio:

```bash
keytool -genkeypair -v -keystore g3-release.keystore -alias g3drive \
  -keyalg RSA -keysize 2048 -validity 10000
```

## Configuración previa al build de producción

1. **Backend**: rellena `extra.supabaseUrl` y `extra.supabaseAnonKey` en
   `app.json` (o usa variables EAS: `eas secret:create`).
2. **Paquete**: `com.g3logistics.driver` (ya configurado).
3. **Permisos** declarados: cámara, ubicación fina/gruesa, almacenamiento —
   alineados con las features (OCR, bitácora GPS, evidencias) y
   notificaciones (plugin `expo-notifications`).
4. **Push (centro de incidentes)**: `npx eas-cli init` deja el projectId en
   `extra.eas.projectId` de `app.json`; la app lo usa para obtener el Expo
   push token. En Android, sube las credenciales FCM a EAS
   (`npx eas-cli credentials`). Sin permiso, sin projectId o en emulador el
   login sigue normal y simplemente no se registra el token.

## Instalación en la flota (12 unidades)

- APK directo: `adb install app-release.apk` o distribúyelo por MDM
  (Knox/Scalefusion) en modo kiosko.
- Las tablets recomendadas (Galaxy Tab Active5) aceptan aprovisionamiento
  Android Enterprise por QR con el APK como app obligatoria.
