# Helados Pinwi Pinwi

Landing page de un solo archivo, adaptada de la experiencia Stride a Helados Pinwi Pinwi. Conserva el carrusel 3D y la paleta que viaja con el scroll, con identidad rosa/azul/ciruela, logo original, siete familias, 70 sabores y cinco paquetes de la web de referencia.

Vista local: `python -m http.server 4173 --directory dist`.

`dist/index.html` contiene CSS, JavaScript, cuatro fuentes WOFF2 e imÃ¡genes de referencia incrustadas. Three.js 0.160.0 se carga desde jsDelivr. Los modelos de paleta y sus vistas planas se construyen en WebGL usando las imÃ¡genes ilustrativas de la web original.

Referencia de marca, fotos, sabores y precios: https://sitio-pinwi.vercel.app/ . Paletas de leche: $20 MXN; Paquete Pinwi: $500; Bollos: $480; Fiesta: $695. Pedido mÃ­nimo: $400. Disponibilidad, cobertura y entrega se confirman con el negocio.

Carrito local con cantidades, eliminaciÃ³n de productos y resumen de pedido. El botÃ³n de WhatsApp abre un borrador para el nÃºmero de la web de referencia; la persona usuaria revisa y envÃ­a el mensaje. La pÃ¡gina no cobra ni confirma pedidos automÃ¡ticamente.

ValidaciÃ³n: sintaxis JavaScript, carga de las cuatro fuentes, WebGL sin errores, selecciÃ³n de sabores/paquetes, subtotal y pedido mÃ­nimo, y vistas de escritorio/mÃ³vil. Reduce movimiento segÃºn las preferencias del sistema.


## Familias y menÃºs

El carrusel y las siete tarjetas representan Pinwis (17 sabores), Bollos (13), Nieves (7), Esquimales (4), Artesanales (11), Paletas de agua (9) y Paletas de leche (9). Tocar una familia abre su menÃº con fotos, bÃºsqueda, filtros por tipo cuando corresponde y cantidades conectadas al carrito. La etiqueta de navegaciÃ³n es Productos.

Los cinco paquetes cambian automÃ¡ticamente con una transiciÃ³n de fotos mientras la secciÃ³n estÃ¡ visible. Incluye controles anterior/siguiente y pausa; respeta movimiento reducido, pestaÃ±a oculta y actividad del visitante. Los modelos 3D de cada familia son representaciones ilustrativas; las fotos y los precios del menÃº proceden del sitio de referencia.


Los enlaces del pie apuntan al catálogo y a las sucursales dentro de la misma página. Los recortes fotográficos de Pinwis, Bollos y Nieves, sus referencias y sus prompts se conservan en `assets/recortes/`.


## Revisión de navegación y productos

Se retiró todo el tramo fijado y numerado. El menú sigue inmediatamente al carrusel y la rueda usa desplazamiento nativo. La navegación contiene Productos, Menú, Paquetes y Visítanos. El producto viajero pasa directamente a su tarjeta.

La familia Esquimales se representa con el esquimal con nuez; Bollos con el bollo Oreo en bolsa ancha. Los nuevos recortes se guardan como `assets/recortes/pinwi-esquimal-nuez.png` y `assets/recortes/pinwi-bollo-oreo-v2.png`. Prompts de ImageGen integrado: `assets/recortes/prompts-v2.json`.

El pie incluye Facebook oficial (@heladospinwi) y WhatsApp (833 393 2616), según el sitio de referencia. Los enlaces de menú y sucursales siguen siendo anclas internas.
