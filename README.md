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
2. Crear un nuevo script y pegar el contenido de `instagram-scroll-torture.user.js`.
3. Guardar cambios (`Ctrl+S`).

### Opción B: Forzado por Directiva de Sistema (Fedora Linux / Firefox)

Instala la extensión a nivel corporativo en el sistema operativo: impide deshabilitarla o removerla desde la interfaz gráfica de complementos y anula el modo incógnito.

Ejecutar en terminal:

```bash
# 1. Clonar repositorio en la ruta de trabajo
mkdir -p ~/dev && cd ~/dev
git clone [https://github.com/maxicabrera7/Instagram-InfiniteScroll-Torture.git](https://github.com/maxicabrera7/Instagram-InfiniteScroll-Torture.git) ig-blocker
cd ig-blocker

# 2. Generar el manifiesto para Firefox
cat << 'EOF' > manifest.json
{
  "manifest_version": 3,
  "name": "Instagram Scroll Torture",
  "version": "2.6.0",
  "description": "Bloqueo progresivo e ineludible para Instagram",
  "browser_specific_settings": {
    "gecko": {
      "id": "ig-torture@maxicabrera.dev"
    }
  },
  "content_scripts": [
    {
      "matches": ["[https://www.instagram.com/](https://www.instagram.com/)*"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
EOF

# 3. Extraer el código JavaScript descartando las cabeceras de Violentmonkey
sed '/^\/\/ ==UserScript==/,/^\/\/ ==\/UserScript==/d' instagram-scroll-torture.user.js > content.js

# 4. Empaquetar la extensión en formato XPI
zip -r -FS ig-torture.xpi manifest.json content.js
chmod 644 ig-torture.xpi

# 5. Escribir la política de sistema en Firefox
sudo mkdir -p /etc/firefox/policies
sudo tee /etc/firefox/policies/policies.json > /dev/null << EOF
{
  "policies": {
    "ExtensionSettings": {
      "ig-torture@maxicabrera.dev": {
        "installation_mode": "force_installed",
        "install_url": "file://${PWD}/ig-torture.xpi"
      }
    },
    "DisableDeveloperTools": false,
    "DisablePrivateBrowsing": true
  }
}
EOF

# 6. Reiniciar Firefox para cargar las directivas
pkill -f firefox || true
firefox &
