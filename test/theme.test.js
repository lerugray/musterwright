import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_STORAGE_KEY,
  resolveTheme,
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  toggleTheme,
  initTheme,
  themeToggleLabel
} from '../src/theme.js';

function mockStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); }
  };
}

function mockDoc() {
  const el = { attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; } };
  return { documentElement: el };
}

describe('theme resolution', () => {
  it('prefers stored light over OS dark', () => {
    assert.equal(resolveTheme('light', true), 'light');
  });

  it('prefers stored dark over OS light', () => {
    assert.equal(resolveTheme('dark', false), 'dark');
  });

  it('falls back to OS preference when nothing stored', () => {
    assert.equal(resolveTheme(null, true), 'dark');
    assert.equal(resolveTheme(null, false), 'light');
    assert.equal(resolveTheme('invalid', true), 'dark');
  });

  it('toggles between light and dark', () => {
    assert.equal(toggleTheme('light'), 'dark');
    assert.equal(toggleTheme('dark'), 'light');
  });
});

describe('theme persistence', () => {
  it('reads and writes localStorage key', () => {
    const storage = mockStorage();
    assert.equal(getStoredTheme(storage), null);
    setStoredTheme(storage, 'light');
    assert.equal(getStoredTheme(storage), 'light');
    assert.equal(storage.getItem(THEME_STORAGE_KEY), 'light');
  });
});

describe('theme application', () => {
  it('sets data-theme on documentElement for light', () => {
    const doc = mockDoc();
    applyTheme(doc, 'light');
    assert.equal(doc.documentElement.attributes['data-theme'], 'light');
    applyTheme(doc, 'dark');
    assert.equal(doc.documentElement.attributes['data-theme'], undefined);
  });

  it('initTheme applies resolved theme', () => {
    const doc = mockDoc();
    const storage = mockStorage();
    setStoredTheme(storage, 'light');
    const theme = initTheme(doc, storage, { matches: true });
    assert.equal(theme, 'light');
    assert.equal(doc.documentElement.attributes['data-theme'], 'light');
  });
});

describe('theme toggle label', () => {
  it('shows the target mode', () => {
    assert.equal(themeToggleLabel('dark'), 'Light');
    assert.equal(themeToggleLabel('light'), 'Dark');
  });
});
