const SOUND_KEY = 'sound';

let audioCtx = null;

export function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try { localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch { /* ignore */ }
  syncSoundToggleUI();
}

export function syncSoundToggleUI() {
  const enabled = isSoundEnabled();
  document.querySelectorAll('.sound-toggle').forEach(button => {
    const text = enabled ? '🔊' : '🔇';
    if (button.textContent !== text) {
      button.textContent = text;
    }
    button.setAttribute('aria-label', enabled ? 'Mute sound effects' : 'Unmute sound effects');
    button.title = enabled ? 'Mute sound effects' : 'Unmute sound effects';
    button.setAttribute('aria-pressed', String(!enabled));
  });
}

export function renderSoundToggle(extraClass = '') {
  const enabled = isSoundEnabled();
  return `
    <button type="button" class="tool-btn sound-toggle ${extraClass}" aria-label="${enabled ? 'Mute sound effects' : 'Unmute sound effects'}" title="${enabled ? 'Mute sound effects' : 'Unmute sound effects'}" aria-pressed="${!enabled}">
      ${enabled ? '🔊' : '🔇'}
    </button>
  `;
}

export function initSound() {
  ['headerTools', 'sidebarTools', 'gameScreenTools'].forEach(id => {
    const container = document.getElementById(id);
    if (!container || container.querySelector('.sound-toggle')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tool-btn sound-toggle';
    container.append(button);
  });
  syncSoundToggleUI();
}

document.addEventListener('click', event => {
  if (!event.target.closest('.sound-toggle')) return;
  event.preventDefault();
  setSoundEnabled(!isSoundEnabled());
});