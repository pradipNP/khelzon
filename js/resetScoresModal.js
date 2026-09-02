import { storage } from './storage.js';

let modal;
let toastTimer;

function ensureModal() {
  if (modal) return modal;

  modal = document.createElement('div');
  modal.className = 'score-reset-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="score-reset-backdrop" data-reset-cancel></div>
    <div class="score-reset-panel" role="dialog" aria-modal="true" aria-labelledby="scoreResetTitle">
      <h2 id="scoreResetTitle">Reset All Scores?</h2>
      <p id="scoreResetMessage"></p>
      <div class="score-reset-actions">
        <button type="button" class="btn" data-reset-cancel>Cancel</button>
        <button type="button" class="btn btn-danger" data-reset-confirm>Reset Scores</button>
      </div>
    </div>
  `;
  document.body.append(modal);

  modal.addEventListener('click', event => {
    if (event.target.closest('[data-reset-cancel]')) closeModal();
    if (event.target.closest('[data-reset-confirm]')) confirmReset();
  });

  return modal;
}

function openModal() {
  const root = ensureModal();
  const name = storage.getActiveUserName();
  root.querySelector('#scoreResetMessage').textContent = `Are you sure you want to reset all scores for ${name}?`;
  root.hidden = false;
  root.querySelector('[data-reset-confirm]').focus();
}

function closeModal() {
  if (modal) modal.hidden = true;
}

function showToast(message) {
  let toast = document.getElementById('scoreResetToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'scoreResetToast';
    toast.className = 'score-reset-toast';
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function confirmReset() {
  storage.clearScores();
  closeModal();
  showToast('Scores reset successfully');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

document.addEventListener('click', event => {
  if (!event.target.closest('#clearStatsBtn')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openModal();
}, true);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
});

const style = document.createElement('style');
style.textContent = `
  .score-reset-modal[hidden] { display: none; }
  .score-reset-modal { position: fixed; inset: 0; z-index: 12000; display: grid; place-items: center; padding: 1rem; }
  .score-reset-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.65); }
  .score-reset-panel { position: relative; width: min(420px, 100%); padding: 1.4rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--bg-card); box-shadow: var(--shadow-card); }
  .score-reset-panel p { margin: .65rem 0 1.2rem; color: var(--text-secondary); }
  .score-reset-actions { display: flex; justify-content: flex-end; gap: .6rem; }
  .score-reset-toast { position: fixed; left: 50%; bottom: 1.5rem; z-index: 13000; transform: translate(-50%, 20px); opacity: 0; padding: .7rem 1rem; border-radius: var(--radius-sm); background: var(--accent-teal); color: white; pointer-events: none; transition: .2s ease; }
  .score-reset-toast.show { transform: translate(-50%, 0); opacity: 1; }
`;
document.head.append(style);
