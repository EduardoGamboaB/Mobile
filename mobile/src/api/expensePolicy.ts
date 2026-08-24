import { supabase } from './supabase';
import { isDemo } from '@/demo';

/**
 * Política de gastos de la compañía — se administra desde G3 Admin.
 * Gobierna si el chofer puede registrar gastos manuales sin foto de
 * ticket y hasta qué monto.
 */
export interface ExpensePolicy {
  company_id: string | null;
  /** Permite gastos capturados a mano sin comprobante. */
  allow_manual_expense: boolean;
  /** Tope por gasto manual sin comprobante; null = sin tope. */
  manual_max_amount: number | null;
  /** Si true, todo gasto exige foto de ticket (anula lo anterior). */
  require_receipt: boolean;
}

/** Política por defecto cuando la compañía aún no configura una regla. */
export const DEFAULT_EXPENSE_POLICY: ExpensePolicy = {
  company_id: null,
  allow_manual_expense: true,
  manual_max_amount: null,
  require_receipt: false,
};

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

/**
 * Evalúa si un gasto es válido bajo la política.
 * Devuelve null si es válido, o el motivo de rechazo para mostrar al chofer.
 */
export function validateExpense(
  policy: ExpensePolicy,
  amount: number,
  hasReceipt: boolean,
): string | null {
  if (hasReceipt) return null;
  if (policy.require_receipt) {
    return 'Tu administrador requiere foto del ticket para todos los gastos.';
  }
  if (!policy.allow_manual_expense) {
    return 'Tu administrador no permite gastos sin comprobante. Toma foto del ticket.';
  }
  if (policy.manual_max_amount != null && amount > policy.manual_max_amount) {
    return `Los gastos sin ticket tienen tope de $${policy.manual_max_amount.toFixed(2)}. Toma foto del ticket para montos mayores.`;
  }
  return null;
}
