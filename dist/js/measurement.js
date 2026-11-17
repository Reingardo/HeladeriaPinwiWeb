// First-party integration point. No cookies, identifiers or customer details.
// A site's analytics provider can subscribe to `pinwi:commerce` explicitly.
export function measure(name, detail = {}) {
  document.dispatchEvent(new CustomEvent('pinwi:commerce', {
    detail: { name, ...detail },
  }));
}
