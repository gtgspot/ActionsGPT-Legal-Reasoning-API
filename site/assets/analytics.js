import { createElement } from 'https://esm.sh/react@18';
import { createRoot } from 'https://esm.sh/react-dom@18/client';
import { Analytics } from 'https://esm.sh/@vercel/analytics/react';

const mountAnalytics = () => {
  if (document.getElementById('vercel-analytics')) {
    return;
  }
  const container = document.createElement('div');
  container.id = 'vercel-analytics';
  container.style.display = 'none';
  const body = document.body;
  if (!body) {
    return;
  }
  body.appendChild(container);
  try {
    const root = createRoot(container);
    root.render(createElement(Analytics));
  } catch (error) {
    console.warn('Failed to initialize Vercel Analytics.', error);
    container.remove();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAnalytics, { once: true });
} else {
  mountAnalytics();
}
