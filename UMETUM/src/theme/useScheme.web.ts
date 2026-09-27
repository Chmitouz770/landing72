import { useSyncExternalStore } from 'react';

/**
 * Thème clair / sombre sur le web : suit le système, sauf si la page hôte
 * impose un thème via l'attribut data-theme de <html>.
 */
const query = () => window.matchMedia('(prefers-color-scheme: dark)');

function subscribe(onChange: () => void) {
  const media = query();
  media.addEventListener('change', onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => {
    media.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

function getSnapshot(): 'light' | 'dark' {
  const forced = document.documentElement.getAttribute('data-theme');
  if (forced === 'dark' || forced === 'light') return forced;
  return query().matches ? 'dark' : 'light';
}

export function useScheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light');
}
