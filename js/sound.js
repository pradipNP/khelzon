let audioCtx = null;
let soundEnabled = localStorage.getItem('khelzon_sound') !== 'off';

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
  return soundEnabled;
}

export function setSoundEnabled(value) {
  soundEnabled = value;
  localStorage.setItem('khelzon_sound', value ? 'on' : 'off');
}

export function toggleSound() {
  setSoundEnabled(!soundEnabled);
  return soundEnabled;
}
