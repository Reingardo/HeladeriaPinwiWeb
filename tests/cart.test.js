import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cart, CART_KEY, MAX_QUANTITY, MINIMUM_ORDER, orderMessage } from '../src/js/cart.js';
import { families, packages } from '../src/js/catalog.js';

function memoryStore(initial) {
  const values = new Map(initial ? [[CART_KEY, initial]] : []);
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}
const catalogue = [...families.flatMap(family => family.products), ...packages.map((item, i) => ({ ...item, id: `pack-${i}` }))];

test('a mixed order survives a reload with quantities and totals intact', () => {
  const store = memoryStore();
  const cart = new Cart(catalogue, store);
  cart.set('ba-0', 80);
  cart.set('pack-1', 2);
  const restored = new Cart(catalogue, store);
  assert.equal(restored.quantity('ba-0'), 80);
  assert.equal(restored.quantity('pack-1'), 2);
  assert.equal(restored.count, 82);
  assert.equal(restored.total, 1360);
  assert.deepEqual(Object.keys(JSON.parse(store.getItem(CART_KEY)).lines[0]).sort(), ['id', 'qty']);
});

test('restoring a cart ignores unknown IDs and forged prices or descriptions', () => {
  const store = memoryStore(JSON.stringify({ version: 1, lines: [
    { id: 'ba-0', qty: 80, price: 0.01, name: '<script>fake</script>' },
    { id: 'nonexistent', qty: 50 },
    { id: 'ni-0', qty: -1 },
    { id: 'ni-1', qty: 1.5 },
  ] }));
  const cart = new Cart(catalogue, store);
  assert.equal(cart.total, 400);
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].name, 'Boli de agua · Limón');
});

test('updated catalogue prices apply to a restored order', () => {
  const store = memoryStore();
  new Cart(catalogue, store).set('ba-0', 10);
  const updated = catalogue.map(item => item.id === 'ba-0' ? { ...item, price: 6 } : item);
  assert.equal(new Cart(updated, store).total, 60);
});

test('malformed JSON and unsupported storage versions do not break ordering', () => {
  for (const value of ['broken json', '{"version":2,"lines":[]}', '{"version":1,"lines":null}', '{"version":1,"lines":[null]}']) {
    const cart = new Cart(catalogue, memoryStore(value));
    assert.equal(cart.count, 0);
    cart.set('ba-0', 1);
    assert.equal(cart.total, 5);
  }
});

test('blocked browser storage falls back to a usable in-memory cart', () => {
  const cart = new Cart(catalogue, {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  });
  cart.set('ni-0', 20);
  assert.equal(cart.total, 420);
  assert.equal(cart.storageAvailable, false);
});

test('manual quantities are bounded and removing the last unit removes the line', () => {
  const cart = new Cart(catalogue, memoryStore());
  cart.set('ba-0', 1e9);
  assert.equal(cart.quantity('ba-0'), MAX_QUANTITY);
  cart.set('ba-0', 2.8);
  assert.equal(cart.quantity('ba-0'), 2);
  cart.set('ba-0', -1);
  assert.deepEqual(cart.lines, []);
  cart.set('fake-id', 20);
  assert.equal(cart.count, 0);
});

test('the exact minimum and WhatsApp summary use the same current order', () => {
  const cart = new Cart(catalogue, memoryStore());
  cart.set('ba-0', 79);
  assert.ok(cart.total < MINIMUM_ORDER);
  cart.set('ba-0', 80);
  assert.equal(cart.total, MINIMUM_ORDER);
  const message = orderMessage(cart, value => `$${value}`);
  assert.match(message, /80 × Boli de agua · Limón — \$400/);
  assert.match(message, /Total: \$400 MXN/);
  assert.match(message, /confirmar disponibilidad, entrega y forma de pago/);
});

test('removals persist and another tab can refresh from the same store', () => {
  const store = memoryStore();
  const first = new Cart(catalogue, store);
  const second = new Cart(catalogue, store);
  first.set('ba-0', 12);
  second.restore();
  assert.equal(second.quantity('ba-0'), 12);
  first.set('ba-0', 0);
  assert.equal(new Cart(catalogue, store).count, 0);
});
