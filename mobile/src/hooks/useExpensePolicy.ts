import { useQuery } from '@tanstack/react-query';
import { getExpensePolicy, DEFAULT_EXPENSE_POLICY } from '@/api/expensePolicy';

/**
 * Política de gastos de la compañía (configurada en G3 Admin).
 * Con cache larga y fallback al default: si no hay red se usa la última
 * política conocida — nunca se bloquea al chofer por falta de conexión.
 */
export function useExpensePolicy() {
  const query = useQuery({
    queryKey: ['expense-policy'],
    queryFn: getExpensePolicy,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
  return { ...query, policy: query.data ?? DEFAULT_EXPENSE_POLICY };
}
