import { storage } from '../storage.js';
import { shareScore } from '../share.js';

const SIZE = 4;

export default function initCascade(container) {
  container.innerHTML = `
    <div class="game-wrap game-wrap--fit">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">Score</span><span class="hud-value" id="caScore">0</span></div>
          <div class="hud-item"><span class="hud-label">Best Tile</span><span class="hud-value" id="caBest">—</span></div>
        </div>
        <div class="game-toolbar">
          <button class="btn btn-primary" id="caNew">New Game</button>
        </div>
      </div>
      <div class="game-play-area cascade-play-area">
        <div class="cascade-grid" id="caGrid"></div>
      </div>
      <p class="cascade-hint">Arrow keys / WASD / swipe to slide</p>
      <div class="mobile-dpad" id="caDpad">
        <button class="dpad-up" data-dir="0">▲</button>
        <button class="dpad-left" data-dir="3">◀</button>
        <button class="dpad-down" data-dir="2">▼</button>
        <button class="dpad-right" data-dir="1">▶</button>
      </div>
      <div id="caMsg"></div>
    </div>
  `;

  let grid, score, won, over;
  const gridEl = document.getElementById('caGrid');

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function addTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (!grid[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slideRow(row) {
    const filtered = row.filter(v => v);
    const merged = [];
    for (let i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const val = filtered[i] * 2;
        merged.push(val);
        score += val;
        i++;
      } else merged.push(filtered[i]);
    }
    while (merged.length < SIZE) merged.push(0);
    return merged;
  }

  function move(dir) {
    if (over) return;
    const old = JSON.stringify(grid);
    const g = emptyGrid();

    if (dir === 0) { // up
      for (let c = 0; c < SIZE; c++) {
        const col = grid.map(r => r[c]);
        const slid = slideRow(col);
        for (let r = 0; r < SIZE; r++) g[r][c] = slid[r];
      }
    } else if (dir === 2) { // down
      for (let c = 0; c < SIZE; c++) {
        const col = grid.map(r => r[c]).reverse();
        const slid = slideRow(col).reverse();
        for (let r = 0; r < SIZE; r++) g[r][c] = slid[r];
      }
    } else if (dir === 3) { // left
      for (let r = 0; r < SIZE; r++) g[r] = slideRow(grid[r]);
    } else if (dir === 1) { // right
      for (let r = 0; r < SIZE; r++) g[r] = slideRow([...grid[r]].reverse()).reverse();
    }

    if (JSON.stringify(g) === old) return;
    grid = g;
    addTile();
    render();
    checkEnd();
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) return true;
        if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
        if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
      }
    return false;
  }

  function maxTile() {
    return Math.max(...grid.flat());
  }

  function checkEnd() {
    document.getElementById('caScore').textContent = score;
    document.getElementById('caBest').textContent = maxTile() || '—';
    storage.saveScore('cascade', score);

    if (maxTile() >= 4096 && !won) {
      won = true;
      document.getElementById('caMsg').innerHTML = `<div class="game-msg win">🎉 You reached 4096! Score: ${score}</div><button id="caShareBtn" class="btn btn-share">Share Score ↗</button>`;
      document.getElementById('caShareBtn').addEventListener('click', () => shareScore(score, 'Cascade'));
    }
    if (!canMove()) {
      over = true;
      storage.saveScore('cascade', score);
      document.getElementById('caMsg').innerHTML = `<div class="game-msg lose">No moves left. Final score: ${score}</div><button id="caShareBtn" class="btn btn-share">Share Score ↗</button>`;
      document.getElementById('caShareBtn').addEventListener('click', () => shareScore(score, 'Cascade'));
    }
  }

  function render() {
    gridEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cascade-cell';
        const v = grid[r][c];
        if (v) { cell.textContent = v; cell.dataset.val = v; }
        gridEl.appendChild(cell);
      }
  }

  function newGame() {
    grid = emptyGrid();
    score = 0;
    won = false;
    over = false;
    document.getElementById('caMsg').innerHTML = '';
    addTile();
    addTile();
    render();
    document.getElementById('caScore').textContent = '0';
    document.getElementById('caBest').textContent = maxTile();
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') move(0);
    else if (k === 'arrowright' || k === 'd') move(1);
    else if (k === 'arrowdown' || k === 's') move(2);
    else if (k === 'arrowleft' || k === 'a') move(3);
  }

  let touchStart = null;
  function onTouchStart(e) { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  function onTouchEnd(e) {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) move(dx > 0 ? 1 : 3);
    else if (Math.abs(dy) > 30) move(dy > 0 ? 2 : 0);
    touchStart = null;
  }

  document.getElementById('caNew').addEventListener('click', newGame);
  document.getElementById('caDpad').addEventListener('click', e => {
    if (e.target.dataset.dir !== undefined) move(+e.target.dataset.dir);
  });
  window.addEventListener('keydown', onKey);
  gridEl.addEventListener('touchstart', onTouchStart, { passive: true });
  gridEl.addEventListener('touchend', onTouchEnd, { passive: true });

  newGame();

  return () => {
    window.removeEventListener('keydown', onKey);
    gridEl.removeEventListener('touchstart', onTouchStart);
    gridEl.removeEventListener('touchend', onTouchEnd);
  };
}
