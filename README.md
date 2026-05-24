# Instagram Scroll Torture

Userscript para Violentmonkey que convierte el scroll infinito de Instagram en algo deliberadamente tedioso. Cada ciertos pixels aparece un overlay de pantalla completa con un temporizador de cooldown que aumenta exponencialmente.

## Comportamiento

Cada **3000px de scroll** se dispara un bloqueo. El tiempo de espera crece en cada carga:

| Carga | Espera |
|-------|--------|
| 1     | 30s    |
| 2     | 60s    |
| 3     | 3m     |
| 4     | 5m     |
| 5     | 10m    |
| 6+    | 30m    |

El nivel se persiste en `localStorage` (`ig_torture_level`), así que sobrevive recargas de página. Para resetearlo: `localStorage.removeItem('ig_torture_level')` en la consola del navegador.

## Instalación

1. Instalar [Violentmonkey](https://violentmonkey.github.io/) para Chrome o Firefox.
2. Abrir el dashboard de Violentmonkey → **+** → *Create a new script*.
3. Reemplazar el contenido por el de `instagram-scroll-torture.user.js`.
4. `Ctrl+S` para guardar.

## Compatibilidad

Testeado en Chrome con Violentmonkey. Debería funcionar en Firefox. No funciona en mobile (los userscripts no corren en browsers móviles estándar).

## Notas técnicas

- Usa el truco `position: fixed` + `top: -scrollY` para congelar la vista sin resetear la posición del DOM, evitando el bug de scroll-to-top que tienen implementaciones con `overflow: hidden`.
- Flag `desbloqueando` + `setTimeout` de 150ms para ignorar el evento `scroll` que dispara el propio `window.scrollTo()` al restaurar posición.
- El listener usa `{ passive: true }` para no afectar el rendimiento de scroll.
