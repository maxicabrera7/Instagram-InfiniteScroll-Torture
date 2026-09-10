#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
XPI_PATH="${SCRIPT_DIR}/ig-torture.xpi"

if [ ! -f "$XPI_PATH" ]; then
  echo "Error: No se encuentra ig-torture.xpi en $SCRIPT_DIR" >&2
  exit 1
fi

chmod 644 "$XPI_PATH"

if command -v flatpak &>/dev/null && flatpak list --app 2>/dev/null | grep -q "org.mozilla.firefox"; then
  POLICIES_DIR="$HOME/.var/app/org.mozilla.firefox/config/firefox/policies"
  mkdir -p "$POLICIES_DIR"
  cat << POLICIES_EOF > "$POLICIES_DIR/policies.json"
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
POLICIES_EOF
  flatpak override --user --filesystem="${XPI_PATH}:ro" org.mozilla.firefox
  flatpak kill org.mozilla.firefox 2>/dev/null || true
  sleep 1
  flatpak run org.mozilla.firefox &
else
  sudo mkdir -p /etc/firefox/policies
  sudo tee /etc/firefox/policies/policies.json > /dev/null << POLICIES_EOF
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
POLICIES_EOF
  pkill -f firefox 2>/dev/null || true
  while pgrep -f firefox > /dev/null; do sleep 0.5; done
  nohup firefox >/dev/null 2>&1 &
fi
