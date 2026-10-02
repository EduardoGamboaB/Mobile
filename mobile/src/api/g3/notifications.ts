import { api } from './client';

/** Contacto de notificaciones del usuario autenticado (servicio alerts). */
export interface NotificationContactInput {
  /** Expo push token (`ExponentPushToken[...]`); `null` lo da de baja. */
  pushToken?: string | null;
  /** WhatsApp en E.164; `null` lo da de baja. */
  whatsapp?: string | null;
}

export const notificationsApi = {
  updateMyContact: (input: NotificationContactInput) => api.put<unknown>('/notification-contacts/me', input),
  setPushToken: (pushToken: string | null) => api.put<unknown>('/notification-contacts/me', { pushToken }),
};
