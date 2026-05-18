import { createNavigationContainerRef } from '@react-navigation/native';
import type { AppStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

/** Navega de forma segura cuando el container ya está montado. */
export function safeNavigate<K extends keyof AppStackParamList>(
  name: K,
  params?: AppStackParamList[K],
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error — react-navigation tipa la sobrecarga sin params como undefined
    navigationRef.navigate(name, params);
  }
}
