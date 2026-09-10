
(function () {
  'use strict';

  const DELAYS = [15, 30, 60, 120, 240, 480, 960, 1920];
  const PANTALLAS_PERMITIDAS = 100;
  const UMBRAL_REELS = 50;
  const UMBRAL_STORIES = 60;
  const TTL_MS = 4 * 60 * 60 * 1000;

  let bloqueado = false;
  let desbloqueando = false;
  let ultimoScrollY = window.scrollY;
  let pixelesAcumulados = 0;
  let reelsVistos = 0;
  let historiasVistas = 0;
  let ultimoReelId = '';
  let ultimaHistoriaPath = '';
  let temporizadorId = null;
  let segundosRestantes = 0;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed !important; inset: 0 !important; background: rgba(0,0,0,0.98) !important;
    z-index: 2147483647 !important; display: none; flex-direction: column !important;
    justify-content: center !important; align-items: center !important;
    color: #fff !important; font-family: system-ui, sans-serif !important;
    visibility: visible !important; opacity: 1 !important;
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

  const observerDefensa = new MutationObserver((mutations) => {
    if (!bloqueado) return;
    for (const m of mutations) {
      if (m.type === 'childList' && Array.from(m.removedNodes).includes(overlay)) {
        location.reload();
      }
      if (m.type === 'attributes' && m.target === overlay) {
        const style = window.getComputedStyle(overlay);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          location.reload();
        }
      }
    }
  });

  function insertarOverlay() {
    const init = () => {
      document.body.appendChild(overlay);
      observerDefensa.observe(document.body, { childList: true, subtree: true });
      observerDefensa.observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
    };
    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
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
    const actualizado = { ...actual, ...patch, timestamp: Date.now() };
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
    if (bloqueado && forzarSegundos === null) return;
    bloqueado = true;
    overlay.style.setProperty('display', 'flex', 'important');

    document.querySelectorAll('video, audio').forEach(v => {
      v.pause();
      v.muted = true;
    });

    const nivel = getLevel();
    segundosRestantes = forzarSegundos !== null ? forzarSegundos : DELAYS[nivel];

    setStorageData({ bloqueado: true, segundosRestantes, level: nivel });

    sub.textContent = `Nivel #${nivel + 1} — Siguiente penalización: ${DELAYS[Math.min(nivel + 1, DELAYS.length - 1)]}s`;
    boton.disabled = true;
    boton.style.background = '#262626';
    boton.style.color = '#555';
    boton.style.cursor = 'not-allowed';
    boton.textContent = `Espera ${segundosRestantes}s`;

    if (temporizadorId) clearInterval(temporizadorId);
    temporizadorId = setInterval(tick, 1000);
  }

  function liberarAccesoLocal() {
    overlay.style.setProperty('display', 'none', 'important');
    pixelesAcumulados = 0;
    reelsVistos = 0;
    historiasVistas = 0;
    ultimoScrollY = window.scrollY;
    
    if (temporizadorId) clearInterval(temporizadorId);
    temporizadorId = null;

    desbloqueando = true;
    setTimeout(() => {
      desbloqueando = false;
      bloqueado = false;
    }, 200);
  }

  boton.addEventListener('click', () => {
    if (boton.disabled) return;

    const proximoNivel = Math.min(getLevel() + 1, DELAYS.length - 1);
    setStorageData({
      level: proximoNivel,
      bloqueado: false,
      segundosRestantes: 0
    });

    liberarAccesoLocal();
  });

  // Sincronización multi-pestaña reactiva
  window.addEventListener('storage', (e) => {
    if (e.key === 'ig_torture_state') {
      const data = JSON.parse(e.newValue || '{}');
      if (data.bloqueado && !bloqueado) {
        bloquearAcceso(data.segundosRestantes);
      } else if (!data.bloqueado && bloqueado) {
        liberarAccesoLocal();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (bloqueado && boton.disabled) {
      boton.textContent = document.hidden ? 'En pausa (vuelve a la pestaña)' : `Espera ${segundosRestantes}s`;
    }
  });

  // Supresión total de gestos: rueda y táctil
  function anularInteraccion(e) {
    if (bloqueado) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }
  window.addEventListener('wheel', anularInteraccion, { passive: false, capture: true });
  window.addEventListener('touchstart', anularInteraccion, { passive: false, capture: true });
  window.addEventListener('touchmove', anularInteraccion, { passive: false, capture: true });

  window.addEventListener('keydown', (e) => {
    if (bloqueado && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, { capture: true });

  // Intercepción de reproducción multimedia asíncrona
  window.addEventListener('play', (e) => {
    if (bloqueado && e.target instanceof HTMLMediaElement) {
      e.target.pause();
      e.target.muted = true;
    }
  }, { capture: true });

  window.addEventListener('scroll', () => {
    if (bloqueado || desbloqueando) return;

    const actualY = window.scrollY;
    const delta = actualY - ultimoScrollY;

    if (delta > 0) {
      pixelesAcumulados += delta;
      if (pixelesAcumulados >= (window.innerHeight * PANTALLAS_PERMITIDAS)) {
        bloquearAcceso();
      }
    }
    ultimoScrollY = actualY;
  }, { passive: true });

  function evaluarCambioRuta() {
    if (bloqueado || desbloqueando) return;
    const path = window.location.pathname;

    if (path.includes('/reel/') || path.includes('/reels/')) {
      const reelId = path.split('/').filter(Boolean)[1] || '';
      if (reelId && reelId !== ultimoReelId) {
        ultimoReelId = reelId;
        reelsVistos++;
        if (reelsVistos >= UMBRAL_REELS) bloquearAcceso();
      }
    } else if (path.includes('/stories/')) {
      if (path !== ultimaHistoriaPath) {
        ultimaHistoriaPath = path;
        historiasVistas++;
        if (historiasVistas >= UMBRAL_STORIES) bloquearAcceso();
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

  const estadoPrevio = getStorageData();
  if (estadoPrevio.bloqueado) {
    bloquearAcceso(DELAYS[estadoPrevio.level]);
  }
})();
