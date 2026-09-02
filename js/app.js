import './resetScoresModal.js';
import { initRouter, setupGameScreen, refreshCurrentView } from './router.js';
import { gameRegistry } from './gameRegistry.js';
import { setupUsers, updateUserBadge } from './users.js';
import { setupRequestGame } from './requestGame.js';
import { storage } from './storage.js';
import { initLobby } from './lobby.js';
import { initTheme, renderToolPair, syncThemeToggleUI } from './theme.js';
import { initPwa, renderHeaderInstallButton, refreshInstallButtons } from './pwa.js';
import { initCrossTabSync } from './sync.js';
import { renderSoundToggle, syncSoundToggleUI } from './sound.js';
import { initShortcuts } from './shortcutsHelp.js';

async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch { /* offline optional */ }
  }
}

function mountToolbars() {
  const pair = renderToolPair();
  const install = renderHeaderInstallButton();
  const sound = renderSoundToggle();
  document.getElementById('headerTools').innerHTML = install + pair + sound;
  document.getElementById('sidebarTools').innerHTML = pair + sound;
  document.getElementById('gameScreenTools').innerHTML = pair + sound;
  syncThemeToggleUI();
  syncSoundToggleUI();
  refreshInstallButtons();
}

function updateOnlineStatus() {
  const badge = document.getElementById('onlineBadge');
  badge?.classList.toggle('offline', !navigator.onLine);
}

function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const open = () => { sidebar.classList.add('open'); sidebar.setAttribute('aria-hidden', 'false'); };
  const close = () => { sidebar.classList.remove('open'); sidebar.setAttribute('aria-hidden', 'true'); };

  document.getElementById('menuBtn')?.addEventListener('click', open);
  document.getElementById('sidebarClose')?.addEventListener('click', close);
  document.getElementById('sidebarBackdrop')?.addEventListener('click', close);
  sidebar.querySelectorAll('.sidebar-link').forEach(link => link.addEventListener('click', close));
}

function runSplash() {
  return new Promise(resolve => {
    const splash = document.getElementById('splash');
    const fill = document.getElementById('splashFill');
    const status = document.getElementById('splashStatus');
    const steps = [
      { pct: 20, text: 'Initializing arcade…' },
      { pct: 45, text: `Loading ${gameRegistry.length} games…` },
      { pct: 70, text: 'Preparing canvas engines…' },
      { pct: 90, text: 'Restoring local scores…' },
      { pct: 100, text: 'Ready!' },
    ];
    let i = 0;

    const tick = () => {
      if (i >= steps.length) {
        splash.classList.add('fade-out');
        setTimeout(resolve, 600);
        return;
      }
      fill.style.width = steps[i].pct + '%';
      status.textContent = steps[i].text;
      i++;
      setTimeout(tick, 350 + Math.random() * 200);
    };
    tick();
  });
}

async function boot() {
  initTheme();
  initPwa();
  mountToolbars();
  initShortcuts();

  updateOnlineStatus();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  setupSidebar();
  setupGameScreen();
  storage.init();
  initLobby();
  setupUsers(refreshCurrentView);
  setupRequestGame();

  initCrossTabSync(() => {
    refreshCurrentView();
    updateUserBadge();
  });

  await runSplash();

  if (!location.hash || location.hash === '#/') {
    location.hash = '#/lobby';
  }

  initRouter();
  registerSW();
}

boot();
