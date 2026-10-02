import { isDemoMode } from '@/api/g3/config';

/**
 * `true` cuando no hay URL del backend G3 configurada (`EXPO_PUBLIC_G3_API_URL`)
 * o cuando se fuerza con `EXPO_PUBLIC_DEMO=1`. Toda la app trabaja contra
 * datos en memoria sin hacer red.
 */
export const isDemo = isDemoMode;

export { demoStore } from './store';
export { DEMO_USER_ID, DEMO_COMPANY_ID, demoProfile } from './data';
