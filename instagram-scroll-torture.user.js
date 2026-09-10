// ==UserScript==
// @name         Instagram Scroll Torture
// @namespace    Violentmonkey Scripts
// @match        https://www.instagram.com/*
// @grant        none
// @version      2.2.0
// @author       Auditor
// @description  Bloqueo progresivo del scroll y reels para desincentivar el uso.
// @updateURL    https://raw.githubusercontent.com/maxicabrera7/Instagram-InfiniteScroll-Torture/main/instagram-scroll-torture.user.js
// @downloadURL  https://raw.githubusercontent.com/maxicabrera7/Instagram-InfiniteScroll-Torture/main/instagram-scroll-torture.user.js
// ==/UserScript==

(function () {
  'use strict';

  const DELAYS = [30, 60, 180, 300, 600, 1800];
  const UMBRAL_PIXELS = 3000;
  const UMBRAL_REELS = 4; // Bloquea cada 4 reels vistos
  const TTL_MS = 4 * 60 * 60 * 1000; // 4 horas de inactividad para reiniciar nivel

  let bloqueado = false;
  let desbloqueando = false;
  let ultimoScrollY = window.scrollY;
  let pixelesAcumulados = 0;
  let reelsVistos = 0;
  let ultimoReelId = '';

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.95);
    z-index: 2147483647; display: none; flex-direction: column;
    justify-content: center; align-items: center;
    color: #fff; font-family: system-ui, sans-serif;
  `;

  const titulo = document.createElement('h2');
  titulo.style.cssText = 'margin: 0 0 8px; font-size: 22px;';
  titulo.textContent = 'Consumo Bloqueado';

  const sub = document.createElement('p');
  sub.style.cssText = 'margin: 0 0 24px; color: #888; font-size: 13px;';

  const boton = document.createElement('button');
  boton.style.cssText = `
    padding: 14px 32px; font-size: 15px; font-weight: bold;
    background: #262626; color: #555; border: none;
    border-radius: 8px; cursor: not-allowed; min-width: 220px;
    transition: background .2s, color .2s;
  `;
  boton.disabled = true;

  overlay.append(titulo, sub, boton);
  document.body.appendChild(overlay);

  function getStorageData() {
    try {
      const data = JSON.parse(localStorage.getItem('ig_torture_state') || '{}');
      const now = Date.now();

      if (!data.timestamp || now - data.timestamp > TTL_MS) {
        return { level: 0, timestamp: now };
      }
      return data;
    } catch {
      return { level: 0, timestamp: Date.now() };
    }
  }

  function saveLevel(newLevel) {
    const data = {
      level: Math.min(newLevel, DELAYS.length - 1),
      timestamp: Date.now()
    };
    localStorage.setItem('ig_torture_state', JSON.stringify(data));
  }

  function getLevel() {
    return getStorageData().level;
  }

  function bloquearAcceso() {
    bloqueado = true;
    overlay.style.display = 'flex';

    // Frenar videos en segundo plano si estamos en reels
    document.querySelectorAll('video').forEach(v => v.pause());

    const nivel = getLevel();
    let t = DELAYS[nivel];

    sub.textContent = `Nivel #${nivel + 1} — Siguiente penalización: ${DELAYS[Math.min(nivel + 1, DELAYS.length - 1)]}s`;
    boton.disabled = true;
    boton.style.background = '#262626';
    boton.style.color = '#555';
    boton.style.cursor = 'not-allowed';
    boton.textContent = `Espera ${t}s`;

    const iv = setInterval(() => {
      t--;
      if (t > 0) {
        boton.textContent = `Espera ${t}s`;
      } else {
        clearInterval(iv);
        boton.disabled = false;
        boton.textContent = 'Continuar';
        boton.style.background = '#0095f6';
        boton.style.color = '#fff';
        boton.style.cursor = 'pointer';
      }
    }, 1000);
  }

  boton.addEventListener('click', () => {
    if (boton.disabled) return;

    const currentLevel = getLevel();
    saveLevel(currentLevel + 1);

    overlay.style.display = 'none';
    pixelesAcumulados = 0;
    reelsVistos = 0;
    ultimoScrollY = window.scrollY;

    desbloqueando = true;
    setTimeout(() => {
      desbloqueando = false;
      bloqueado = false;
    }, 200);
  });

  // Intercepción global para impedir scroll y teclas cuando está bloqueado
  window.addEventListener('wheel', (e) => {
    if (bloqueado) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, { passive: false, capture: true });

  window.addEventListener('keydown', (e) => {
    if (bloqueado && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, { capture: true });

  // Detección para feed estándar
  window.addEventListener('scroll', () => {
    if (bloqueado || desbloqueando) return;

    const diff = Math.abs(window.scrollY - ultimoScrollY);
    pixelesAcumulados += diff;
    ultimoScrollY = window.scrollY;

    if (pixelesAcumulados >= UMBRAL_PIXELS) {
      bloquearAcceso();
    }
  }, { passive: true });

  // Detección para Reels vía mutación de URL (cada reel tiene su propia ruta /reel/ID/ o /reels/ID/)
  const observer = new MutationObserver(() => {
    if (bloqueado || desbloqueando) return;

    const path = window.location.pathname;
    if (path.includes('/reel/') || path.includes('/reels/')) {
      const parts = path.split('/').filter(Boolean);
      const reelId = parts[1] || '';

      if (reelId && reelId !== ultimoReelId) {
        ultimoReelId = reelId;
        reelsVistos++;

        if (reelsVistos >= UMBRAL_REELS) {
          bloquearAcceso();
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
