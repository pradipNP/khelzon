import { storage } from '../storage.js';
import { fitCanvasDisplay } from '../gameFit.js';
import { shareScore } from '../share.js';

export default function initMeteorRun(container) {
  const W = 400, H = 500;

  container.innerHTML = `
    <div class="game-wrap game-wrap--fit">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">Score</span><span class="hud-value" id="mrScore">0</span></div>
          <div class="hud-item"><span class="hud-label">HP</span><span class="hud-value" id="mrHp">100</span></div>
        </div>
        <div class="game-toolbar">
          <button class="btn btn-primary" id="mrStart">Launch</button>
        </div>
      </div>
      <div class="game-play-area" id="mrPlayArea">
        <canvas class="game-canvas" id="mrCanvas" width="${W}" height="${H}"></canvas>
      </div>
      <div class="mobile-dpad" id="mrDpad">
        <button class="dpad-left" data-dir="left">◀</button>
        <button class="dpad-right" data-dir="right">▶</button>
      </div>
      <div id="mrMsg"></div>
    </div>
  `;

  const canvas = document.getElementById('mrCanvas');
  const ctx = canvas.getContext('2d');
  let shipX, meteors, score, hp, running, over, frame, raf;

  function reset() {
    shipX = W / 2;
    meteors = [];
    score = 0;
    hp = 100;
    running = false;
    over = false;
    frame = 0;
    document.getElementById('mrScore').textContent = '0';
    document.getElementById('mrHp').textContent = '100';
    document.getElementById('mrMsg').innerHTML = '';
    draw();
  }

  function draw() {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97 + frame * 0.2) % W;
      const sy = (i * 53 + frame * 0.5) % H;
      ctx.fillRect(sx, sy, 2, 2);
    }

    meteors.forEach(m => {
      ctx.fillStyle = '#7b68ee';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(123,104,238,0.3)';
      ctx.beginPath();
      ctx.arc(m.x, m.y + m.r * 0.6, m.r * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#2a9d8f';
    ctx.beginPath();
    ctx.moveTo(shipX, H - 36);
    ctx.lineTo(shipX - 22, H - 8);
    ctx.lineTo(shipX + 22, H - 8);
    ctx.closePath();
    ctx.fill();
  }

  function loop() {
    if (!running || over) return;
    frame++;
    score += 1;
    if (frame % 35 === 0) {
      meteors.push({
        x: 30 + Math.random() * (W - 60),
        y: -20,
        r: 10 + Math.random() * 18,
        vy: 2 + Math.random() * 2 + score / 400,
      });
    }

    meteors.forEach(m => { m.y += m.vy; });
    meteors = meteors.filter(m => m.y < H + 40);

    const shipY = H - 22;
    for (const m of meteors) {
      const dx = m.x - shipX;
      const dy = m.y - shipY;
      if (Math.hypot(dx, dy) < m.r + 16) {
        hp -= 25;
        m.y = H + 999;
        document.getElementById('mrHp').textContent = Math.max(0, hp);
        if (hp <= 0) {
          over = true;
          running = false;
          storage.saveScore('meteor-run', score);
          document.getElementById('mrMsg').innerHTML =
            `<div class="game-msg lose">Destroyed! Score: ${score}</div><button id="mrShareBtn" class="btn btn-share">Share Score ↗</button>`;
          document.getElementById('mrShareBtn').addEventListener('click', () => shareScore(score, 'Meteor Run'));
          draw();
          return;
        }
      }
    }

    document.getElementById('mrScore').textContent = score;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function onKey(e) {
    if (!running || over) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') shipX = Math.max(24, shipX - 14);
    if (k === 'arrowright' || k === 'd') shipX = Math.min(W - 24, shipX + 14);
    if (['arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    draw();
  }

  document.getElementById('mrStart').addEventListener('click', () => {
    if (over) reset();
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  });

  document.getElementById('mrDpad').addEventListener('click', e => {
    if (!running || over) return;
    if (e.target.dataset.dir === 'left') shipX = Math.max(24, shipX - 14);
    if (e.target.dataset.dir === 'right') shipX = Math.min(W - 24, shipX + 14);
    draw();
  });

  window.addEventListener('keydown', onKey);
  const unfit = fitCanvasDisplay(canvas, document.getElementById('mrPlayArea'));
  reset();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    unfit();
  };
}
