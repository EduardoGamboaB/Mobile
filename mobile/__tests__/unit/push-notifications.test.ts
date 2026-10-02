/**
 * Push de G3 Drive: permiso → Expo push token → PUT /notification-contacts/me,
 * limpieza al cerrar sesión y tap en notificación de incidente.
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { onUnauthorized, tokenStore } from '@/api/g3/client';
import { notificationsApi } from '@/api/g3/notifications';
import {
  incidentIdFromResponse,
  registerPushToken,
  subscribeToNotificationTaps,
  unregisterPushToken,
} from '@/services/pushNotifications';
import { useAuthStore } from '@/stores/auth';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock, type FetchMock } from '../helpers/mockFetch';

const mock = Notifications as unknown as {
  __reset: () => void;
  __setPermission: (s: 'granted' | 'denied' | 'undetermined', r?: 'granted' | 'denied' | null) => void;
  __setToken: (t: string) => void;
  __failToken: (e: Error | null) => void;
  __setLastResponse: (r: unknown) => void;
  __emitResponse: (r: unknown) => void;
};

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

const extra = (Constants.expoConfig as { extra: Record<string, unknown> }).extra;
const tapOn = (data: Record<string, unknown>) => ({ notification: { request: { content: { data } } } });

describe('push: registro del token de Expo', () => {
  let teardown: () => void;
  let m: FetchMock;

  beforeEach(() => {
    mock.__reset();
    delete extra.eas;
    tokenStore.setInMemory({ accessToken: 'jwt.a', refreshToken: 'jwt.r' });
    m = makeFetchMock().onAny(
      (r) => r.method === 'PUT' && r.url.endsWith('/api/notification-contacts/me'),
      { status: 200, body: { userId: 'usr_test_1' } },
    );
    teardown = installGlobalFetchMock(m);
  });
  afterEach(() => teardown());

  test('notificationsApi.setPushToken hace PUT /api/notification-contacts/me {pushToken}', async () => {
    await notificationsApi.setPushToken('ExponentPushToken[x]');
    expect(m.calls[0]).toMatchObject({
      method: 'PUT',
      url: 'https://api.g3.test/api/notification-contacts/me',
      body: { pushToken: 'ExponentPushToken[x]' },
    });
    expect(m.calls[0].headers.authorization).toBe('Bearer jwt.a');
  });

  test('con permiso: obtiene el token (con projectId de EAS) y lo registra', async () => {
    extra.eas = { projectId: 'proj-123' };
    mock.__setToken('ExponentPushToken[abc]');
    await expect(registerPushToken()).resolves.toBe('ExponentPushToken[abc]');
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-123' });
    expect(m.calls).toHaveLength(1);
    expect(m.calls[0].body).toEqual({ pushToken: 'ExponentPushToken[abc]' });
  });

  test('sin projectId pide el token sin opciones', async () => {
    await registerPushToken();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith(undefined);
  });

  test('permiso no determinado: lo pide; si lo niega no registra nada ni lanza', async () => {
    mock.__setPermission('undetermined', 'denied');
    await expect(registerPushToken()).resolves.toBeNull();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(m.calls).toHaveLength(0);
  });

  test('permiso no determinado y concedido: registra', async () => {
    mock.__setPermission('undetermined', 'granted');
    await expect(registerPushToken()).resolves.toBe('ExponentPushToken[mock-token]');
    expect(m.calls).toHaveLength(1);
  });

  test('simulador (getExpoPushTokenAsync falla) o backend caído: null, sin lanzar', async () => {
    mock.__failToken(new Error('Must use physical device for push notifications'));
    await expect(registerPushToken()).resolves.toBeNull();
    expect(m.calls).toHaveLength(0);

    mock.__failToken(null);
    teardown();
    const down = makeFetchMock().onAny(() => true, { status: 503, body: { message: 'down' } });
    teardown = installGlobalFetchMock(down);
    await expect(registerPushToken()).resolves.toBeNull();
  });

  test('unregisterPushToken manda pushToken: null y no lanza si falla', async () => {
    await unregisterPushToken();
    expect(m.calls[0].body).toEqual({ pushToken: null });

    teardown();
    teardown = installGlobalFetchMock(makeFetchMock().onAny(() => true, { status: 500, body: {} }));
    await expect(unregisterPushToken()).resolves.toBeUndefined();
  });
});

describe('push: tap en notificación', () => {
  beforeEach(() => mock.__reset());

  test('incidentIdFromResponse lee data.incidentId', () => {
    expect(incidentIdFromResponse(tapOn({ incidentId: 'inc_1' }))).toBe('inc_1');
    expect(incidentIdFromResponse(tapOn({ other: 1 }))).toBeNull();
    expect(incidentIdFromResponse(tapOn({ incidentId: 42 }))).toBeNull();
    expect(incidentIdFromResponse(null)).toBeNull();
  });

  test('al tocar una notificación con incidentId navega; sin incidentId no', async () => {
    const onIncident = jest.fn();
    const unsubscribe = subscribeToNotificationTaps(onIncident);
    mock.__emitResponse(tapOn({ incidentId: 'inc_9' }));
    mock.__emitResponse(tapOn({ tripId: 't1' }));
    expect(onIncident).toHaveBeenCalledTimes(1);
    expect(onIncident).toHaveBeenCalledWith('inc_9');
    unsubscribe();
    mock.__emitResponse(tapOn({ incidentId: 'inc_10' }));
    expect(onIncident).toHaveBeenCalledTimes(1);
  });

  test('arranque en frío: procesa la última respuesta (app abierta desde la notificación)', async () => {
    mock.__setLastResponse(tapOn({ incidentId: 'inc_cold' }));
    const onIncident = jest.fn();
    const unsubscribe = subscribeToNotificationTaps(onIncident);
    await new Promise((r) => setImmediate(r));
    expect(onIncident).toHaveBeenCalledWith('inc_cold');
    unsubscribe();
  });
});

describe('push: integración con la sesión (stores/auth)', () => {
  let teardown: () => void;

  beforeEach(() => {
    mock.__reset();
    tokenStore.setInMemory(null);
    useAuthStore.setState({ session: null, profile: null, loading: false });
  });
  afterEach(() => teardown?.());

  const putCalls = (m: FetchMock) =>
    m.calls.filter((c) => c.method === 'PUT' && c.url.endsWith('/api/notification-contacts/me'));

  const flush = () => new Promise((r) => setTimeout(r, 0));

  test('login con correo registra el push token; logout lo borra antes de soltar el JWT', async () => {
    const m = makeFetchMock()
      .on('POST /api/auth/login', { status: 200, body: fixtures.session('starter') })
      .onAny(() => true, { status: 200, body: {} });
    teardown = installGlobalFetchMock(m);

    await useAuthStore.getState().signInWithEmail('owner@acme.mx', 'secret');
    await flush();
    expect(useAuthStore.getState().session).not.toBeNull();
    expect(putCalls(m).map((c) => c.body)).toEqual([{ pushToken: 'ExponentPushToken[mock-token]' }]);

    await useAuthStore.getState().signOut();
    const puts = putCalls(m);
    expect(puts[1].body).toEqual({ pushToken: null });
    expect(puts[1].headers.authorization).toBe('Bearer jwt.starter.access');
    expect(useAuthStore.getState().session).toBeNull();
    expect(await tokenStore.load()).toBeNull();
  });

  test('sin permiso de notificaciones el login no falla', async () => {
    mock.__setPermission('denied', 'denied');
    const m = makeFetchMock()
      .on('POST /api/auth/login', { status: 200, body: fixtures.session('starter') })
      .onAny(() => true, { status: 200, body: {} });
    teardown = installGlobalFetchMock(m);

    await expect(useAuthStore.getState().signInWithEmail('owner@acme.mx', 'secret')).resolves.toBeUndefined();
    await flush();
    expect(useAuthStore.getState().session).not.toBeNull();
    expect(putCalls(m)).toHaveLength(0);
  });

  test('si el backend rechaza el token el login sigue y el logout no se bloquea', async () => {
    const m = makeFetchMock()
      .on('POST /api/auth/login', { status: 200, body: fixtures.session('starter') })
      .onAny((r) => r.method === 'PUT', { status: 500, body: { message: 'x' } })
      .onAny(() => true, { status: 200, body: {} });
    teardown = installGlobalFetchMock(m);

    await useAuthStore.getState().signInWithEmail('owner@acme.mx', 'secret');
    await flush();
    expect(useAuthStore.getState().session).not.toBeNull();
    await expect(useAuthStore.getState().signOut()).resolves.toBeUndefined();
    expect(useAuthStore.getState().session).toBeNull();
  });

  test('logout con JWT vencido: el 401 del PUT dispara onUnauthorized → signOut sin ciclo', async () => {
    const m = makeFetchMock()
      .on('POST /api/auth/login', { status: 200, body: fixtures.session('starter') })
      .onAny((r) => r.url.endsWith('/api/auth/refresh'), { status: 401, body: {} })
      .onAny((r) => r.method === 'PUT', { status: 401, body: { message: 'expirado' } })
      .onAny(() => true, { status: 200, body: {} });
    teardown = installGlobalFetchMock(m);
    mock.__setPermission('denied', 'denied');
    const signOut = jest.fn(() => useAuthStore.getState().signOut());
    onUnauthorized(signOut);

    await useAuthStore.getState().signInWithEmail('owner@acme.mx', 'secret');
    await useAuthStore.getState().signOut();
    await flush();

    expect(putCalls(m)).toHaveLength(1);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
    expect(await tokenStore.load()).toBeNull();
    onUnauthorized(() => undefined);
  });
});
