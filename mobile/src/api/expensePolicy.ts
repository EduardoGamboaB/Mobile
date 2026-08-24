import { supabase } from './supabase';
import { isDemo } from '@/demo';
import {
  DEFAULT_EXPENSE_POLICY,
  type ExpensePolicy,
} from '@/domain/expensePolicy';

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

export async function getExpensePolicy(): Promise<ExpensePolicy> {
  if (isDemo) return DEMO_POLICY;
  // RLS limita la lectura a la compañía del usuario: hay a lo más una fila.
  const { data, error } = await supabase
    .from('expense_policies')
    .select('company_id, allow_manual_expense, manual_max_amount, require_receipt')
    .maybeSingle();
  if (error) throw error;
  return (data as ExpensePolicy | null) ?? DEFAULT_EXPENSE_POLICY;
}
