// ==UserScript==
// @name         Instagram Scroll Torture
// @namespace    Violentmonkey Scripts
// @match        https://www.instagram.com/*
// @grant        none
// @version      2.3.0
// @author       maxicabrera7
// @description  Bloqueo progresivo del scroll y reels con persistencia anti-recarga y métrica relativa.
// @updateURL    https://raw.githubusercontent.com/maxicabrera7/Instagram-InfiniteScroll-Torture/main/instagram-scroll-torture.user.js
// @downloadURL  https://raw.githubusercontent.com/maxicabrera7/Instagram-InfiniteScroll-Torture/main/instagram-scroll-torture.user.js
// ==/UserScript==

(function () {
  'use strict';

  const DELAYS = [15, 30, 60, 120, 240, 480, 960, 1920];
  const PANTALLAS_PERMITIDAS = 100;
  const UMBRAL_REELS = 50;
  const TTL_MS = 4 * 60 * 60 * 1000;

  let bloqueado = false;
  let desbloqueando = false;
  let ultimoScrollY = window.scrollY;
  let pixelesAcumulados = 0;
  let reelsVistos = 0;
  let ultimoReelId = '';
  let temporizadorId = null;
  let segundosRestantes = 0;

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

  function insertarOverlay() {
    if (document.body) {
      document.body.appendChild(overlay);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));
    }
  }
  insertarOverlay();

  function getStorageData() {
    try {
      const data = JSON.parse(localStorage.getItem('ig_torture_state') || '{}');
      const now = Date.now();
      if (!data.timestamp || now - data.timestamp > TTL_MS) {
        return { level: 0, timestamp: now, bloqueado: false, segundosRestantes: 0 };
      }
      return data;
    } catch {
      return { level: 0, timestamp: Date.now(), bloqueado: false, segundosRestantes: 0 };
    }
  }

  function setStorageData(patch) {
    const actual = getStorageData();
    const actualizado = {
      ...actual,
      ...patch,
      timestamp: Date.now()
    };
    localStorage.setItem('ig_torture_state', JSON.stringify(actualizado));
  }

  function getLevel() {
    return getStorageData().level || 0;
  }

  function tick() {
    if (document.hidden) return;

    segundosRestantes--;
    setStorageData({ segundosRestantes });

    if (segundosRestantes > 0) {
      boton.textContent = `Espera ${segundosRestantes}s`;
    } else {
      clearInterval(temporizadorId);
      temporizadorId = null;
      boton.disabled = false;
      boton.textContent = 'Continuar';
      boton.style.background = '#0095f6';
      boton.style.color = '#fff';
      boton.style.cursor = 'pointer';
    }
  }

  function bloquearAcceso(forzarSegundos = null) {
    bloqueado = true;
    overlay.style.display = 'flex';

    document.querySelectorAll('video').forEach(v => {
      v.pause();
      v.muted = true;
    });

    const nivel = getLevel();
    // Si se recargó la página mientras estaba bloqueado, se reinicia la penalización completa del nivel
    segundosRestantes = forzarSegundos !== null ? forzarSegundos : DELAYS[nivel];

    setStorageData({
      bloqueado: true,
      segundosRestantes,
      level: nivel
    });

    sub.textContent = `Nivel #${nivel + 1} — Siguiente penalización: ${DELAYS[Math.min(nivel + 1, DELAYS.length - 1)]}s`;
    boton.disabled = true;
    boton.style.background = '#262626';
    boton.style.color = '#555';
    boton.style.cursor = 'not-allowed';
    boton.textContent = `Espera ${segundosRestantes}s`;

    if (temporizadorId) clearInterval(temporizadorId);
    temporizadorId = setInterval(tick, 1000);
  }

  boton.addEventListener('click', () => {
    if (boton.disabled) return;

    const proximoNivel = Math.min(getLevel() + 1, DELAYS.length - 1);
    setStorageData({
      level: proximoNivel,
      bloqueado: false,
      segundosRestantes: 0
    });

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

  document.addEventListener('visibilitychange', () => {
    if (bloqueado && boton.disabled) {
      if (document.hidden) {
        boton.textContent = 'En pausa (vuelve a la pestaña)';
      } else {
        boton.textContent = `Espera ${segundosRestantes}s`;
      }
    }
  });

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

  window.addEventListener('scroll', () => {
    if (bloqueado || desbloqueando) return;

    const actualY = window.scrollY;
    const delta = actualY - ultimoScrollY;

    if (delta > 0) {
      pixelesAcumulados += delta;
      const limiteDinamico = window.innerHeight * PANTALLAS_PERMITIDAS;

      if (pixelesAcumulados >= limiteDinamico) {
        bloquearAcceso();
      }
    }

    ultimoScrollY = actualY;
  }, { passive: true });

  function evaluarCambioRuta() {
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
  }

  const patchHistory = (type) => {
    const original = history[type];
    return function (...args) {
      const result = original.apply(this, args);
      evaluarCambioRuta();
      return result;
    };
  };

  history.pushState = patchHistory('pushState');
  history.replaceState = patchHistory('replaceState');
  window.addEventListener('popstate', evaluarCambioRuta);

  // Inicialización: verificar si se recargó la página con un bloqueo pendiente
  const estadoPrevio = getStorageData();
  if (estadoPrevio.bloqueado) {
    // Si intentó refrescar para saltarse el castigo, se le impone el tiempo completo del nivel
    bloquearAcceso(DELAYS[estadoPrevio.level]);
  }
})();
