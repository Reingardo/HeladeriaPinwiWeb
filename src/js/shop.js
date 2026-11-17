import { families, packages } from './catalog.js';
import { Cart, CART_KEY, MAX_QUANTITY, MINIMUM_ORDER, normalizeQuantity, orderMessage } from './cart.js';
import { measure } from './measurement.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('view') === 'simple';
const products = families.flatMap(family => family.products);
const packageProducts = packages.map((item, i) => ({ ...item, id: `pack-${i}`, name: `${item.name} · ${item.detail}` }));
const catalogue = [...products, ...packageProducts];

function imageFor(item, className = '') {
  const img = document.createElement('img');
  img.src = item.image;
  img.alt = item.name;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 320;
  img.height = 320;
  img.className = className;
  img.addEventListener('error', () => {
    const family = families.find(entry => entry.name === item.family);
    if (family && !img.dataset.fallback) {
      img.dataset.fallback = 'true';
      img.src = family.image;
      img.style.objectFit = 'contain';
    } else {
      img.hidden = true;
      const placeholder = document.createElement('span');
      placeholder.className = 'image-unavailable';
      placeholder.textContent = 'Imagen no disponible';
      img.after(placeholder);
    }
  });
  return img;
}

export function mountShop({ onFamilyOpen, onInteraction }) {
  let storage;
  try { storage = window.localStorage; } catch { /* Ordering works in memory. */ }
  const cart = new Cart(catalogue, storage);
  const countLabel = () => `${cart.count} ${cart.count === 1 ? 'producto' : 'productos'}`;
  let familyIndex = 0;
  let familyKind = 'Todos';
  let familyOpener;
  let cartOpener;
  const rows = new Map();
  const dialog = $('#familyDialog');
  const cartDialog = $('#cartDialog');

  function announce(text) { $('#status').textContent = text; }

  function setQuantity(item, value) {
    const before = cart.quantity(item.id);
    const after = normalizeQuantity(value);
    cart.set(item.id, after);
    if (after === before) return;
    announce(`${item.name}: ${after} ${after === 1 ? 'pieza' : 'piezas'} en tu carrito.`);
    measure(after > before ? 'add_to_cart' : 'remove_from_cart', {
      itemId: item.id, quantity: Math.abs(after - before), value: Math.abs(after - before) * item.price,
    });
  }

  function quantityControl(item) {
    const control = document.createElement('div');
    control.className = 'quantity product-quantity';
    control.dataset.product = item.id;
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `Quitar uno de ${item.name}`);
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '0';
    input.max = String(MAX_QUANTITY);
    input.step = '1';
    input.value = String(cart.quantity(item.id));
    input.setAttribute('aria-label', `Cantidad de ${item.name}`);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `Agregar uno de ${item.name}`);
    minus.addEventListener('click', () => setQuantity(item, cart.quantity(item.id) - 1));
    plus.addEventListener('click', () => setQuantity(item, cart.quantity(item.id) + 1));
    input.addEventListener('input', () => {
      if (input.value !== '' && input.validity.valid) setQuantity(item, input.value);
    });
    input.addEventListener('change', () => {
      setQuantity(item, input.value);
      input.value = String(cart.quantity(item.id));
    });
    control.append(minus, input, plus);
    return control;
  }

  function productCard(item, global = false) {
    const article = document.createElement('article');
    article.className = 'flavour-card';
    article.append(imageFor(item));
    const info = document.createElement('div');
    info.className = 'flavour-info';
    const kind = document.createElement('small');
    kind.textContent = global ? item.family : item.kind;
    const title = document.createElement('h3');
    title.textContent = item.flavor;
    const bottom = document.createElement('div');
    bottom.className = 'flavour-bottom';
    const price = document.createElement('strong');
    price.textContent = `${money(item.price)} MXN`;
    bottom.append(price, quantityControl(item));
    info.append(kind, title, bottom);
    article.append(info);
    return article;
  }

  function refreshQuantities() {
    $$('.product-quantity').forEach(control => {
      const qty = cart.quantity(control.dataset.product);
      const input = control.querySelector('input');
      if (input !== document.activeElement) input.value = String(qty);
      const [minus, plus] = control.querySelectorAll('button');
      // aria-disabled keeps a focused decrement button in the tab order at 0.
      minus.setAttribute('aria-disabled', String(qty === 0));
      plus.setAttribute('aria-disabled', String(qty >= MAX_QUANTITY));
    });
  }

  function renderFamily() {
    const query = fold($('#familySearch').value);
    const items = families[familyIndex].products.filter(item =>
      (familyKind === 'Todos' || item.kind === familyKind) && fold(`${item.flavor} ${item.kind}`).includes(query));
    $('#familyGrid').replaceChildren(...items.map(item => productCard(item)));
    if (!items.length) {
      const message = document.createElement('p');
      message.className = 'family-no-results';
      message.textContent = 'No encontramos ese sabor. Prueba con otro nombre.';
      $('#familyGrid').append(message);
    }
    $('#familyResultsCount').textContent = `${items.length} ${items.length === 1 ? 'sabor' : 'sabores'}`;
    refreshQuantities();
  }

  function openFamily(i, opener = document.activeElement) {
    familyIndex = i;
    familyKind = 'Todos';
    familyOpener = opener;
    const family = families[i];
    $('#familySearch').value = '';
    $('#familyTitle').textContent = family.name;
    $('#familySummary').textContent = `${family.products.length} sabores · Desde ${money(family.price)} MXN por pieza`;
    const kinds = ['Todos', ...new Set(family.products.map(item => item.kind))];
    $('#familyKinds').replaceChildren(...kinds.map(kind => {
      const button = document.createElement('button');
      button.textContent = kind;
      button.classList.toggle('active', kind === 'Todos');
      button.setAttribute('aria-pressed', String(kind === 'Todos'));
      button.addEventListener('click', () => {
        familyKind = kind;
        [...$('#familyKinds').children].forEach(element => {
          element.classList.toggle('active', element === button);
          element.setAttribute('aria-pressed', String(element === button));
        });
        renderFamily();
      });
      return button;
    }));
    $('#familyKinds').hidden = kinds.length <= 2;
    renderFamily();
    dialog.showModal();
    document.body.classList.add('cart-open');
    dialog.scrollTop = 0;
    onFamilyOpen(i);
    measure('view_family', { family: family.name });
  }

  function closeFamily(restoreFocus = true) {
    dialog.close();
    document.body.classList.remove('cart-open');
    if (restoreFocus && familyOpener?.isConnected) familyOpener.focus();
    onInteraction();
  }

  function cartRow(item) {
    const row = document.createElement('div');
    row.className = 'cart-line';
    row.append(imageFor(item));
    const content = document.createElement('div');
    content.className = 'cart-line-content';
    const title = document.createElement('h3');
    title.textContent = item.name;
    const price = document.createElement('p');
    price.textContent = `${money(item.price)} MXN por unidad`;
    const total = document.createElement('strong');
    total.className = 'line-total';
    const remove = document.createElement('button');
    remove.className = 'remove-line';
    remove.textContent = 'Eliminar';
    remove.setAttribute('aria-label', `Eliminar ${item.name} del carrito`);
    remove.addEventListener('click', () => setQuantity(item, 0));
    content.append(title, price, quantityControl(item), remove, total);
    row.append(content);
    return row;
  }

  function renderCart() {
    const lines = cart.lines;
    const ids = new Set(lines.map(item => item.id));
    let restoreFocus = false;
    for (const [id, row] of rows) {
      if (!ids.has(id)) {
        restoreFocus ||= row.contains(document.activeElement);
        row.remove();
        rows.delete(id);
      }
    }
    for (const item of lines) {
      let row = rows.get(item.id);
      if (!row) {
        row = cartRow(item);
        rows.set(item.id, row);
        $('#cartLines').append(row);
      }
      row.querySelector('.line-total').textContent = `${money(item.qty * item.price)} MXN`;
    }
    $('#cartEmpty').hidden = Boolean(cart.count);
    $('#cartTotal').textContent = `${money(cart.total)} MXN`;
    $('#cartMinimum').textContent = cart.total >= MINIMUM_ORDER
      ? 'Mínimo alcanzado. Confirma tu zona de entrega con Pinwi.'
      : `Agrega ${money(MINIMUM_ORDER - cart.total)} más para alcanzar el pedido mínimo de $400.`;
    const orderLink = $('#whatsappOrder');
    const ready = cart.total >= MINIMUM_ORDER;
    orderLink.classList.toggle('disabled', !ready);
    orderLink.setAttribute('aria-disabled', String(!ready));
    if (ready) orderLink.href = 'https://wa.me/5218333932616?text=' + encodeURIComponent(orderMessage(cart, money));
    else orderLink.removeAttribute('href');
    $('#badge').textContent = cart.count;
    $('#badge').classList.toggle('has', cart.count > 0);
    $('#basket').setAttribute('aria-label', `Mi carrito, ${countLabel()}`);
    $('#familyCartCount').textContent = cart.count;
    $('#familyBasket').setAttribute('aria-label', `Ver mi carrito, ${countLabel()}`);
    $('#familyOrderSummary').textContent = cart.count ? `${countLabel()} · ${money(cart.total)} MXN` : 'Tu carrito está vacío';
    $('#familyMinimum').textContent = ready ? 'Listo para continuar a WhatsApp' : `Faltan ${money(MINIMUM_ORDER - cart.total)} para tu pedido mínimo`;
    $('#storageNotice').hidden = cart.storageAvailable;
    refreshQuantities();
    if (restoreFocus && cartDialog.open) {
      (rows.values().next().value?.querySelector('.quantity button') || $('#closeCart')).focus();
    }
  }

  function openCart() {
    cartOpener = dialog.open ? $('#basket') : document.activeElement;
    if (dialog.open) closeFamily(false);
    renderCart();
    cartDialog.showModal();
    document.body.classList.add('cart-open');
    measure('view_cart', { quantity: cart.count, value: cart.total });
  }

  function closeCart() {
    cartDialog.close();
    document.body.classList.remove('cart-open');
    (cartOpener?.isConnected ? cartOpener : $('#basket')).focus();
    onInteraction();
  }

  $('#familySearch').addEventListener('input', renderFamily);
  $('#closeFamily').addEventListener('click', () => closeFamily());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeFamily(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeFamily(); });
  $('#closeCart').addEventListener('click', closeCart);
  cartDialog.addEventListener('cancel', event => { event.preventDefault(); closeCart(); });
  cartDialog.addEventListener('click', event => { if (event.target === cartDialog) closeCart(); });
  $('#basket').addEventListener('click', openCart);
  $('#familyBasket').addEventListener('click', openCart);
  $('#familyCheckout').addEventListener('click', openCart);
  $('#cartBrowse').addEventListener('click', () => { closeCart(); $('#menu').scrollIntoView(); });
  $('#whatsappOrder').addEventListener('click', event => {
    if (cart.total < MINIMUM_ORDER) { event.preventDefault(); return; }
    measure('begin_checkout', { quantity: cart.count, value: cart.total });
  });
  $$('.family-card').forEach((card, i) => {
    card.querySelector('.add').addEventListener('click', event => openFamily(i, event.currentTarget));
    card.querySelector('.poke-hit').addEventListener('click', event => openFamily(i, event.currentTarget));
  });

  function searchCatalogue() {
    const query = fold($('#catalogueSearch').value);
    const searching = query.length > 0;
    $('.cards').hidden = searching;
    $('#searchResults').hidden = !searching;
    document.body.classList.toggle('searching-menu', searching);
    $('#clearSearch').hidden = !searching;
    if (!searching) {
      $('#searchResults').replaceChildren();
      $('#catalogueResultsCount').textContent = '70 sabores en siete familias';
      return;
    }
    const words = query.split(/\s+/);
    const matches = products.filter(item => words.every(word => fold(`${item.family} ${item.kind} ${item.flavor}`).includes(word)));
    $('#searchResults').replaceChildren(...matches.map(item => productCard(item, true)));
    $('#catalogueResultsCount').textContent = `${matches.length} ${matches.length === 1 ? 'sabor encontrado' : 'sabores encontrados'}`;
    if (!matches.length) {
      const message = document.createElement('p');
      message.className = 'family-no-results';
      message.textContent = 'No encontramos ese sabor. Prueba con “fresa”, “Oreo” o “limón”.';
      $('#searchResults').append(message);
    }
    refreshQuantities();
  }
  $('#catalogueSearch').addEventListener('input', searchCatalogue);
  $('#clearSearch').addEventListener('click', () => {
    $('#catalogueSearch').value = '';
    searchCatalogue();
    $('#catalogueSearch').focus();
  });

  // Preview rotation never changes the package used by the purchase button.
  let selectedPackage = 0;
  let previewIndex = 0;
  let packageAuto = !reduced;
  let nextPreviewAt = performance.now() + 4800;
  let packagesVisible = false;
  let packageHovered = false;
  const packageButtons = packages.map((item, i) => {
    const button = document.createElement('button');
    button.className = 'package-option';
    button.setAttribute('aria-label', `Elegir ${item.name}, ${money(item.price)}`);
    const copy = document.createElement('span');
    const title = document.createElement('b');
    title.textContent = item.name;
    const detail = document.createElement('small');
    detail.textContent = item.detail;
    copy.append(title, detail);
    const price = document.createElement('strong');
    price.textContent = money(item.price);
    button.append(copy, price);
    button.addEventListener('click', () => {
      selectedPackage = i;
      packageAuto = false;
      updateSelection();
      preview(i);
      updatePlayback();
    });
    $('.package-options').append(button);
    return button;
  });

  function updatePlayback() {
    $('#autoPackage').textContent = packageAuto ? 'Ⅱ' : '▶';
    $('#autoPackage').setAttribute('aria-pressed', String(packageAuto));
    $('#autoPackage').setAttribute('aria-label', packageAuto ? 'Pausar fotos de paquetes' : 'Reproducir fotos de paquetes');
  }

  function updateSelection() {
    const item = packages[selectedPackage];
    packageButtons.forEach((button, i) => {
      button.classList.toggle('active', i === selectedPackage);
      button.setAttribute('aria-pressed', String(i === selectedPackage));
    });
    $('#buy .buy-label').textContent = `Agregar ${item.name}`;
    $('#buy .price').textContent = `${money(item.price)} MXN`;
  }

  function preview(index) {
    previewIndex = (index + packages.length) % packages.length;
    const item = packages[previewIndex];
    const photo = $('#package-photo');
    if (!reduced && photo.getAttribute('src') && photo.getAttribute('src') !== item.image) {
      photo.animate([{ opacity: .2, transform: 'translateX(12px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 450, easing: 'ease-out' });
    }
    photo.src = item.image;
    photo.alt = `${item.name}: ${item.detail}`;
    $('#package-detail').textContent = `Vista previa: ${item.name} · ${item.detail}`;
    $('#packagePosition').textContent = `${String(previewIndex + 1).padStart(2, '0')} / 05`;
    nextPreviewAt = performance.now() + 4800;
  }

  $('#prevPackage').addEventListener('click', () => { packageAuto = false; updatePlayback(); preview(previewIndex - 1); });
  $('#nextPackage').addEventListener('click', () => { packageAuto = false; updatePlayback(); preview(previewIndex + 1); });
  $('#autoPackage').addEventListener('click', () => { packageAuto = !packageAuto; updatePlayback(); nextPreviewAt = performance.now() + 4800; });
  $('.package-stage').addEventListener('pointerenter', () => { packageHovered = true; });
  $('.package-stage').addEventListener('pointerleave', () => { packageHovered = false; });
  const packageObserver = new IntersectionObserver(entries => { packagesVisible = entries[0].isIntersecting; });
  packageObserver.observe($('.package-main'));
  function tickPackages(now) {
    if (packageAuto && packagesVisible && !packageHovered && !document.hidden && !document.body.classList.contains('cart-open') && !$('.package-main').contains(document.activeElement) && now >= nextPreviewAt) preview(previewIndex + 1);
  }
  // Continue to work if the optional WebGL experience fails to initialize.
  setInterval(() => tickPackages(performance.now()), 750);
  $('#buy').addEventListener('click', () => {
    const item = packageProducts[selectedPackage];
    setQuantity(item, cart.quantity(item.id) + 1);
    const feedback = $('#packageAdded');
    feedback.textContent = `${packages[selectedPackage].name} agregado. ${countLabel()} en tu carrito.`;
    if (!reduced) $('#basket').animate([{ scale: 1 }, { scale: 1.15 }, { scale: 1 }], { duration: 250 });
  });
  window.addEventListener('storage', event => {
    if (event.key !== CART_KEY && event.key !== null) return;
    cart.restore();
    cart.notify();
  });
  cart.subscribe(renderCart);
  updateSelection();
  updatePlayback();
  preview(0);
  renderCart();
  return { openFamily, tickPackages };
}
