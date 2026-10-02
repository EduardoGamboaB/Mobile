/**
 * Mock de expo-notifications para jest (node, sin módulos nativos).
 * Los tests controlan permisos/token con `__setPermission`, `__setToken`,
 * `__failToken` y disparan taps con `__emitResponse`. `__reset()` en beforeEach.
 */
type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface MockState {
  status: PermissionStatus;
  /** Respuesta de `requestPermissionsAsync` (si no se fija, igual a `status`). */
  requestResult: PermissionStatus | null;
  token: string;
  tokenError: Error | null;
  lastResponse: unknown;
  listeners: Array<(r: unknown) => void>;
}

const state: MockState = {
  status: 'granted',
  requestResult: null,
  token: 'ExponentPushToken[mock-token]',
  tokenError: null,
  lastResponse: null,
  listeners: [],
};

export const AndroidImportance = { MAX: 5, HIGH: 4, DEFAULT: 3 } as const;

export const getPermissionsAsync = jest.fn(async () => ({ status: state.status, granted: state.status === 'granted' }));
export const requestPermissionsAsync = jest.fn(async () => {
  const status = state.requestResult ?? state.status;
  return { status, granted: status === 'granted' };
});
export const getExpoPushTokenAsync = jest.fn(async (_opts?: { projectId?: string }) => {
  if (state.tokenError) throw state.tokenError;
  return { type: 'expo', data: state.token };
});
export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn(async () => null);
export const getLastNotificationResponseAsync = jest.fn(async () => state.lastResponse);
export const addNotificationResponseReceivedListener = jest.fn((cb: (r: unknown) => void) => {
  state.listeners.push(cb);
  return {
    remove: () => {
      state.listeners = state.listeners.filter((l) => l !== cb);
    },
  };
});

export function __setPermission(status: PermissionStatus, requestResult: PermissionStatus | null = null) {
  state.status = status;
  state.requestResult = requestResult;
}
export function __setToken(token: string) {
  state.token = token;
}
export function __failToken(err: Error | null) {
  state.tokenError = err;
}
export function __setLastResponse(r: unknown) {
  state.lastResponse = r;
}
export function __emitResponse(r: unknown) {
  state.listeners.forEach((l) => l(r));
}
export function __reset() {
  state.status = 'granted';
  state.requestResult = null;
  state.token = 'ExponentPushToken[mock-token]';
  state.tokenError = null;
  state.lastResponse = null;
  state.listeners = [];
  [
    getPermissionsAsync,
    requestPermissionsAsync,
    getExpoPushTokenAsync,
    setNotificationHandler,
    setNotificationChannelAsync,
    getLastNotificationResponseAsync,
    addNotificationResponseReceivedListener,
  ].forEach((f) => f.mockClear());
}
