const REPO_ISSUE_URL = 'https://github.com/pradipNP/khelzon/issues/new';

export function setupRequestGame() {
  document.getElementById('requestGameBtn')?.addEventListener('click', openRequestGameModal);
  document.getElementById('requestGameModalClose')?.addEventListener('click', closeRequestGameModal);
  document.getElementById('requestGameModalBackdrop')?.addEventListener('click', closeRequestGameModal);

  document.getElementById('requestGameForm')?.addEventListener('submit', e => {
    e.preventDefault();

    const nameInput = document.getElementById('requestGameName');
    const categorySelect = document.getElementById('requestGameCategory');
    const descriptionInput = document.getElementById('requestGameDescription');
    const err = document.getElementById('requestGameError');

    const name = nameInput.value.trim();
    const category = categorySelect.value;
    const description = descriptionInput.value.trim();

    if (!name || !description) {
      err.textContent = 'Please fill in a game name/idea and a description.';
      err.hidden = false;
      return;
    }
    err.hidden = true;

    const title = `[Game Request] ${name}`;
    const body = [
      `**Game Name / Idea:** ${name}`,
      `**Preferred Category:** ${category}`,
      '',
      '**Description or reference link:**',
      description,
    ].join('\n');

    const url = `${REPO_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener');

    showToast('Thanks for your suggestion! We will review it soon.');
    nameInput.value = '';
    descriptionInput.value = '';
    categorySelect.selectedIndex = 0;
    closeRequestGameModal();
  });
}

export function openRequestGameModal() {
  const modal = document.getElementById('requestGameModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('requestGameName')?.focus();
}

export function closeRequestGameModal() {
  const modal = document.getElementById('requestGameModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  const err = document.getElementById('requestGameError');
  if (err) err.hidden = true;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
