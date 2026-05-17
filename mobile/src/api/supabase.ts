import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { isDemo } from '@/demo';

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  (Constants.expoConfig?.extra?.supabaseUrl as string | undefined) ??
  '';
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined) ??
  '';

if (!isDemo && (!url || !anonKey)) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY no están configurados. ' +
      'Copia mobile/.env.example a mobile/.env y rellena las credenciales, o usa modo demo.',
  );
}

// En modo demo no necesitamos un cliente real, pero exportamos uno "stub"
// con la misma forma para no romper imports.
export const supabase: SupabaseClient = isDemo
  ? (createClient('https://demo.invalid', 'demo-anon-key', {
      auth: { storage: AsyncStorage, persistSession: false, autoRefreshToken: false },
    }) as SupabaseClient)
  : createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
