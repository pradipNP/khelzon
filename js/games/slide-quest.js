import { storage } from '../storage.js';
import { fitGrid } from '../gameFit.js';
import { shareScore } from '../share.js';

const SIZE = 3;
const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];

export default function initSlideQuest(container) {
  container.innerHTML = `
    <div class="game-wrap game-wrap--fit">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">Moves</span><span class="hud-value" id="sqMoves">0</span></div>
          <div class="hud-item"><span class="hud-label">Best</span><span class="hud-value" id="sqBest">—</span></div>
        </div>
        <div class="game-toolbar">
          <button class="btn btn-primary" id="sqNew">Shuffle</button>
        </div>
      </div>
      <div class="game-play-area" id="sqPlayArea">
        <div class="sq-grid" id="sqGrid"></div>
      </div>
      <p class="sq-hint">Slide tiles into the empty space. Order 1–8 to win.</p>
      <div id="sqMsg"></div>
    </div>
  `;

  const gridEl = document.getElementById('sqGrid');
  const playArea = document.getElementById('sqPlayArea');
  let tiles, moves, emptyIdx;

  function isSolved() {
    return tiles.every((v, i) => v === GOAL[i]);
  }

  function shuffle() {
    tiles = [...GOAL];
    emptyIdx = tiles.indexOf(0);
    do {
      for (let i = 0; i < 80; i++) {
        const opts = getMovable();
        if (!opts.length) break;
        const pick = opts[Math.floor(Math.random() * opts.length)];
        swap(pick, false);
      }
    } while (isSolved());
    moves = 0;
    document.getElementById('sqMoves').textContent = '0';
    document.getElementById('sqMsg').innerHTML = '';
    render();
  }

  function indexRC(i) {
    return [Math.floor(i / SIZE), i % SIZE];
  }

  function getMovable() {
    const [er, ec] = indexRC(emptyIdx);
    const opts = [];
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
      const nr = er + dr, nc = ec + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) opts.push(nr * SIZE + nc);
    });
    return opts;
  }

  function swap(idx, countMove = true) {
    tiles[emptyIdx] = tiles[idx];
    tiles[idx] = 0;
    emptyIdx = idx;
    if (countMove) {
      moves++;
      document.getElementById('sqMoves').textContent = moves;
    }
  }

  function onTileClick(idx) {
    if (!getMovable().includes(idx)) return;
    swap(idx);
    render();
    if (isSolved()) {
      const score = Math.max(1000 - moves * 15, 100);
      storage.saveScore('slide-quest', score, 'high');
      document.getElementById('sqMsg').innerHTML =
        `<div class="game-msg win">Solved in ${moves} moves! Score: ${score}</div><button id="sqShareBtn" class="btn btn-share">Share Score ↗</button>`;
      document.getElementById('sqShareBtn').addEventListener('click', () => shareScore(score, 'Slide Quest'));
      const best = storage.getScore('slide-quest');
      document.getElementById('sqBest').textContent = best.best || score;
    }
  }

  function render() {
    gridEl.innerHTML = '';
    tiles.forEach((val, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sq-tile' + (val === 0 ? ' sq-empty' : '');
      btn.textContent = val === 0 ? '' : val;
      btn.disabled = val === 0;
      btn.setAttribute('aria-label', val === 0 ? 'Empty' : `Tile ${val}`);
      if (getMovable().includes(i) && val !== 0) btn.classList.add('sq-movable');
      btn.addEventListener('click', () => onTileClick(i));
      gridEl.appendChild(btn);
    });
    emptyIdx = tiles.indexOf(0);
  }

  document.getElementById('sqNew').addEventListener('click', shuffle);
  const unfit = fitGrid(gridEl, playArea, SIZE, SIZE, 96);
  const best = storage.getScore('slide-quest');
  document.getElementById('sqBest').textContent = best.best || '—';
  shuffle();

  return () => unfit();
}
