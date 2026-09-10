#!/usr/bin/env bash
set -euo pipefail

# 1. Asegurar dependencias de empaquetado
if ! command -v zip &>/dev/null; then
  sudo dnf install -y zip
fi

# 2. Determinar directorio raíz del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "instagram-scroll-torture.user.js" ]; then
  echo "Error: No se encuentra instagram-scroll-torture.user.js en $SCRIPT_DIR" >&2
  exit 1
fi

# 3. Generar manifest y extraer runtime
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
      "matches": ["https://www.instagram.com/*"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
EOF

# Limpieza de cabeceras de userscript
sed '/^\/\/[[:space:]]*==UserScript==/,/^\/\/[[:space:]]*==\/UserScript==/d' instagram-scroll-torture.user.js > content.js
zip -r -FS ig-torture.xpi manifest.json content.js
chmod 644 ig-torture.xpi

XPI_PATH="${SCRIPT_DIR}/ig-torture.xpi"

# 4. Inyección según tipo de instalación de Firefox
if command -v flatpak &>/dev/null && flatpak list --app | grep -q "org.mozilla.firefox"; then
  POLICIES_DIR="$HOME/.var/app/org.mozilla.firefox/config/firefox/policies"
  mkdir -p "$POLICIES_DIR"
  cat << EOF > "$POLICIES_DIR/policies.json"
{
  "policies": {
    "ExtensionSettings": {
      "ig-torture@maxicabrera.dev": {
        "installation_mode": "force_installed",
        "install_url": "file://${XPI_PATH}"
      }
    },
    "DisableDeveloperTools": false,
    "DisablePrivateBrowsing": true
  }
}
EOF
  flatpak override --user --filesystem="${XPI_PATH}:ro" org.mozilla.firefox
  flatpak kill org.mozilla.firefox || true
  flatpak run org.mozilla.firefox &
else
  sudo mkdir -p /etc/firefox/policies
  sudo tee /etc/firefox/policies/policies.json > /dev/null << EOF
{
  "policies": {
    "ExtensionSettings": {
      "ig-torture@maxicabrera.dev": {
        "installation_mode": "force_installed",
        "install_url": "file://${XPI_PATH}"
      }
    },
    "DisableDeveloperTools": false,
    "DisablePrivateBrowsing": true
  }
}
EOF
  pkill -f firefox || true
  firefox &
fi
