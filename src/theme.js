/** Theme persistence and application for light/dark workbench modes. */

export const THEME_STORAGE_KEY = 'musterwright-theme';

/**
 * Resolve effective theme from stored preference and OS default.
 * @param {string|null} stored  'light' | 'dark' | null
 * @param {boolean} prefersDark  matchMedia('(prefers-color-scheme: dark)').matches
 * @returns {'light' | 'dark'}
 */
export function resolveTheme(stored, prefersDark) {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Apply theme to the document root.
 * Dark is the default (:root tokens); light uses [data-theme="light"].
 * @param {Document} doc
 * @param {'light' | 'dark'} theme
 */
export function applyTheme(doc, theme) {
  if (theme === 'light') {
    doc.documentElement.setAttribute('data-theme', 'light');
  } else {
    doc.documentElement.removeAttribute('data-theme');
  }
}

/**
 * @param {Storage} storage
 * @returns {string|null}
 */
export function getStoredTheme(storage) {
  try {
    return storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * @param {Storage} storage
 * @param {'light' | 'dark'} theme
 */
export function setStoredTheme(storage, theme) {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {'light' | 'dark'} current
 * @returns {'light' | 'dark'}
 */
export function toggleTheme(current) {
  return current === 'light' ? 'dark' : 'light';
}

/**
 * Read preference, apply to document, return active theme.
 * @param {Document} doc
 * @param {Storage} storage
 * @param {MediaQueryList} darkMq  matchMedia('(prefers-color-scheme: dark)')
 * @returns {'light' | 'dark'}
 */
export function initTheme(doc, storage, darkMq) {
  const stored = getStoredTheme(storage);
  const theme = resolveTheme(stored, darkMq.matches);
  applyTheme(doc, theme);
  return theme;
}

/**
 * Label for the chrome toggle button.
 * @param {'light' | 'dark'} theme
 */
export function themeToggleLabel(theme) {
  return theme === 'light' ? 'Dark' : 'Light';
}
