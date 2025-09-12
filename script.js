// Theme toggle handling
// Stores selection in localStorage and toggles CSS variables via data-theme

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('theme-toggle');
  const body = document.body;
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const stored = localStorage.getItem('theme') || system;
  body.setAttribute('data-theme', stored);
  setButton(stored);

  toggle?.addEventListener('click', () => {
    const next = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setButton(next);
  });

  function setButton(theme) {
    if (!toggle) return;
    const isDark = theme === 'dark';
    toggle.textContent = isDark ? 'Switch to Light' : 'Switch to Dark';
    toggle.setAttribute('aria-pressed', String(isDark));
  }
});
