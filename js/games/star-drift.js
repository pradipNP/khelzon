import { isSoundEnabled, getAudioContext } from '../sound.js';
import { storage } from '../storage.js';
import { fitCanvasDisplay } from '../gameFit.js';
import { shareScore } from '../share.js';

// --- Sound FX ---
function playLaser() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

function playExplosion({ big = false } = {}) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  const duration = big ? 0.6 : 0.3;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(big ? 800 : 1500, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(big ? 0.4 : 0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + duration);
}

const playAsteroidExplode = () => playExplosion({ big: false });
const playPlayerHit = () => playExplosion({ big: true });

export default function initStarDrift(container) {
  const W = 420, H = 520;
  container.innerHTML = `
    <div class="game-wrap game-wrap--fit">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">Score</span><span class="hud-value" id="sdScore">0</span></div>
          <div class="hud-item"><span class="hud-label">Wave</span><span class="hud-value" id="sdWave">1</span></div>
          <div class="hud-item"><span class="hud-label">HP</span><span class="hud-value" id="sdHp">100</span></div>
        </div>
        <div class="game-toolbar">
          <button class="btn btn-primary" id="sdStart">Launch</button>
        </div>
      </div>
      <div class="game-play-area" id="sdPlayArea">
        <canvas class="game-canvas" id="sdCanvas" width="${W}" height="${H}"></canvas>
      </div>
      <div id="sdMsg"></div>
    </div>
  `;

  const canvas = document.getElementById('sdCanvas');
  const ctx = canvas.getContext('2d');
  let ship, bullets, asteroids, particles, score, wave, hp, running, raf, keys;

  function reset() {
    ship = { x: W / 2, y: H - 60, w: 32, h: 28, speed: 5 };
    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    wave = 1;
    hp = 100;
    running = false;
    keys = {};
    document.getElementById('sdMsg').innerHTML = '';
    updateHud();
    spawnWave();
    draw();
  }

  function spawnWave() {
    const count = 3 + wave * 2;
    for (let i = 0; i < count; i++) {
      asteroids.push({
        x: Math.random() * (W - 40) + 20,
        y: -Math.random() * H * 0.5,
        r: 12 + Math.random() * 18,
        vx: (Math.random() - 0.5) * 2,
        vy: 1 + Math.random() * 2 + wave * 0.3,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.08,
      });
    }
  }

  function updateHud() {
    document.getElementById('sdScore').textContent = score;
    document.getElementById('sdWave').textContent = wave;
    document.getElementById('sdHp').textContent = hp;
  }

  function explode(x, y, color) {
    for (let i = 0; i < 8; i++)
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 30,
        color,
      });
  }

  function update() {
    if (!running) return;

    if (keys['ArrowLeft'] || keys['a']) ship.x = Math.max(ship.w / 2, ship.x - ship.speed);
    if (keys['ArrowRight'] || keys['d']) ship.x = Math.min(W - ship.w / 2, ship.x + ship.speed);
    if (keys[' ']) {
      if (!keys._shot) {
        bullets.push({ x: ship.x, y: ship.y - 10, vy: -9 });
        playLaser();
        keys._shot = true;
      }
    } else keys._shot = false;

    bullets = bullets.filter(b => {
      b.y += b.vy;
      return b.y > -10;
    });

    asteroids.forEach(a => {
      a.x += a.vx;
      a.y += a.vy;
      a.rot += a.rotV;
      if (a.x - a.r < 0 || a.x + a.r > W) a.vx *= -1;
    });

    asteroids = asteroids.filter(a => {
      let hit = false;
      bullets = bullets.filter(b => {
        if (!hit && Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
          hit = true;
          score += Math.round(a.r);
          explode(a.x, a.y, '#f4a261');
          playAsteroidExplode();
          return false;
        }
        return true;
      });
      if (hit) return false;

      if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.r + 14) {
        hp -= 15;
        explode(a.x, a.y, '#e76f51');
        playPlayerHit();
        updateHud();
        if (hp <= 0) {
          running = false;
          storage.saveScore('star-drift', score);
          document.getElementById('sdMsg').innerHTML = `<div class="game-msg lose">Destroyed! Score: ${score}</div><button id="sdShareBtn" class="btn btn-share">Share Score ↗</button>`;
          document.getElementById('sdShareBtn').addEventListener('click', () => shareScore(score, 'Star Drift'));
        }
        return false;
      }
      return a.y < H + 50;
    });

    particles = particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life--;
      return p.life > 0;
    });

    if (!asteroids.length) {
      wave++;
      updateHud();
      spawnWave();
    }

    updateHud();
  }

  function draw() {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + Date.now() * 0.01 * (i % 3)) % W;
      const sy = (i * 89 + Date.now() * 0.02 * (i % 2)) % H;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.fillStyle = '#6b6580';
      ctx.strokeStyle = '#a8a0b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const rad = a.r * (0.8 + Math.sin(i * 2.5) * 0.2);
        const px = Math.cos(angle) * rad;
        const py = Math.sin(angle) * rad;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    bullets.forEach(b => {
      ctx.fillStyle = '#e9c46a';
      ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
    });

    // Ship
    ctx.fillStyle = '#2a9d8f';
    ctx.beginPath();
    ctx.moveTo(ship.x, ship.y - ship.h / 2);
    ctx.lineTo(ship.x - ship.w / 2, ship.y + ship.h / 2);
    ctx.lineTo(ship.x + ship.w / 2, ship.y + ship.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e76f51';
    ctx.fillRect(ship.x - 4, ship.y + ship.h / 2, 8, 6);

    particles.forEach(p => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      ctx.globalAlpha = 1;
    });
  }

  function loop() {
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function onKeyDown(e) { keys[e.key] = true; if (e.key === ' ') e.preventDefault(); }
  function onKeyUp(e) { keys[e.key] = false; }

  document.getElementById('sdStart').addEventListener('click', () => {
    if (hp <= 0) reset();
    running = true;
    cancelAnimationFrame(raf);
    loop();
  });

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  const unfit = fitCanvasDisplay(canvas, document.getElementById('sdPlayArea'));
  reset();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    unfit();
  };
}