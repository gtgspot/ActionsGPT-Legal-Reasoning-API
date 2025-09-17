/**
 * ActionsGPT Site Enhancements
 * - Persist and sync theme preference across pages
 * - Update toggle labels for assistive technologies
 * - Highlight the active navigation item using body[data-page]
 */

document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const toggle = document.getElementById('theme-toggle');
  const storageKey = 'actions-gpt-theme';
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const activePage = body.dataset.page;
  const navLinks = document.querySelectorAll('[data-page-link]');

  const storedTheme = safeStorage('get', storageKey);
  const initialTheme = storedTheme || (systemPrefersDark.matches ? 'dark' : 'light');
  applyTheme(initialTheme, Boolean(storedTheme));
  setActiveNav(activePage, navLinks);

  toggle?.addEventListener('click', () => {
    const current = body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
  });

  try {
    systemPrefersDark.addEventListener?.('change', (event) => {
      const hasStoredPreference = Boolean(safeStorage('get', storageKey));
      if (hasStoredPreference) return;
      applyTheme(event.matches ? 'dark' : 'light', false);
    });
  } catch (error) {
    // Older browsers may not support addEventListener on media queries.
  }

  function applyTheme(theme, persist) {
    body.setAttribute('data-theme', theme);
    updateToggle(theme);
    if (persist) {
      safeStorage('set', storageKey, theme);
    }
  }

  function updateToggle(theme) {
    if (!toggle) return;
    const isDark = theme === 'dark';
    const nextLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';
    toggle.textContent = isDark ? 'Light theme' : 'Dark theme';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', nextLabel);
    toggle.setAttribute('title', nextLabel);
  }

  function setActiveNav(page, links) {
    if (!page || !links?.length) return;
    links.forEach((link) => {
      if (link.dataset.pageLink === page) {
        link.classList.add('is-active');
      }
    });
  }
});

function safeStorage(type, key, value) {
  try {
    if (!('localStorage' in window)) return null;
    if (type === 'get') {
      return window.localStorage.getItem(key);
    }
    if (type === 'set') {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    return null;
  }
  return null;
}
