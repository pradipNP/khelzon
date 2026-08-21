const THEME_KEY = 'khelzon_theme';
export const GITHUB_URL = 'https://github.com/pradipNP/khelzon';

const GITHUB_SVG = `<svg class="github-svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;
const SUN_SVG = `<svg class="theme-svg icon-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0 0-1.41l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>`;
const MOON_SVG = `<svg class="theme-svg icon-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12.3 2a10 10 0 0 0-.19 2c0 5.52 4.48 10 10 10 .68 0 1.35-.07 2-.19C22.61 18.55 17.86 22 12 22 6.48 22 2 17.52 2 12 2 6.14 5.45 1.39 10.19.19c.7.67 1.39 1.25 2.11 1.81z"/></svg>`;

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  updateThemeMeta(next);
  syncThemeToggleUI();
}

export function toggleTheme() {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
}

function updateThemeMeta(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#f5f0eb' : '#1a1a2e';
}

export function syncThemeToggleUI() {
  const isLight = getTheme() === 'light';
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    btn.querySelector('.icon-sun')?.classList.toggle('hidden', isLight);
    btn.querySelector('.icon-moon')?.classList.toggle('hidden', !isLight);
  });
}

export function renderGithubButton(extraClass = '') {
  return `
    <a href="${GITHUB_URL}" class="tool-btn github-link ${extraClass}" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub" title="GitHub">
      ${GITHUB_SVG}
    </a>
  `;
}

export function renderThemeToggle(extraClass = '') {
  const isLight = getTheme() === 'light';
  return `
    <button type="button" class="tool-btn theme-toggle ${extraClass}" aria-label="${isLight ? 'Switch to dark theme' : 'Switch to light theme'}" title="Toggle theme">
      ${SUN_SVG}
      ${MOON_SVG}
    </button>
  `;
}

export function renderToolPair(extraClass = '') {
  return `<div class="tool-pair">${renderGithubButton(extraClass)}${renderThemeToggle(extraClass)}</div>`;
}

export function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  } catch { /* ignore */ }

  document.addEventListener('click', e => {
    if (e.target.closest('.theme-toggle')) {
      e.preventDefault();
      toggleTheme();
    }
  });

  syncThemeToggleUI();
}

export function showGlobalTools() {
  /* reserved — tools are embedded per page */
}
