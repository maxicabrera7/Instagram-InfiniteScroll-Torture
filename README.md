# Instagram Scroll Torture

Mecanismo de fricción determinista diseñado para desincentivar el consumo compulsivo en Instagram Web. Intercepta navegación SPA, penaliza intentos de evasión y escala tiempos muertos de forma progresiva.

## Métricas de Activación y Umbrales

El bloqueo se dispara al alcanzar cualquiera de las siguientes condiciones en una sesión activa:

* **Feed:** Desplazamiento acumulado descendente equivalente a **100 pantallas** (`window.innerHeight * 100`).
* **Reels:** **50 reproducciones** registradas mediante mutaciones de ruta.
* **Stories:** **60 transiciones** de historias navegadas.

### Escalamiento de Penalizaciones

| Nivel | Tiempo de Espera |
| :---: | :---: |
| 1 | 15s |
| 2 | 30s |
| 3 | 60s (1m) |
| 4 | 120s (2m) |
| 5 | 240s (4m) |
| 6 | 480s (8m) |
| 7 | 960s (16m) |
| 8+ | 1920s (32m) |

* **TTL de Sesión:** Si transcurren más de **4 horas** de inactividad continua, el contador de nivel se reinicia a cero automáticamente.

## Arquitectura y Mecanismos Anti-Evasión

* **Intercepción SPA:** Sobrescribe `history.pushState` y `history.replaceState` junto al evento `popstate`. Rastrea cambios de ruta en tiempo real sin sobrecargar el hilo principal.
* **Autodefensa del DOM:** Un `MutationObserver` vigila exclusivamente el nodo del overlay. Si se elimina o se alteran propiedades CSS críticas (`display`, `visibility`, `opacity`), fuerza un `location.reload()`.
* **Penalización por recarga (Anti-F5):** El estado de bloqueo persiste en `localStorage`. Si la página se recarga durante una cuenta regresiva, el temporizador se reinicia desde el valor completo asignado a ese nivel.
* **Sincronización multi-pestaña:** Escucha el evento `window.storage`. Cualquier bloqueo o desbloqueo se replica simultáneamente en todas las instancias abiertas de Instagram.
* **Congelación por desenfoque:** Utiliza la Page Visibility API (`visibilitychange`). El temporizador se pausa si la pestaña pierde el foco o se minimiza.
* **Bloqueo en fase de captura:** Cancela la propagación (`stopImmediatePropagation`) de eventos `wheel`, `touchstart`, `touchmove` y teclas de desplazamiento.
* **Silenciamiento asíncrono:** Captura eventos globales `play` para pausar y mutear elementos multimedia inyectados dinámicamente.

## Despliegue

### Opción A: Userscript Convencional (Violentmonkey)

1. Instalar [Violentmonkey](https://violentmonkey.github.io/).
2. Instalar el script directamente desde el repositorio [haciendo clic aquí](https://raw.githubusercontent.com/maxicabrera7/Instagram-InfiniteScroll-Torture/main/instagram-scroll-torture.user.js).

### Opción B: Forzado por Directiva de Sistema (Linux / Firefox)

Instalación a nivel corporativo mediante `policies.json`. Despliega un binario `.xpi` previamente firmado por Mozilla e incluido en este repositorio. Esto anula la desinstalación desde el gestor de complementos, deshabilita el modo incógnito para evitar la evasión y soporta tanto instalaciones nativas (RPM/DEB) como Flatpak.

Ejecutar en terminal:

```bash
git clone [https://github.com/maxicabrera7/Instagram-InfiniteScroll-Torture.git](https://github.com/maxicabrera7/Instagram-InfiniteScroll-Torture.git) ~/dev/ig-blocker
cd ~/dev/ig-blocker
bash install.sh
```
### Desinstalación (Instalación por Directiva)

La directiva `force_installed` impide deshabilitar o eliminar la extensión desde la interfaz gráfica (`about:addons`). Para removerla, es necesario purgar el archivo de políticas a nivel de sistema operativo y matar los procesos en memoria.

**Firefox Nativo (RPM/DEB):**

```bash
sudo rm -f /etc/firefox/policies/policies.json
pkill -f firefox
```

**Firefox Flatpak:**

```bash
rm -f ~/.var/app/org.mozilla.firefox/config/firefox/policies/policies.json
flatpak override --user --reset org.mozilla.firefox
flatpak kill org.mozilla.firefox
```