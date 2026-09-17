import { storage } from '../storage.js';
import { fitGrid } from '../gameFit.js';
import { shareScore } from '../share.js';
import { isSoundEnabled, getAudioContext } from '../sound.js';

const SIZE = 6;
const PLAYER = 1;
const CPU = 2;

export default function initTerritoryClash(container) {
  container.innerHTML = `
    <div class="game-wrap game-wrap--fit">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">You</span><span class="hud-value" id="tcYou">1</span></div>
          <div class="hud-item"><span class="hud-label">CPU</span><span class="hud-value" id="tcCpu">1</span></div>
          <div class="hud-item"><span class="hud-label">Turn</span><span class="hud-value" id="tcTurn">You</span></div>
        </div>
        <div class="game-toolbar">
          <button class="btn btn-primary" id="tcNew">New Game</button>
        </div>
      </div>
      <div class="game-play-area" id="tcPlayArea">
        <div class="tc-grid" id="tcGrid" role="grid" aria-label="Territory board"></div>
      </div>
      <p class="tc-hint">Click an empty cell next to your gold tiles to claim it.</p>
      <div id="tcMsg"></div>
    </div>
  `;

  const gridEl = document.getElementById('tcGrid');
  const playArea = document.getElementById('tcPlayArea');
  let board, playerTurn, over;

  function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    board[SIZE - 1][0] = PLAYER;
    board[0][SIZE - 1] = CPU;
    playerTurn = true;
    over = false;
    document.getElementById('tcMsg').innerHTML = '';
    updateHud();
    render();
  }

  function count(owner) {
    return board.flat().filter(v => v === owner).length;
  }

  function updateHud() {
    document.getElementById('tcYou').textContent = count(PLAYER);
    document.getElementById('tcCpu').textContent = count(CPU);
    document.getElementById('tcTurn').textContent = over ? 'Done' : playerTurn ? 'You' : 'CPU';
  }

  function neighbors(r, c) {
    return [[-1, 0], [1, 0], [0, -1], [0, 1]]
      .map(([dr, dc]) => [r + dr, c + dc])
      .filter(([nr, nc]) => nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE);
  }

  function validMoves(owner) {
    const moves = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] !== 0) continue;
        if (neighbors(r, c).some(([nr, nc]) => board[nr][nc] === owner)) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  }

  function applyMove(r, c, owner) {
    board[r][c] = owner;

    if (owner === PLAYER && isSoundEnabled()) {
      const ctx = getAudioContext();

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    }
  }

  function playClaimChime() {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(780, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  function endGame() {
    over = true;
    const you = count(PLAYER);
    const cpu = count(CPU);

    if (isSoundEnabled()) {
      const ctx = getAudioContext();

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const notes = you > cpu
        ? [523.25, 659.25, 783.99]
        : cpu > you
          ? [392, 329.63, 261.63]
          : [440, 440];

      notes.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + index * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.18);
      });
    }

    let msg;
    if (you > cpu) {
      msg = `<div class="game-msg win">Victory! You control ${you} tiles.</div>`;
      storage.saveScore('territory-clash', you);
    } else if (cpu > you) {
      msg = `<div class="game-msg lose">Defeat. CPU controls ${cpu} tiles.</div>`;
      storage.saveScore('territory-clash', you);
    } else {
      msg = `<div class="game-msg">Draw — ${you} tiles each.</div>`;
      storage.saveScore('territory-clash', you);
    }

    document.getElementById('tcMsg').innerHTML = `
      ${msg}
      <button id="tcShareBtn" class="btn btn-share">Share Score ↗</button>
    `;

    document.getElementById('tcShareBtn').addEventListener('click', () => {
      shareScore(you, 'Territory Clash');
    });

    updateHud();
    render();
  }

  function cpuTurn() {
    const moves = validMoves(CPU);
    if (!moves.length) {
      if (!validMoves(PLAYER).length) endGame();
      else {
        playerTurn = true;
        updateHud();
        render();
      }
      return;
    }

    const [r, c] = moves[Math.floor(Math.random() * moves.length)];
    applyMove(r, c, CPU);
    playerTurn = true;

    if (!validMoves(PLAYER).length && !validMoves(CPU).length) endGame();
    else updateHud();

    render();
  }

  function onCellClick(r, c) {
    if (over || !playerTurn) return;
    if (board[r][c] !== 0) return;
    if (!neighbors(r, c).some(([nr, nc]) => board[nr][nc] === PLAYER)) return;

    applyMove(r, c, PLAYER);
    playClaimChime();
    playerTurn = false;
    updateHud();
    render();

    if (!validMoves(CPU).length && !validMoves(PLAYER).length) {
      endGame();
      return;
    }

    setTimeout(cpuTurn, 350);
  }

  function render() {
    gridEl.innerHTML = '';

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = board[r][c];
        const btn = document.createElement('button');

        btn.type = 'button';
        btn.className = 'tc-cell';

        if (cell === PLAYER) {
          btn.classList.add('tc-player');
        } else if (cell === CPU) {
          btn.classList.add('tc-cpu');
        } else if (
          playerTurn &&
          !over &&
          neighbors(r, c).some(([nr, nc]) => board[nr][nc] === PLAYER)
        ) {
          btn.classList.add('tc-valid');
        }

        btn.setAttribute(
          'aria-label',
          cell === PLAYER ? 'Your tile' : cell === CPU ? 'CPU tile' : 'Empty cell'
        );

        btn.addEventListener('click', () => onCellClick(r, c));
        gridEl.appendChild(btn);
      }
    }
  }

  document.getElementById('tcNew').addEventListener('click', initBoard);

  const unfit = fitGrid(gridEl, playArea, SIZE, SIZE, 52);

  initBoard();

  return () => unfit();
}
