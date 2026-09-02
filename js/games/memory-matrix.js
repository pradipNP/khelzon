import { storage } from '../storage.js';
import { shareScore } from '../share.js';

const EMOJIS = ['🎯', '🎮', '🎲', '🎪', '🎨', '🎭', '🎸', '🎺', '🏆', '⭐', '🌟', '💎'];

export default function initMemoryMatrix(container) {
  container.innerHTML = `
    <div class="game-wrap game-wrap--fit memory-game">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">Moves</span><span class="hud-value" id="mmMoves">0</span></div>
          <div class="hud-item"><span class="hud-label">Pairs</span><span class="hud-value" id="mmPairs">0/0</span></div>
          <div class="hud-item"><span class="hud-label">Time</span><span class="hud-value" id="mmTime">60</span></div>
        </div>
        <div class="game-toolbar memory-diff">
          <button class="btn btn-secondary mm-diff" data-pairs="6">Easy</button>
          <button class="btn btn-primary mm-diff" data-pairs="8">Medium</button>
          <button class="btn btn-secondary mm-diff" data-pairs="10">Hard</button>
        </div>
      </div>
      <div class="game-play-area memory-play-area" id="mmPlayArea">
        <div class="memory-grid" id="mmGrid"></div>
      </div>
      <div id="mmMsg"></div>
    </div>
  `;

  const gridEl = document.getElementById('mmGrid');
  const playArea = document.getElementById('mmPlayArea');
  let cards, flipped, matched, moves, pairs, totalPairs, timer, timeLeft, lock, resizeObs;

  function getCols() {
    return totalPairs <= 6 ? 3 : 4;
  }

  function getRows() {
    return Math.ceil((totalPairs * 2) / getCols());
  }

  /** Size each card cell so the full grid fits the play area */
  function layoutGrid() {
    const cols = getCols();
    const rows = getRows();
    const gap = 8;
    const areaW = playArea.clientWidth || 320;
    const areaH = playArea.clientHeight || 400;

    const cellW = (areaW - gap * (cols - 1)) / cols;
    const cellH = (areaH - gap * (rows - 1)) / rows;
    const cell = Math.max(44, Math.floor(Math.min(cellW, cellH, 96)));

    gridEl.style.setProperty('--mm-cols', cols);
    gridEl.style.setProperty('--mm-cell', `${cell}px`);
    gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
    gridEl.style.gap = `${gap}px`;
  }

  function newGame(numPairs = 8) {
    clearInterval(timer);

    totalPairs = numPairs;
    pairs = 0;
    moves = 0;
    flipped = [];
    matched = new Set();
    lock = false;
    timeLeft = numPairs <= 6 ? 90 : numPairs <= 8 ? 75 : 60;

    const chosen = EMOJIS.slice(0, numPairs);
    cards = [...chosen, ...chosen];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    document.getElementById('mmMsg').innerHTML = '';
    document.getElementById('mmTime').textContent = timeLeft;
    updateHud();
    render();
    requestAnimationFrame(() => {
      layoutGrid();
      requestAnimationFrame(layoutGrid);
    });

    timer = setInterval(() => {
      timeLeft--;
      document.getElementById('mmTime').textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timer);
        document.getElementById('mmMsg').innerHTML = `<div class="game-msg game-msg--compact lose">Time's up! Score: ${pairs * 100}</div><button id="mmShareBtn" class="btn btn-share">Share Score ↗</button>`;
        document.getElementById('mmShareBtn').addEventListener('click', () => shareScore(pairs * 100, 'Memory Matrix'));
        lock = true;
      }
    }, 1000);
  }

  function updateHud() {
    document.getElementById('mmMoves').textContent = moves;
    document.getElementById('mmPairs').textContent = `${pairs}/${totalPairs}`;
  }

  function render() {
    gridEl.innerHTML = cards.map((emoji, i) => `
      <button type="button" class="memory-card ${matched.has(i) ? 'matched' : ''} ${flipped.includes(i) ? 'flipped' : ''}" data-idx="${i}" aria-label="Memory card">
        <span class="memory-card-inner">
          <span class="memory-face front" aria-hidden="true">?</span>
          <span class="memory-face back" aria-hidden="true">${emoji}</span>
        </span>
      </button>
    `).join('');
    layoutGrid();
  }

  function flipCard(idx) {
    const card = gridEl.querySelector(`[data-idx="${idx}"]`);
    if (card) card.classList.add('flipped');
  }

  function unflipCards(idxs) {
    idxs.forEach(i => {
      const card = gridEl.querySelector(`[data-idx="${i}"]`);
      if (card) card.classList.remove('flipped');
    });
  }

  function markMatched(a, b) {
    [a, b].forEach(i => {
      const card = gridEl.querySelector(`[data-idx="${i}"]`);
      if (card) {
        card.classList.add('matched', 'flipped');
        card.disabled = true;
      }
    });
  }

  function onClick(e) {
    const card = e.target.closest('.memory-card');
    if (!card || lock || card.disabled || card.classList.contains('matched') || card.classList.contains('flipped')) return;

    const idx = +card.dataset.idx;
    flipped.push(idx);
    flipCard(idx);

    if (flipped.length === 2) {
      moves++;
      updateHud();
      lock = true;
      const [a, b] = flipped;

      if (cards[a] === cards[b]) {
        markMatched(a, b);
        pairs++;
        flipped = [];
        lock = false;
        updateHud();

        if (pairs === totalPairs) {
          clearInterval(timer);
          const bonus = timeLeft * 2;
          const finalScore = Math.max(0, 1000 - moves * 10 + bonus);
          storage.saveScore('memory-matrix', finalScore);
          document.getElementById('mmMsg').innerHTML = `<div class="game-msg game-msg--compact win">Complete! Score: ${finalScore}</div><button id="mmShareBtn" class="btn btn-share">Share Score ↗</button>`;
          document.getElementById('mmShareBtn').addEventListener('click', () => shareScore(finalScore, 'Memory Matrix'));
          lock = true;
        }
      } else {
        setTimeout(() => {
          unflipCards([a, b]);
          flipped = [];
          lock = false;
        }, 800);
      }
    }
  }

  container.querySelectorAll('.mm-diff').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.mm-diff').forEach(b => {
        b.classList.toggle('btn-primary', b === btn);
        b.classList.toggle('btn-secondary', b !== btn);
      });
      newGame(+btn.dataset.pairs);
    });
  });

  gridEl.addEventListener('click', onClick);

  resizeObs = new ResizeObserver(() => layoutGrid());
  resizeObs.observe(playArea);

  newGame(8);

  return () => {
    clearInterval(timer);
    resizeObs?.disconnect();
  };
}
