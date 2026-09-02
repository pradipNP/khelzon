const shortcuts = [
  ['?', 'Open / close shortcuts'],
  ['/', 'Focus Arcade search'],
  ['T', 'Toggle dark / light theme'],
  ['1 - 5', 'Filter Arcade category'],
];

let modal;

function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'shortcut-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="shortcut-backdrop" data-shortcut-close></div>
    <div class="shortcut-panel" role="dialog" aria-modal="true" aria-labelledby="shortcutTitle">
      <div class="shortcut-header">
        <h2 id="shortcutTitle">Keyboard Shortcuts</h2>
        <button type="button" class="shortcut-close" data-shortcut-close aria-label="Close shortcuts">×</button>
      </div>
      <dl class="shortcut-list">
        ${shortcuts.map(([key, label]) => `<div><dt><kbd>${key}</kbd></dt><dd>${label}</dd></div>`).join('')}
      </dl>
    </div>
  `;
  modal.addEventListener('click', event => {
    if (event.target.closest('[data-shortcut-close]')) closeModal();
  });
  document.body.append(modal);
  return modal;
}

function openModal() {
  ensureModal().hidden = false;
  modal.querySelector('.shortcut-close').focus();
}

function closeModal() {
  if (modal) modal.hidden = true;
}

function toggleModal() {
  if (modal && !modal.hidden) closeModal(); else openModal();
}

export function initShortcuts() {
  const footer = document.querySelector('.footer');
  if (!footer || document.getElementById('shortcutHelpBtn')) return;
  const button = document.createElement('button');
  button.id = 'shortcutHelpBtn';
  button.type = 'button';
  button.className = 'shortcut-help-btn';
  button.title = 'Keyboard shortcuts';
  button.setAttribute('aria-label', 'Show keyboard shortcuts');
  button.textContent = '⌨';
  button.addEventListener('click', toggleModal);
  footer.append(button);
}

function isTypingTarget(target) {
  return target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal && !modal.hidden) {
    closeModal();
    return;
  }
  if (isTypingTarget(event.target)) return;

  if (event.key === '?') {
    event.preventDefault();
    toggleModal();
    return;
  }

  if (event.key === '/') {
    const search = document.getElementById('arcadeSearch');
    if (search) {
      event.preventDefault();
      search.focus();
    }
    return;
  }

  if (event.key.toLowerCase() === 't') {
    const themeButton = document.querySelector('.theme-toggle');
    if (themeButton) {
      event.preventDefault();
      themeButton.click();
    }
    return;
  }

  if (/^[1-5]$/.test(event.key)) {
    const buttons = [...document.querySelectorAll('.filter-btn')];
    const button = buttons[Number(event.key) - 1];
    if (button) {
      event.preventDefault();
      button.click();
    }
  }
});

const style = document.createElement('style');
style.textContent = `
  .shortcut-help-btn { margin-left: .65rem; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); padding: .25rem .5rem; cursor: pointer; }
  .shortcut-modal[hidden] { display: none; }
  .shortcut-modal { position: fixed; inset: 0; z-index: 12000; display: grid; place-items: center; padding: 1rem; }
  .shortcut-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.65); }
  .shortcut-panel { position: relative; width: min(460px, 100%); padding: 1.25rem; border: 1px solid var(--border-strong); border-radius: var(--radius-md); background: var(--bg-card); box-shadow: var(--shadow-card); }
  .shortcut-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .shortcut-close { border: 0; background: transparent; color: var(--text-primary); font-size: 1.7rem; cursor: pointer; }
  .shortcut-list { margin-top: 1rem; }
  .shortcut-list > div { display: grid; grid-template-columns: 90px 1fr; align-items: center; gap: .75rem; padding: .55rem 0; border-top: 1px solid var(--border); }
  .shortcut-list dd { margin: 0; color: var(--text-secondary); }
  .shortcut-list kbd { font-family: var(--font-mono); border: 1px solid var(--border-strong); border-radius: 5px; padding: .2rem .45rem; background: var(--bg-elevated); }
`;
document.head.append(style);
