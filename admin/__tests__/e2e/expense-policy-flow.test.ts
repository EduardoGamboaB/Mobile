/**
 * E2E — configuración de la regla de gastos desde G3 Admin.
 *
 * El administrador define la política (permitir manuales, tope, exigir
 * ticket); la regla persiste (localStorage) y sobrevive a hydrate() —
 * es la misma regla que G3 Drive lee para gatear los gastos del chofer.
 */
import { useAppStore, DEFAULT_EXPENSE_POLICY } from '../../lib/store';
import { tokenStore } from '../../lib/api/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — regla de gastos con backend (GET/PUT /expense-policy)', () => {
  let teardown: () => void;
  beforeEach(() => {
    window.localStorage.clear();
    tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' });
    useAppStore.setState({ expensePolicy: DEFAULT_EXPENSE_POLICY });
  });
  afterEach(() => teardown?.());

  test('al abrir Ajustes trae la regla vigente del servidor', async () => {
    const m = makeFetchMock().on('GET /api/expense-policy', {
      status: 200,
      body: fixtures.expensePolicy({ requireReceipt: true, manualMaxAmount: null }),
    });
    teardown = installGlobalFetchMock(m);

    await useAppStore.getState().loadExpensePolicy();
    expect(useAppStore.getState().expensePolicy).toEqual({
      allowManualExpense: true,
      manualMaxAmount: null,
      requireReceipt: true,
    });
  });

  test('guardar manda la regla completa por PUT y adopta lo que responde el servidor', async () => {
    const m = makeFetchMock().on('PUT /api/expense-policy', (req) => ({
      status: 200,
      body: fixtures.expensePolicy(req.body as object),
    }));
    teardown = installGlobalFetchMock(m);

    await useAppStore.getState().saveExpensePolicy({ manualMaxAmount: 800 });
    expect(m.calls[0].body).toEqual({ allowManualExpense: true, manualMaxAmount: 800, requireReceipt: false });
    expect(useAppStore.getState().expensePolicy.manualMaxAmount).toBe(800);
  });

  test('si el PUT falla se revierte el cambio optimista', async () => {
    const m = makeFetchMock().on('PUT /api/expense-policy', {
      status: 403,
      body: { statusCode: 403, error: 'Forbidden', message: 'Sin permiso para esta operación' },
    });
    teardown = installGlobalFetchMock(m);

    await expect(useAppStore.getState().saveExpensePolicy({ requireReceipt: true })).rejects.toMatchObject({ status: 403 });
    expect(useAppStore.getState().expensePolicy).toEqual(DEFAULT_EXPENSE_POLICY);
  });
});

describe('E2E — regla de gastos administrada desde Ajustes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.setState({ expensePolicy: DEFAULT_EXPENSE_POLICY });
  });

  test('default: manuales permitidos con tope de $300', () => {
    const p = useAppStore.getState().expensePolicy;
    expect(p.allowManualExpense).toBe(true);
    expect(p.manualMaxAmount).toBe(300);
    expect(p.requireReceipt).toBe(false);
  });

  test('flujo admin: sube el tope a $500 y la regla persiste tras hydrate', () => {
    useAppStore.getState().setExpensePolicy({ manualMaxAmount: 500 });
    expect(useAppStore.getState().expensePolicy.manualMaxAmount).toBe(500);

    // simula recarga de la app: estado se resetea y se rehidrata de LS
    useAppStore.setState({ expensePolicy: DEFAULT_EXPENSE_POLICY });
    useAppStore.getState().hydrate();
    expect(useAppStore.getState().expensePolicy.manualMaxAmount).toBe(500);
  });

  test('flujo admin: endurecer la regla — exigir ticket en todo gasto', () => {
    useAppStore.getState().setExpensePolicy({ requireReceipt: true });
    useAppStore.setState({ expensePolicy: DEFAULT_EXPENSE_POLICY });
    useAppStore.getState().hydrate();

    const p = useAppStore.getState().expensePolicy;
    expect(p.requireReceipt).toBe(true);
    // el resto de la regla no se pierde al hacer merge parcial
    expect(p.allowManualExpense).toBe(true);
    expect(p.manualMaxAmount).toBe(300);
  });

  test('flujo admin: prohibir manuales por completo', () => {
    useAppStore.getState().setExpensePolicy({ allowManualExpense: false, manualMaxAmount: null });
    const p = useAppStore.getState().expensePolicy;
    expect(p.allowManualExpense).toBe(false);
    expect(p.manualMaxAmount).toBeNull();
  });

  test('política corrupta en localStorage cae al default sin romper', () => {
    window.localStorage.setItem('g3admin.expensePolicy.v1', '{no-es-json');
    useAppStore.getState().hydrate();
    expect(useAppStore.getState().expensePolicy).toEqual(DEFAULT_EXPENSE_POLICY);
  });
});
