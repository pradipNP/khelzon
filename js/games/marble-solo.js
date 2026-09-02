import { storage } from '../storage.js';
import { fitCanvasDisplay, canvasPointer } from '../gameFit.js';
import { shareScore } from '../share.js';

const TRACK = 40;
const PLAYER = { color: '#e9c46a', name: 'You', homeStart: 0 };
const CPU = { color: '#e76f51', name: 'CPU', homeStart: 20 };

const CARD_RULES = {
  A: { enter: true, move: [1, 11] },
  '2': { move: [2] },
  '3': { move: [3] },
  '4': { move: [-4] },
  '5': { move: [5] },
  '6': { move: [6] },
  '7': { move: [7], split: true },
  '8': { move: [8] },
  '9': { move: [9] },
  '10': { move: [10] },
  J: { swap: true },
  Q: { move: [12] },
  K: { enter: true, move: [13] },
};

const SUITS = ['♠', '♥', '♦', '♣'];

function makeDeck() {
  const deck = [];
  for (const rank of Object.keys(CARD_RULES)) {
    for (let i = 0; i < 4; i++) {
      deck.push({ rank, suit: SUITS[i % 4], id: `${rank}-${i}` });
    }
  }
  for (let i = 0; i < deck.length; i++) {
    const j = Math.floor(Math.random() * deck.length);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function posMod(n, m) { return ((n % m) + m) % m; }

export default function initMarbleSolo(container) {
  container.innerHTML = `
    <div class="game-wrap marble-game game-wrap--fit">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">Turn</span><span class="hud-value" id="mqTurn">You</span></div>
          <div class="hud-item"><span class="hud-label">You Home</span><span class="hud-value" id="mqPlayerHome">0/4</span></div>
          <div class="hud-item"><span class="hud-label">CPU Home</span><span class="hud-value" id="mqCpuHome">0/4</span></div>
        </div>
        <p class="marble-status" id="mqStatus">Select a card, then click a marble</p>
      </div>
      <div class="game-play-area" id="mqPlayArea">
        <div class="marble-board-wrap">
          <canvas class="marble-board" id="mqCanvas" width="420" height="420"></canvas>
        </div>
      </div>
      <div class="game-bottom-bar">
        <div class="marble-bottom-row">
          <div class="marble-hand" id="mqHand"></div>
          <div class="game-toolbar game-toolbar--inline">
            <button class="btn btn-primary" id="mqNew">New Game</button>
          </div>
        </div>
        <div id="mqMsg" class="game-msg game-msg--compact info" hidden></div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('mqCanvas');
  const ctx = canvas.getContext('2d');
  const handEl = document.getElementById('mqHand');
  const statusEl = document.getElementById('mqStatus');
  const msgEl = document.getElementById('mqMsg');

  let deck, playerHand, cpuHand, turn, selectedCard, marbles, gameOver, animFrame;

  function newGame() {
    deck = makeDeck();
    playerHand = deck.splice(0, 4);
    cpuHand = deck.splice(0, 4);
    turn = 'player';
    selectedCard = null;
    gameOver = false;
    marbles = {
      player: [null, null, null, null].map((_, i) => ({ id: i, pos: -1, home: false, steps: 0 })),
      cpu: [null, null, null, null].map((_, i) => ({ id: i, pos: -1, home: false, steps: 0 })),
    };
    msgEl.hidden = true;
    msgEl.className = 'game-msg game-msg--compact info';
    statusEl.textContent = 'Select a card, then click a marble';
    renderHand();
    updateHud();
    draw();
  }

  function trackPos(index, team) {
    const offset = team === 'player' ? PLAYER.homeStart : CPU.homeStart;
    return posMod(offset + index, TRACK);
  }

  function getMarbleAt(pos, excludeTeam, excludeId) {
    for (const team of ['player', 'cpu']) {
      for (const m of marbles[team]) {
        if (m.home || m.pos < 0) continue;
        if (team === excludeTeam && m.id === excludeId) continue;
        if (trackPos(m.pos, team) === pos) return { team, marble: m };
      }
    }
    return null;
  }

  function countHome(team) {
    return marbles[team].filter(m => m.home).length;
  }

  function updateHud() {
    document.getElementById('mqTurn').textContent = turn === 'player' ? 'You' : 'CPU';
    document.getElementById('mqPlayerHome').textContent = `${countHome('player')}/4`;
    document.getElementById('mqCpuHome').textContent = `${countHome('cpu')}/4`;
  }

  function renderHand() {
    handEl.innerHTML = '';
    if (turn !== 'player') return;
    playerHand.forEach((card, idx) => {
      const el = document.createElement('div');
      el.className = 'marble-card' + (selectedCard === idx ? ' selected' : '');
      el.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit">${card.suit}</span>`;
      el.addEventListener('click', () => {
        if (gameOver || turn !== 'player') return;
        selectedCard = idx;
        statusEl.textContent = `Selected ${card.rank}${card.suit} — click a marble`;
        renderHand();
      });
      handEl.appendChild(el);
    });
  }

  function canEnter(team) {
    return marbles[team].some(m => m.pos < 0 && !m.home);
  }

  function validMoves(team, card) {
    const rule = CARD_RULES[card.rank];
    const moves = [];
    if (!rule) return moves;

    marbles[team].forEach((m, i) => {
      if (m.home) return;
      if (rule.enter && m.pos < 0) moves.push({ marbleIdx: i, type: 'enter' });
      if (rule.move && m.pos >= 0) {
        rule.move.forEach(steps => {
          if (steps > 0 && m.steps + steps <= TRACK + 4) moves.push({ marbleIdx: i, type: 'move', steps });
          if (steps < 0 && m.steps + steps >= 0) moves.push({ marbleIdx: i, type: 'move', steps });
        });
      }
      if (rule.swap && m.pos >= 0) {
        ['player', 'cpu'].forEach(t => {
          marbles[t].forEach((om, oi) => {
            if (om.pos >= 0 && !om.home && !(t === team && oi === i))
              moves.push({ marbleIdx: i, type: 'swap', target: { team: t, idx: oi } });
          });
        });
      }
    });
    return moves;
  }

  function applyMove(team, move, card) {
    const m = marbles[team][move.marbleIdx];
    if (move.type === 'enter') {
      m.pos = 0;
      m.steps = 0;
    } else if (move.type === 'move') {
      for (let s = 1; s <= Math.abs(move.steps); s++) {
        const dir = move.steps > 0 ? 1 : -1;
        m.steps += dir;
        m.pos = m.steps;
        const tpos = trackPos(m.steps, team);
        const hit = getMarbleAt(tpos, team, m.id);
        if (hit && hit.team !== team) {
          hit.marble.pos = -1;
          hit.marble.steps = 0;
        }
      }
      if (m.steps >= TRACK) {
        m.home = true;
        m.pos = -1;
      }
    } else if (move.type === 'swap') {
      const om = marbles[move.target.team][move.target.idx];
      [m.steps, om.steps] = [om.steps, m.steps];
      [m.pos, om.pos] = [om.pos, m.pos];
    }
  }

  function endTurn(team, cardIdx) {
    if (team === 'player') {
      playerHand.splice(cardIdx, 1);
      if (playerHand.length === 0 && deck.length) playerHand.push(...deck.splice(0, Math.min(4, deck.length)));
    } else {
      cpuHand.splice(cardIdx, 1);
      if (cpuHand.length === 0 && deck.length) cpuHand.push(...deck.splice(0, Math.min(4, deck.length)));
    }
    turn = team === 'player' ? 'cpu' : 'player';
    selectedCard = null;
    updateHud();
    checkWin();
    renderHand();
    draw();
    if (!gameOver && turn === 'cpu') setTimeout(cpuTurn, 700);
  }

  function showMsg(text, type) {
    msgEl.hidden = false;
    msgEl.className = `game-msg game-msg--compact ${type}`;
    msgEl.textContent = text;
  }

  function checkWin() {
    if (countHome('player') === 4) {
      gameOver = true;
      storage.saveScore('marble-solo', 1);
      msgEl.hidden = false;
      msgEl.className = 'game-msg game-msg--compact win';
      msgEl.innerHTML = `🎉 You win! All marbles home. <button id="mqShareBtn" class="btn btn-share">Share Score ↗</button>`;
      document.getElementById('mqShareBtn').addEventListener('click', () => shareScore(1, 'Marble Solo'));
    } else if (countHome('cpu') === 4) {
      gameOver = true;
      storage.saveScore('marble-solo', 0);
      msgEl.hidden = false;
      msgEl.className = 'game-msg game-msg--compact lose';
      msgEl.innerHTML = `CPU wins. Try again! <button id="mqShareBtn" class="btn btn-share">Share Score ↗</button>`;
      document.getElementById('mqShareBtn').addEventListener('click', () => shareScore(0, 'Marble Solo'));
    }
  }

  function cpuTurn() {
    if (gameOver) return;
    let best = null, bestScore = -Infinity;
    cpuHand.forEach((card, ci) => {
      const moves = validMoves('cpu', card);
      if (!moves.length && !CARD_RULES[card.rank]?.enter) return;
      moves.forEach(move => {
        let score = Math.random();
        if (move.type === 'enter') score += 5;
        if (move.type === 'move') score += move.steps * 0.5;
        if (move.type === 'swap') score += 3;
        const m = marbles.cpu[move.marbleIdx];
        if (m.steps + (move.steps || 0) >= TRACK - 3) score += 10;
        if (score > bestScore) { bestScore = score; best = { ci, move, card }; }
      });
    });
    if (best) {
      applyMove('cpu', best.move, best.card);
      statusEl.textContent = `CPU played ${best.card.rank}${best.card.suit}`;
      endTurn('cpu', best.ci);
    } else if (cpuHand.length) {
      statusEl.textContent = 'CPU discarded a card';
      endTurn('cpu', 0);
    }
  }

  canvas.addEventListener('click', e => {
    if (gameOver || turn !== 'player' || selectedCard === null) return;
    const { x, y } = canvasPointer(canvas, e);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const r = canvas.width * 0.38;

    const card = playerHand[selectedCard];
    const moves = validMoves('player', card);
    if (!moves.length) {
      statusEl.textContent = 'No valid move — card discarded';
      endTurn('player', selectedCard);
      return;
    }

    let clicked = null;
    marbles.player.forEach((m, i) => {
      if (m.home) return;
      let angle, dist;
      if (m.pos < 0) {
        angle = -Math.PI / 2;
        dist = r * 0.55;
      } else {
        angle = (trackPos(m.steps, 'player') / TRACK) * Math.PI * 2 - Math.PI / 2;
        dist = r;
      }
      const mx = cx + Math.cos(angle) * dist;
      const my = cy + Math.sin(angle) * dist;
      if (Math.hypot(x - mx, y - my) < 18) clicked = i;
    });

    if (clicked !== null) {
      const move = moves.find(mv => mv.marbleIdx === clicked);
      if (move) {
        applyMove('player', move, card);
        endTurn('player', selectedCard);
        statusEl.textContent = `Moved marble ${clicked + 1}`;
      } else {
        statusEl.textContent = 'Invalid marble for this card';
      }
    }
  });

  function draw() {
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, r = w * 0.38;
    ctx.clearRect(0, 0, w, h);

    // Board ring
    ctx.strokeStyle = 'rgba(244,162,97,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Track dots
    for (let i = 0; i < TRACK; i++) {
      const angle = (i / TRACK) * Math.PI * 2 - Math.PI / 2;
      const dx = cx + Math.cos(angle) * r;
      const dy = cy + Math.sin(angle) * r;
      const isSafe = i % 10 === 0;
      ctx.fillStyle = isSafe ? 'rgba(42,157,143,0.5)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(dx, dy, isSafe ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Home zones
    [{ team: 'player', color: PLAYER.color, angle: -Math.PI / 2 },
     { team: 'cpu', color: CPU.color, angle: Math.PI / 2 }].forEach(({ team, color, angle }) => {
      const hx = cx + Math.cos(angle) * r * 0.55;
      const hy = cy + Math.sin(angle) * r * 0.55;
      ctx.fillStyle = color + '33';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(team === 'player' ? 'YOU' : 'CPU', hx, hy + 4);
    });

    // Marbles
    ['cpu', 'player'].forEach(team => {
      const color = team === 'player' ? PLAYER.color : CPU.color;
      marbles[team].forEach(m => {
        if (m.home) return;
        let angle, dist;
        if (m.pos < 0) {
          angle = team === 'player' ? -Math.PI / 2 : Math.PI / 2;
          dist = r * 0.55 + (m.id - 1.5) * 8;
        } else {
          angle = (trackPos(m.steps, team) / TRACK) * Math.PI * 2 - Math.PI / 2;
          dist = r;
        }
        const mx = cx + Math.cos(angle) * dist;
        const my = cy + Math.sin(angle) * dist;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(m.id + 1, mx, my + 4);
      });
    });

    // Home count indicators
    const ph = countHome('player'), ch = countHome('cpu');
    if (ph) {
      ctx.fillStyle = PLAYER.color;
      for (let i = 0; i < ph; i++) {
        ctx.beginPath();
        ctx.arc(cx - 30 + i * 16, cy + r * 0.55 + 30, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (ch) {
      ctx.fillStyle = CPU.color;
      for (let i = 0; i < ch; i++) {
        ctx.beginPath();
        ctx.arc(cx - 30 + i * 16, cy - r * 0.55 - 30, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  document.getElementById('mqNew').addEventListener('click', newGame);
  const unfit = fitCanvasDisplay(canvas, document.getElementById('mqPlayArea'));
  newGame();

  return () => { cancelAnimationFrame(animFrame); unfit(); };
}
