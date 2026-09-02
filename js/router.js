import { gameRegistry, getGame, getCategories, getGamesByCategory, getTotalPlays, getGamesPlayedCount, renderGameInstructions } from './gameRegistry.js';
import { storage } from './storage.js';
import { renderPlayersPage, bindPlayersPage } from './users.js';
import { isLobbyRoute, getLobbyView, showLobbyView, hideLobbyScreen } from './lobby.js';

let activeGameCleanup = null;
let activeFilter = 'All';
let activeSearch = '';
export function initRouter(onNavigate) {
  window.addEventListener('hashchange', () => handleRoute(onNavigate));
  handleRoute(onNavigate);
}

function handleRoute(onNavigate) {
  if (isLobbyRoute()) {
    document.getElementById('app')?.classList.add('hidden');
    showLobbyView(getLobbyView());
    onNavigate?.('lobby');
    return;
  }

  hideLobbyScreen();
  document.getElementById('app')?.classList.remove('hidden');

  const hash = location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  let view = parts[0] || 'arcade';

  if (view === 'home') {
    location.replace('#/arcade');
    return;
  }

  updateNavLinks(view);

  if (view === 'play' && parts[1]) {
    openGame(parts[1]);
    onNavigate?.(view);
    return;
  }

  closeGameScreen();

  const main = document.getElementById('mainContent');
  main.dataset.bound = '';
  switch (view) {
    case 'stats':
      main.innerHTML = renderStatsPage();
      break;
    case 'players':
      main.innerHTML = renderPlayersPage();
      bindPlayersPage(refreshCurrentView);
      break;
    case 'about':
      main.innerHTML = renderAboutPage();
      break;
    case 'arcade':
    default:
      main.innerHTML = renderHomePage();
      bindHomeEvents();
      break;
  }

  onNavigate?.(view);
}

function updateNavLinks(view) {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === view);
  });
}

function refreshCurrentView() {
  handleRoute();
}

function renderHomePage() {
  const games = getGamesByCategory(activeFilter).filter(g =>
    g.name.toLowerCase().includes(activeSearch.toLowerCase())
  );
  const scores = storage.getAllScores();
  const playerName = storage.getActiveUserName();

  const gridHtml = games.length
    ? games.map(g => {
        const sc = scores[g.id];
        const best = sc?.best ? (g.id === 'marble-solo' ? (sc.best === 1 ? 'Win' : sc.best) : sc.best) : '—';
        return `
          <article class="game-card" data-game="${g.id}" tabindex="0" role="button" aria-label="Play ${g.name}">
            <div class="game-card-top">
              <span class="game-card-icon">${g.icon}</span>
              <span class="game-card-badge">${g.category}</span>
            </div>
            <h3>${g.name}</h3>
            <p>${g.description}</p>
            <div class="game-card-meta">
              <span class="game-card-score">Best: ${best}</span>
              <span class="game-card-play">Play →</span>
            </div>
          </article>
        `;
      }).join('')
    : `<p class="empty-search">No games match “${activeSearch}”.</p>`;

  return `
    <section class="hero">
      <div class="hero-badge">🎮 Single-Player · Playing as <strong>${playerName}</strong></div>
      <h1>Your <em>Solo Arcade</em> Playground</h1>
      <p>Instant browser games — marble quests, puzzles, shooters and more. Scores stay on your device. Play anywhere, even offline.</p>
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-value">${gameRegistry.length}</div>
          <div class="hero-stat-label">Games</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-value">${getTotalPlays()}</div>
          <div class="hero-stat-label">Sessions</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-value">${getGamesPlayedCount()}</div>
          <div class="hero-stat-label">Tried</div>
        </div>
      </div>
    </section>

    <div class="search-wrap">
      <label class="visually-hidden" for="arcadeSearch">Search games</label>
      <input id="arcadeSearch" class="arcade-search" type="search"
        placeholder="Search games" autocomplete="off"
        aria-label="Search games by name" value="${activeSearch}">
    </div>

    <div class="filter-bar" id="filterBar">
      ${getCategories().map(cat => `
        <button class="filter-btn ${cat === activeFilter ? 'active' : ''}" data-filter="${cat}">${cat}</button>
      `).join('')}
    </div>

    <h2 class="section-title">🕹️ Pick a Game</h2>
    <div class="game-grid" id="gameGrid">
      ${gridHtml}
    </div>
  `;
}

function bindHomeEvents() {
  const main = document.getElementById('mainContent');
  if (main.dataset.bound) return;
  main.dataset.bound = '1';

  main.addEventListener('click', e => {
    const filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) {
      activeFilter = filterBtn.dataset.filter;
      main.dataset.bound = '';
      main.innerHTML = renderHomePage();
      bindHomeEvents();
      return;
    }
    const card = e.target.closest('[data-game]');
    if (card) location.hash = `#/play/${card.dataset.game}`;
  });
const search = document.getElementById('arcadeSearch');
if (search) {
  search.addEventListener('input', e => {
    activeSearch = e.target.value;
    main.dataset.bound = '';
    main.innerHTML = renderHomePage();
    bindHomeEvents();
    const again = document.getElementById('arcadeSearch');
    if (again) {
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    }
  });
}
  main.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('[data-game]');
      if (card) { e.preventDefault(); location.hash = `#/play/${card.dataset.game}`; }
    }
  });
}

function renderStatsPage() {
  const scores = storage.getAllScores();
  const playerName = storage.getActiveUserName();
  const entries = gameRegistry.map(g => ({
    ...g,
    score: scores[g.id] ?? { best: 0, plays: 0 },
  })).filter(e => e.score.plays > 0);

  if (!entries.length) {
    return `
      <div class="stats-page">
        <h1>Stats for ${playerName}</h1>
        <p class="page-sub">Scores saved locally for this player on this device.</p>
        <div class="empty-stats">
          <p>No games played yet as ${playerName}. Head to the arcade and start playing!</p>
          <br>
          <a href="#/arcade" class="btn btn-primary">Go to Arcade</a>
        </div>
      </div>
    `;
  }

  return `
    <div class="stats-page">
      <h1>Stats for ${playerName}</h1>
      <p class="page-sub">Scores for this player only. <a href="#/players">Switch player</a> to see other scores.</p>
      <div class="stats-grid">
        ${entries.map(e => `
          <div class="stat-card">
            <span class="stat-card-icon">${e.icon}</span>
            <div class="stat-card-info">
              <h3>${e.name}</h3>
              <p>Best: ${e.id === 'marble-solo' && e.score.best === 1 ? 'Victory' : e.score.best}</p>
              <small>${e.score.plays} session${e.score.plays !== 1 ? 's' : ''}</small>
            </div>
          </div>
        `).join('')}
      </div>
      <br>
      <button class="btn btn-danger" id="clearStatsBtn">Clear ${playerName}'s Stats</button>
    </div>
  `;
}

function renderAboutPage() {
  return `
    <div class="about-page">
      <h1>About KhelZon</h1>
      <p class="page-sub">A solo arcade built with pure web tech.</p>
      <div class="about-content">
        <h2>What is KhelZon?</h2>
        <p>KhelZon ("Khel" = play) is a browser-based single-player arcade. Every game runs instantly — no downloads, no sign-ups, no multiplayer lobbies. Your high scores are stored locally on your device.</p>

        <h2>Games Included</h2>
        <ul>
          <li><strong>Marble Quest Solo, Territory Clash</strong> — Strategy games vs CPU.</li>
          <li><strong>Snake Rush, Neon Dodge, Orbit Breaker, Star Drift, Meteor Run</strong> — Arcade action.</li>
          <li><strong>Number Cascade, Memory Matrix, Slide Quest, Tap Sequence, Target Tap</strong> — Puzzles and reflex.</li>
        </ul>

        <h2>Tech Stack</h2>
        <p>Built entirely with HTML, CSS, and vanilla JavaScript — no frameworks. Works offline as a Progressive Web App.</p>

        <h2>Original Design</h2>
        <p>KhelZon features its own warm indigo-and-saffron visual identity, original game implementations, and single-player-only focus — a distinct experience from other browser arcades.</p>

        <h2>Privacy &amp; data</h2>
        <p>Scores are stored in your browser only. Export a backup from <strong>Players</strong> to move data to another device — nothing is uploaded to KhelZon servers. Optional browser sync (Chrome/Firefox) may copy site data across devices you sign into.</p>

        <h2>Open Source</h2>
        <p>KhelZon is open source under the MIT license. Contributions, bug reports, and game ideas are welcome on GitHub.</p>
        <p class="about-links">
          <a href="https://github.com/pradipNP/khelzon" target="_blank" rel="noopener noreferrer">GitHub repository</a>
          ·
          <a href="https://github.com/pradipNP/khelzon/issues" target="_blank" rel="noopener noreferrer">Issues &amp; feature requests</a>
          ·
          <a href="https://github.com/pradipNP/khelzon/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">How to contribute</a>
        </p>
      </div>
    </div>
  `;
}

async function enterFullscreen() {
  document.body.classList.add('game-active');
  const screen = document.getElementById('gameScreen');
  screen.classList.remove('hidden');
  screen.setAttribute('aria-hidden', 'false');

  try {
    if (!document.fullscreenElement && screen.requestFullscreen) {
      await screen.requestFullscreen();
    }
  } catch { /* fullscreen not supported or denied — CSS fullscreen still works */ }
}

async function exitFullscreen() {
  document.body.classList.remove('game-active');
  const screen = document.getElementById('gameScreen');
  screen.classList.add('hidden');
  screen.classList.remove('rules-open');
  screen.setAttribute('aria-hidden', 'true');

  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch { /* ignore */ }
}

async function openGame(gameId) {
  const game = getGame(gameId);
  if (!game) { location.hash = '#/arcade'; return; }

  document.getElementById('gameScreenIcon').textContent = game.icon;
  document.getElementById('gameScreenTitle').textContent = game.name;
  document.getElementById('gameScreenSub').textContent = game.category;
  document.getElementById('gameInstructionsContent').innerHTML = renderGameInstructions(game);

  const stage = document.getElementById('gameStage');
  stage.innerHTML = '<div class="game-stage-loading" id="gameStageLoading">Loading game…</div>';

  const rulesBtn = document.getElementById('gameRulesToggle');
  rulesBtn.classList.remove('active');
  rulesBtn.setAttribute('aria-expanded', 'false');

  if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }

  await enterFullscreen();

  try {
    const mod = await game.load();
    stage.innerHTML = '';
    activeGameCleanup = mod.default(stage);
    stage.setAttribute('tabindex', '-1');
    stage.focus({ preventScroll: true });
  } catch (err) {
    stage.innerHTML = '<p class="game-msg lose">Failed to load game.</p>';
    console.error(err);
  }
}

function closeGameScreen() {
  if (activeGameCleanup) { activeGameCleanup(); activeGameCleanup = null; }
  exitFullscreen();
}

export function setupGameScreen() {
  document.getElementById('gameBack').addEventListener('click', () => {
    closeGameScreen();
    location.hash = '#/arcade';
  });

  document.getElementById('gameRulesToggle').addEventListener('click', () => {
    const screen = document.getElementById('gameScreen');
    const btn = document.getElementById('gameRulesToggle');
    const open = screen.classList.toggle('rules-open');
    btn.classList.toggle('active', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? '🎮 Game' : '📖 Rules';
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.getElementById('gameScreen') && !document.getElementById('gameScreen').classList.contains('hidden')) {
      /* user exited browser fullscreen via Esc — keep game screen open */
    }
  });

  document.addEventListener('keydown', e => {
    const screen = document.getElementById('gameScreen');
    const screenOpen = screen && !screen.classList.contains('hidden');

    if (e.key === 'Escape' && screenOpen) {
      if (screen.classList.contains('rules-open')) {
        screen.classList.remove('rules-open');
        const btn = document.getElementById('gameRulesToggle');
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '📖 Rules';
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'Enter' && screenOpen && !screen.classList.contains('rules-open')) {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const startBtn = document.querySelector('#gameStage .game-toolbar .btn-primary');
      if (startBtn) {
        e.preventDefault();
        startBtn.click();
      }
    }
  });
}

// Delegate clear stats button (stats page)
document.addEventListener('click', e => {
  if (e.target.id === 'clearStatsBtn') {
    const name = storage.getActiveUserName();
    if (confirm(`Clear all scores for "${name}"? Other players are not affected.`)) {
      storage.clearScores();
      location.hash = '#/stats';
      handleRoute();
    }
  }
});

export { closeGameScreen, refreshCurrentView };