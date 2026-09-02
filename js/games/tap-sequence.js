import { storage } from '../storage.js';
import { shareScore } from '../share.js';

const PADS = [
  { id: 0, color: '#e76f51', label: 'Coral' },
  { id: 1, color: '#e9c46a', label: 'Gold' },
  { id: 2, color: '#2a9d8f', label: 'Teal' },
  { id: 3, color: '#7b68ee', label: 'Violet' },
];

export default function initTapSequence(container) {
  container.innerHTML = `
    <div class="game-wrap game-wrap--fit">
      <div class="game-top-bar">
        <div class="game-hud game-hud--compact">
          <div class="hud-item"><span class="hud-label">Sequence</span><span class="hud-value" id="tsSeq">0</span></div>
          <div class="hud-item"><span class="hud-label">Best</span><span class="hud-value" id="tsBest">0</span></div>
        </div>
        <div class="game-toolbar">
          <button class="btn btn-primary" id="tsStart">Start Round</button>
        </div>
      </div>
      <div class="game-play-area">
        <div class="tap-pads" id="tsPads"></div>
      </div>
      <div id="tsMsg" class="game-msg game-msg--compact info">Press Start, then repeat the pattern.</div>
    </div>
  `;

  const padsEl = document.getElementById('tsPads');
  const best = storage.getScore('tap-sequence').best;
  document.getElementById('tsBest').textContent = best;

  let sequence = [], playerIdx = 0, accepting = false, playing = false;

  PADS.forEach(pad => {
    const btn = document.createElement('button');
    btn.className = 'tap-pad';
    btn.dataset.id = pad.id;
    btn.setAttribute('aria-label', pad.label);
    btn.style.background = pad.color;
    btn.style.boxShadow = `0 4px 20px ${pad.color}44`;
    padsEl.appendChild(btn);
  });

  function flash(id, dur = 400) {
    const btn = padsEl.querySelector(`[data-id="${id}"]`);
    btn.style.opacity = '1';
    btn.style.transform = 'scale(1.05)';
    setTimeout(() => {
      btn.style.opacity = '0.55';
      btn.style.transform = 'scale(1)';
    }, dur);
  }

  function playBeep(id) {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = [261, 329, 392, 523][id];
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch { /* audio optional */ }
  }

  async function showSequence() {
    playing = true;
    accepting = false;
    document.getElementById('tsMsg').textContent = 'Watch…';
    await delay(500);
    for (const id of sequence) {
      flash(id);
      playBeep(id);
      await delay(550);
    }
    playing = false;
    accepting = true;
    playerIdx = 0;
    document.getElementById('tsMsg').textContent = 'Your turn — repeat the pattern';
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  function startRound() {
    sequence.push(Math.floor(Math.random() * 4));
    document.getElementById('tsSeq').textContent = sequence.length;
    showSequence();
  }

  function onPadClick(e) {
    const btn = e.target.closest('.tap-pad');
    if (!btn || !accepting || playing) return;
    const id = +btn.dataset.id;
    flash(id, 200);
    playBeep(id);

    if (id !== sequence[playerIdx]) {
      accepting = false;
      const finalScore = sequence.length - 1;
      storage.saveScore('tap-sequence', finalScore);
      document.getElementById('tsBest').textContent = storage.getScore('tap-sequence').best;
      document.getElementById('tsMsg').className = 'game-msg game-msg--compact lose';
      document.getElementById('tsMsg').innerHTML = `Wrong! Reached ${finalScore} steps. <button id="tsShareBtn" class="btn btn-share">Share Score ↗</button>`;
      document.getElementById('tsShareBtn').addEventListener('click', () => shareScore(finalScore, 'Tap Sequence'));
      sequence = [];
      document.getElementById('tsSeq').textContent = '0';
      return;
    }

    playerIdx++;
    if (playerIdx === sequence.length) {
      accepting = false;
      document.getElementById('tsMsg').className = 'game-msg game-msg--compact win';
      document.getElementById('tsMsg').textContent = 'Correct! Next round…';
      storage.saveScore('tap-sequence', sequence.length);
      document.getElementById('tsBest').textContent = storage.getScore('tap-sequence').best;
      setTimeout(startRound, 1000);
    }
  }

  document.getElementById('tsStart').addEventListener('click', () => {
    sequence = [];
    document.getElementById('tsSeq').textContent = '0';
    document.getElementById('tsMsg').className = 'game-msg game-msg--compact info';
    startRound();
  });

  padsEl.addEventListener('click', onPadClick);

  return () => {};
}
