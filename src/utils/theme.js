const THEME_KEY = 'recipe-box-theme';

// '' means "Auto" -- follow the system's prefers-color-scheme, same
// convention Health Tracker uses.
export function getThemeChoice() {
  return localStorage.getItem(THEME_KEY) || '';
}

export function applyTheme(choice) {
  localStorage.setItem(THEME_KEY, choice);
  const mode = choice || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', mode);
}
