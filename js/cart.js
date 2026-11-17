export const CART_KEY = 'pinwi.cart.v1';
export const MAX_QUANTITY = 9999;
export const MINIMUM_ORDER = 400;

export function normalizeQuantity(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(number))) : 0;
}

// Only IDs and quantities are persisted. Prices and descriptions always come
// from the current catalogue, including when another tab restores a cart.
export class Cart {
  constructor(catalogue, storage) {
    this.catalogue = new Map(catalogue.map(item => [item.id, item]));
    this.storage = storage;
    this.quantities = new Map();
    this.listeners = new Set();
    this.storageAvailable = Boolean(storage);
    this.restore();
  }

  restore() {
    try {
      const data = JSON.parse(this.storage?.getItem(CART_KEY) || 'null');
      const next = new Map();
      if (data?.version === 1 && Array.isArray(data.lines)) {
        for (const line of data.lines.slice(0, this.catalogue.size)) {
          if (line && this.catalogue.has(line.id) && Number.isSafeInteger(line.qty) && line.qty > 0) {
            next.set(line.id, normalizeQuantity(line.qty));
          }
        }
      }
      this.quantities = next;
    } catch {
      // A corrupt or unavailable browser store must never prevent ordering.
    }
  }

  get lines() {
    return [...this.quantities].map(([id, qty]) => ({ ...this.catalogue.get(id), qty }));
  }

  get count() { return this.lines.reduce((total, line) => total + line.qty, 0); }
  get total() { return this.lines.reduce((total, line) => total + line.qty * line.price, 0); }
  quantity(id) { return this.quantities.get(id) || 0; }

  set(id, value) {
    if (!this.catalogue.has(id)) return;
    const qty = normalizeQuantity(value);
    if (qty === this.quantity(id)) return;
    if (qty) this.quantities.set(id, qty);
    else this.quantities.delete(id);
    try {
      this.storage?.setItem(CART_KEY, JSON.stringify({
        version: 1,
        lines: [...this.quantities].map(([lineId, count]) => ({ id: lineId, qty: count })),
      }));
    } catch {
      this.storageAvailable = false;
    }
    this.notify();
  }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  notify() { this.listeners.forEach(listener => listener(this)); }
}

export function orderMessage(cart, money) {
  return 'Hola, Helados Pinwi Pinwi. Me gustaría hacer este pedido:\n\n'
    + cart.lines.map(line => `${line.qty} × ${line.name} — ${money(line.qty * line.price)}`).join('\n')
    + `\n\nTotal: ${money(cart.total)} MXN.\nQuedo pendiente de confirmar disponibilidad, entrega y forma de pago.`;
}
