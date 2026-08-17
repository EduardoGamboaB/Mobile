import { create } from 'zustand';
import { computeTotals, type CartLine, type CartTotals } from '@/utils/totals';
import type { Product } from '@/models/types';

interface CartState {
  lines: CartLine[];
  discount: number; // centavos
  totals: CartTotals;
  addProduct: (product: Product, qtyMilli?: number) => void;
  setQty: (productId: string, qtyMilli: number) => void;
  removeLine: (productId: string) => void;
  setDiscount: (cents: number) => void;
  clear: () => void;
}

const recompute = (lines: CartLine[], discount: number) => ({
  lines,
  discount,
  totals: computeTotals(lines, discount),
});

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  discount: 0,
  totals: computeTotals([]),
  addProduct: (product, qtyMilli = 1000) => {
    const { lines, discount } = get();
    const existing = lines.find((l) => l.productId === product.id);
    const next = existing
      ? lines.map((l) =>
          l.productId === product.id ? { ...l, qty: l.qty + qtyMilli } : l,
        )
      : [
          ...lines,
          {
            productId: product.id,
            name: product.name,
            qty: qtyMilli,
            unitPrice: product.price,
            taxRate: product.taxRate,
          },
        ];
    set(recompute(next, discount));
  },
  setQty: (productId, qtyMilli) => {
    const { lines, discount } = get();
    const next =
      qtyMilli <= 0
        ? lines.filter((l) => l.productId !== productId)
        : lines.map((l) => (l.productId === productId ? { ...l, qty: qtyMilli } : l));
    set(recompute(next, discount));
  },
  removeLine: (productId) => {
    const { lines, discount } = get();
    set(recompute(lines.filter((l) => l.productId !== productId), discount));
  },
  setDiscount: (cents) => {
    const { lines } = get();
    set(recompute(lines, Math.max(0, cents)));
  },
  clear: () => set(recompute([], 0)),
}));
