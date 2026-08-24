/**
 * Política de gastos — lógica pura (sin dependencias de red).
 * La regla se administra desde G3 Admin y gobierna lo que el chofer puede
 * capturar en G3 Drive.
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
