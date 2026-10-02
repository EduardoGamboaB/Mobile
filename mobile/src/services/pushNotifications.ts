import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationsApi } from '@/api/g3/notifications';

/**
 * Notificaciones push de G3 Drive (Expo Push). El centro de incidentes
 * (servicio alerts) avisa por push a quien registró su token en
 * `PUT /notification-contacts/me`.
 *
 * Nada de aquí debe tumbar el login ni el logout: sin permiso, en simulador
 * (sin token) o con el backend caído, se registra en consola y se sigue.
 */

const ANDROID_CHANNEL = 'incidents';

/** projectId de EAS: requerido por `getExpoPushTokenAsync` en builds standalone. */
function easProjectId(): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromExtra ?? Constants.easConfig?.projectId ?? undefined;
}

/** Muestra el aviso también con la app en primer plano. */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  // Negado de forma permanente: el sistema ya no muestra el diálogo.
  if (current.canAskAgain === false) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

/**
 * Pide permiso, obtiene el Expo push token y lo registra en el backend.
 * Devuelve el token registrado o `null` si no se pudo (nunca lanza).
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!(await ensurePermission())) return null;
    // Android exige canal; en iOS es no-op.
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Incidentes',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => undefined);
    const projectId = easProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token) return null;
    await notificationsApi.setPushToken(token);
    return token;
  } catch (e) {
    // Simulador, sin Google Play Services, sin red o backend caído: el login sigue.
    console.warn('[push] no se pudo registrar el token:', (e as Error).message);
    return null;
  }
}

/**
 * Da de baja el token en el backend (al cerrar sesión, ANTES de borrar el
 * JWT). Con timeout para no colgar el logout; nunca lanza.
 */
export async function unregisterPushToken(timeoutMs = 3000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      notificationsApi.setPushToken(null),
      new Promise((_r, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
  } catch (e) {
    console.warn('[push] no se pudo dar de baja el token:', (e as Error).message);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** `data.incidentId` de la notificación tocada (lo manda alerts). */
export function incidentIdFromResponse(response: unknown): string | null {
  const data = (response as Notifications.NotificationResponse | null)?.notification?.request?.content?.data as
    | Record<string, unknown>
    | undefined;
  const id = data?.incidentId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Escucha taps en notificaciones (y la que abrió la app en frío) y llama a
 * `onIncident` con el id del incidente. Devuelve la función para dejar de escuchar.
 */
export function subscribeToNotificationTaps(onIncident: (incidentId: string) => void): () => void {
  let active = true;
  const handle = (r: unknown) => {
    const id = incidentIdFromResponse(r);
    if (active && id) onIncident(id);
  };
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => undefined);
  return () => {
    active = false;
    sub.remove();
  };
}
