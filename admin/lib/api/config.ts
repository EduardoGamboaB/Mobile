/**
 * Configuración del cliente API G3 para el admin web.
 * - Demo mode si NEXT_PUBLIC_G3_API_URL no está set: usa demoData.
 * - Live mode si está set: pega a Cloud Run.
 */
const baseUrl = (process.env.NEXT_PUBLIC_G3_API_URL ?? '').replace(/\/$/, '');
const forcedDemo = process.env.NEXT_PUBLIC_DEMO === '1';

export const G3_API_URL = baseUrl;
export const isLive = !forcedDemo && baseUrl.length > 0;
export const isDemoMode = !isLive;

export const API_PREFIX = '/api';
