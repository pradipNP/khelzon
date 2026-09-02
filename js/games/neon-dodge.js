import { storage } from '../storage.js';
import { fitCanvasDisplay } from '../gameFit.js';
import { shareScore } from '../share.js';

export default function initNeonDodge(container) {
  const W = 360, H = 480;
  const LANES = 3;

  container.innerHTML = `
    <div class="game-wrap game-wrap--fit">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">Score</span><span class="hud-value" id="ndScore">0</span></div>
          <div class="hud-item"><span class="hud-label">Best</span><span class="hud-value" id="ndBest">0</span></div>
        </div>
        <div class="game-toolbar">
          <button class="btn btn-primary" id="ndStart">Start</button>
        </div>
      </div>
      <div class="game-play-area" id="ndPlayArea">
        <canvas class="game-canvas" id="ndCanvas" width="${W}" height="${H}"></canvas>
      </div>
      <div class="mobile-dpad" id="ndDpad">
        <button class="dpad-left" data-dir="left">◀</button>
        <button class="dpad-right" data-dir="right">▶</button>
      </div>
      <div id="ndMsg"></div>
    </div>
  `;

  const canvas = document.getElementById('ndCanvas');
  const ctx = canvas.getContext('2d');
  const laneW = W / LANES;
  let lane = 1, obstacles, score, running, over, frame, raf;

  function laneX(l) {
    return l * laneW + laneW / 2;
  }

  function reset() {
    lane = 1;
    obstacles = [];
    score = 0;
    running = false;
    over = false;
    frame = 0;
    document.getElementById('ndScore').textContent = '0';
    document.getElementById('ndMsg').innerHTML = '';
    draw();
  }

  function spawnObstacle() {
    obstacles.push({
      lane: Math.floor(Math.random() * LANES),
      y: -40,
      h: 28 + Math.random() * 16,
      scored: false,
    });
  }

  function draw() {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < LANES; i++) {
      ctx.strokeStyle = 'rgba(244, 162, 97, 0.12)';
      ctx.beginPath();
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, H);
      ctx.stroke();
    }

    obstacles.forEach(o => {
      const x = o.lane * laneW + 8;
      ctx.fillStyle = '#e76f51';
      ctx.shadowColor = '#e76f51';
      ctx.shadowBlur = 12;
      ctx.fillRect(x, o.y, laneW - 16, o.h);
      ctx.shadowBlur = 0;
    });

    const px = laneX(lane);
    const py = H - 48;
    const grad = ctx.createRadialGradient(px, py, 4, px, py, 22);
    grad.addColorStop(0, '#e9c46a');
    grad.addColorStop(1, '#f4a261');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop() {
    if (!running || over) return;
    frame++;
    if (frame % 45 === 0) spawnObstacle();

    const speed = 3 + Math.min(score / 20, 4);
    obstacles.forEach(o => { o.y += speed; });

    obstacles = obstacles.filter(o => o.y < H + 20);

    const py = H - 48;
    for (const o of obstacles) {
      if (o.lane === lane && py + 20 > o.y && py - 20 < o.y + o.h) {
        over = true;
        running = false;
        storage.saveScore('neon-dodge', score);
        document.getElementById('ndMsg').innerHTML =
          `<div class="game-msg lose">Hit! Score: ${score}</div><button id="ndShareBtn" class="btn btn-share">Share Score ↗</button>`;
        document.getElementById('ndShareBtn').addEventListener('click', () => shareScore(score, 'Neon Dodge'));
        draw();
        return;
      }
      if (!o.scored && o.y > H - 50) {
        o.scored = true;
        score++;
        document.getElementById('ndScore').textContent = score;
      }
    }

    draw();
    raf = requestAnimationFrame(loop);
  }

  function move(dir) {
    if (dir === 'left' && lane > 0) lane--;
    if (dir === 'right' && lane < LANES - 1) lane++;
    if (running) draw();
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') move('left');
    if (k === 'arrowright' || k === 'd') move('right');
    if (['arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  }

  document.getElementById('ndStart').addEventListener('click', () => {
    if (over) reset();
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  });

  document.getElementById('ndDpad').addEventListener('click', e => {
    if (e.target.dataset.dir) move(e.target.dataset.dir);
  });

  window.addEventListener('keydown', onKey);
  const unfit = fitCanvasDisplay(canvas, document.getElementById('ndPlayArea'));
  const best = storage.getScore('neon-dodge');
  document.getElementById('ndBest').textContent = best.best || 0;
  reset();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    unfit();
  };
}
