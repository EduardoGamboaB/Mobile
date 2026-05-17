import Constants from 'expo-constants';

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined) ??
  '';
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined) ??
  '';

const forced = process.env.EXPO_PUBLIC_DEMO === '1';

/**
 * `true` cuando no hay credenciales de Supabase configuradas
 * o cuando se fuerza con `EXPO_PUBLIC_DEMO=1`. Toda la app
 * trabaja contra datos en memoria sin hacer red.
 */
export const isDemo = forced || !url || !anonKey;

export { demoStore } from './store';
export { DEMO_USER_ID, DEMO_COMPANY_ID, demoProfile } from './data';
