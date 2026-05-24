// ==UserScript==
// @name         Instagram Scroll Torture
// @namespace    Violentmonkey Scripts
// @match        https://www.instagram.com/*
// @grant        none
// @version      2.0
// @author       Auditor
// @description  Bloqueo progresivo del scroll para desincentivar el uso.
// @updateURL    https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/instagram-scroll-torture.user.js
// @downloadURL  https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/instagram-scroll-torture.user.js
// ==/UserScript==

(function () {
  'use strict';

  const DELAYS = [30, 60, 180, 300, 600, 1800];
  const UMBRAL = 3000;

  let bloqueado     = false;
  let desbloqueando = false;
  let ultimoScroll  = 0;
  let savedScrollY  = 0;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.95);
    z-index: 2147483647; display: none; flex-direction: column;
    justify-content: center; align-items: center;
    color: #fff; font-family: system-ui, sans-serif;
  `;

  const titulo = document.createElement('h2');
  titulo.style.cssText = 'margin: 0 0 8px; font-size: 22px;';
  titulo.textContent = 'Scroll Bloqueado';

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

  function getLevel() {
    return Math.min(parseInt(localStorage.getItem('ig_torture_level') || '0', 10), DELAYS.length - 1);
  }

  function lockBody() {
    savedScrollY = window.scrollY;
    document.body.style.cssText += `
      position: fixed; top: -${savedScrollY}px; left: 0;
      width: 100%; overflow-y: scroll;
    `;
  }

  function unlockBody() {
    document.body.style.position  = '';
    document.body.style.top       = '';
    document.body.style.left      = '';
    document.body.style.width     = '';
    document.body.style.overflowY = '';
    desbloqueando = true;
    window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    setTimeout(() => { desbloqueando = false; }, 150);
  }

  function ejecutarBloqueo() {
    bloqueado = true;
    lockBody();
    overlay.style.display = 'flex';

    const nivel = getLevel();
    let t = DELAYS[nivel];

    sub.textContent    = `Carga #${nivel + 1} — próxima espera: ${DELAYS[Math.min(nivel + 1, DELAYS.length - 1)]}s`;
    boton.disabled     = true;
    boton.style.background = '#262626';
    boton.style.color      = '#555';
    boton.style.cursor     = 'not-allowed';
    boton.textContent      = `Desbloquear en ${t}s`;

    const iv = setInterval(() => {
      t--;
      if (t > 0) {
        boton.textContent = `Desbloquear en ${t}s`;
      } else {
        clearInterval(iv);
        boton.disabled         = false;
        boton.textContent      = 'Continuar';
        boton.style.background = '#0095f6';
        boton.style.color      = '#fff';
        boton.style.cursor     = 'pointer';
      }
    }, 1000);
  }

  boton.addEventListener('click', () => {
    if (boton.disabled) return;

    const lvl = getLevel();
    if (lvl < DELAYS.length - 1) {
      localStorage.setItem('ig_torture_level', lvl + 1);
    }

    overlay.style.display = 'none';
    unlockBody();

    setTimeout(() => {
      ultimoScroll = savedScrollY;
      bloqueado = false;
    }, 160);
  });

  window.addEventListener('scroll', () => {
    if (bloqueado || desbloqueando) return;
    if (window.scrollY - ultimoScroll >= UMBRAL) {
      ejecutarBloqueo();
    }
  }, { passive: true });

})();