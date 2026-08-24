/**
 * E2E — configuración de la regla de gastos desde G3 Admin.
 *
 * El administrador define la política (permitir manuales, tope, exigir
 * ticket); la regla persiste (localStorage) y sobrevive a hydrate() —
 * es la misma regla que G3 Drive lee para gatear los gastos del chofer.
 */
import { useAppStore, DEFAULT_EXPENSE_POLICY } from '../../lib/store';

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
