import Constants from 'expo-constants';

const baseUrl =
  process.env.EXPO_PUBLIC_G3_API_URL ??
  (Constants.expoConfig?.extra?.g3ApiUrl as string | undefined) ??
  '';

const forcedDemo = process.env.EXPO_PUBLIC_DEMO === '1';

export const G3_API_URL = baseUrl.replace(/\/$/, '');
export const isLive = !forcedDemo && G3_API_URL.length > 0;
export const isDemoMode = !isLive;

export const API_PREFIX = '/api';
