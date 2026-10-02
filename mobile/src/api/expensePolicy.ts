import { isDemo } from '@/demo';
import type { ExpensePolicy } from '@/domain/expensePolicy';
import { expensePolicyApi } from './g3/trips';
import { policyFromDto } from './mappers';

export { validateExpense, DEFAULT_EXPENSE_POLICY } from '@/domain/expensePolicy';
export type { ExpensePolicy } from '@/domain/expensePolicy';

/**
 * En demo se usa una regla con tope para poder mostrar el flujo completo:
 * gastos ≤ $300 MXN pueden ir sin ticket; arriba de eso exige foto.
 */
const DEMO_POLICY: ExpensePolicy = {
  company_id: 'demo',
  allow_manual_expense: true,
  manual_max_amount: 300,
  require_receipt: false,
};

/** La regla la administra G3 Admin; el backend devuelve la default si no hay una configurada. */
export async function getExpensePolicy(): Promise<ExpensePolicy> {
  if (isDemo) return DEMO_POLICY;
  return policyFromDto(await expensePolicyApi.get());
}
