# Helados Pinwi Pinwi

Sitio estático con siete familias, 70 sabores, cinco paquetes, carrito persistente y pedidos por WhatsApp. Conserva la identidad rosa, azul y ciruela, el carrusel 3D y el producto que viaja a su tarjeta con scroll nativo.

## Desarrollo

Requiere Node.js. No necesita instalar dependencias de aplicación.

```powershell
node scripts/build.mjs
node scripts/serve.mjs
```

Abre http://127.0.0.1:4187. Para cambiar el puerto: `node scripts/serve.mjs 4188`. Después de editar `src/` o `public/`, vuelve a ejecutar el build y recarga el navegador.

```powershell
node scripts/check.mjs
node --test
git diff --check
```

Vercel ejecuta `node scripts/build.mjs` y publica `dist/`. Los pushes a `main` despliegan automáticamente. Los cambios locales no se publican al ejecutar el build.

## Estructura

- `src/index.html`: contenido, SEO, sucursales y diálogos.
- `src/js/catalog.js`: familias, sabores, precios, paquetes y recursos.
- `src/js/cart.js`: cantidades, validación, persistencia y resumen del pedido.
- `src/js/shop.js`: búsqueda global, filtros, controles, carrito y vistas previas de paquetes.
- `src/js/experience.js`: carrusel, Three.js, producto viajero y alternativas sin WebGL.
- `src/js/main.js`: inicia primero la tienda y después la experiencia visual opcional.
- `src/js/measurement.js`: eventos de integración para analítica.
- `src/styles.css`: estilos de la experiencia visual.
- `src/shop.css`: tienda, accesibilidad y ajustes responsivos.
- `public/assets/`: fuentes e imágenes optimizadas, servidas desde el mismo dominio.
- `public/assets/manifest.json`: procedencia de las imágenes migradas.
- `assets/recortes/`: originales y prompts archivados de los representantes.
- `scripts/build.mjs`: genera las tarjetas estáticas y copia los módulos y recursos a `dist/`.
- `tests/cart.test.js`: persistencia, precios vigentes, datos inválidos, mínimo y resumen.

`src/` y `public/` son las fuentes; no editar directamente `dist/`. El proyecto usa módulos ES sin framework: el catálogo y el estado de compra se separan de la animación, sin añadir un runtime de interfaz.

## Compra y accesibilidad

El carrito guarda únicamente IDs y cantidades en `localStorage` bajo `pinwi.cart.v1`. Al recuperar un pedido, usa nombres, fotos y precios del catálogo actual. Sin almacenamiento disponible, sigue funcionando en memoria y muestra un aviso. Se sincroniza entre pestañas del mismo origen. Cambiar de dominio o navegador no transfiere el carrito.

Las cantidades se pueden escribir (0–9999) o ajustar con botones de 44 × 44 px. Los cambios conservan los controles y el foco; al eliminar una línea, el foco pasa a otra línea o al cierre del carrito. El buscador global admite palabras y acentos opcionales. Dentro de cada familia hay búsqueda, filtros y un resumen fijo con acceso al carrito.

La reproducción de fotos de paquetes es una vista previa independiente. No cambia el paquete seleccionado ni el producto que agrega el botón. Elegir un paquete o usar anterior/siguiente pausa la reproducción; el control de reproducción permite retomarla.

La tienda se inicia antes de importar Three.js. Si falla WebGL, utiliza fotografías. Incluye una versión ligera (`?view=simple#menu`), sin cargar la experiencia 3D y con las fotos de paquetes pausadas. Sin JavaScript siguen disponibles las familias estáticas, las sucursales y el contacto por WhatsApp. Se respeta `prefers-reduced-motion`, y el trabajo de animación se pausa con la pestaña oculta.

## Información comercial

Pedido mínimo: $400 MXN. Paquetes: Pinwi $500, Bollos $480, Fiesta $695, Esquimales $445 y Surtido $1,090 MXN. El enlace prepara un borrador para WhatsApp 833 393 2616; la persona revisa y envía. El sitio no cobra ni confirma pedidos automáticamente.

La cobertura exacta por colonia, los días de atención y el horario de entrega deben confirmarse con el negocio. No se inventaron condiciones ni días de apertura en los datos estructurados. Los botones de mapas buscan las direcciones publicadas, sin inventar coordenadas.

Facebook oficial: https://www.facebook.com/heladospinwi. Referencia de catálogo y marca: https://sitio-pinwi.vercel.app/. Las imágenes son ilustrativas. Las imágenes del catálogo y sucursales se alojan localmente; los originales de recortes se conservan.

## Medición

Se emite `pinwi:commerce` en `document` para `view_family`, `view_cart`, `add_to_cart`, `remove_from_cart` y `begin_checkout`. Los detalles contienen ID del producto, cantidad, importe o familia, según el evento. No incluyen nombres de personas, direcciones ni identificadores de seguimiento.

```js
document.addEventListener('pinwi:commerce', ({ detail }) => {
  // Enviar detail al proveedor de analítica configurado para el sitio.
});
```

No hay un proveedor de analítica ni un panel conectado. `begin_checkout` mide el clic hacia WhatsApp, no el envío del mensaje ni una venta confirmada.

## Verificación de interfaz

Comprobar escritorio (1440 × 900), móvil (390 × 844 y 320 px), horizontal (844 × 390) y tablet (768 × 1024). Revisar apertura y cierre de diálogos, búsqueda sin resultados, filtros, cantidades escritas, foco, persistencia tras recarga, eliminación, mínimo exacto, enlace de WhatsApp y selección independiente de las fotos de paquetes. No enviar pedidos de prueba al negocio.

## Publicación

Producción principal: https://heladeriapinwiweb.vercel.app/. Copia en GitHub Pages: https://reingardo.github.io/HeladeriaPinwiWeb/.

Las rutas de recursos son relativas para funcionar en ambos dominios. Vercel se mantiene como URL canónica. Pages publica la rama `gh-pages` desde la raíz, con `.nojekyll` y un `deployment.json` que identifica el commit fuente.

Para actualizar ambos destinos después de revisar los cambios:

```powershell
node scripts/check.mjs
node --test
node scripts/build.mjs
git add README.md vercel.json package.json src public scripts tests dist
git commit -m "Actualiza la tienda Pinwi"
git push origin main
node scripts/publish-pages.mjs
```

El push de `main` actualiza Vercel mediante su integración Git. El script publica la distribución revisada en `gh-pages`, sin cambiar la rama de trabajo ni usar pushes forzados. GitHub genera automáticamente el despliegue de Pages desde esa rama. Verificar ambos despliegues y sus recursos antes de dar la publicación por terminada.
