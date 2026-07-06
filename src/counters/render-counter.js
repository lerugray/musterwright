/**
 * Counter renderer: generates inline SVG for a unit counter.
 *
 * milsymbol must be loaded globally (window.ms or globalThis.ms) — the app
 * loads src/vendor/milsymbol.js as a plain script before the module entry.
 *
 * Each counter is a solid faction-color square with:
 * - A NATO APP-6 unit-type icon (monochrome, rendered via milsymbol)
 * - Factor numbers along the bottom edge in --font-data (ui-monospace)
 *
 * Icons are monochrome black or white chosen by faction-color luminance.
 * The faction color carries affiliation; milsymbol renders without a frame.
 */

import { resolveSidc } from './sidc-map.js';

let _ms = null;
function getMs() {
  if (_ms) return _ms;
  // In browser, milsymbol is loaded as a plain script that sets self.ms
  if (typeof window !== 'undefined' && window.ms) {
    _ms = window.ms;
    return _ms;
  }
  // In Node (tests), milsymbol is injected via globalThis.ms
  if (typeof globalThis !== 'undefined' && globalThis.ms) {
    _ms = globalThis.ms;
    return _ms;
  }
  throw new Error(
    'milsymbol not found. Ensure src/vendor/milsymbol.js is loaded ' +
    '(as a <script> tag in the browser, or globalThis.ms in tests).'
  );
}

// ---- Luminance helpers ---------------------------------------------------

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

/**
 * Returns the sRGB relative luminance (0..1) of a hex color string.
 * Uses the WCAG formula: 0.299R + 0.587G + 0.114B.
 */
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Choose black or white as the icon/text color for a given faction
 * background color, ensuring contrast.
 *
 * @param {string} factionColor Hex color (#rrggbb) for the counter body.
 * @returns {'#000000' | '#ffffff'}
 */
export function iconColorFor(factionColor) {
  return luminance(factionColor) > 0.5 ? '#000000' : '#ffffff';
}

// ---- Factor formatting ---------------------------------------------------

function formatFactor(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Format the unit's combat factors as a compact string, e.g. "4/6/1".
 * Roster factors: sp / dv / mp ; Asset factors: av / dv / mp.
 */
export function formatFactorText(unit) {
  if (!unit) return '';
  const f = unit.factors || {};
  const parts = [];
  // Roster units use sp; asset units use av
  const first = formatFactor(f.sp) ?? formatFactor(f.av);
  if (first !== null) parts.push(first);
  const dv = formatFactor(f.dv);
  if (dv !== null) parts.push(dv);
  const mp = formatFactor(f.mp);
  if (mp !== null) parts.push(mp);
  return parts.join('/');
}

// ---- SVG generation ------------------------------------------------------

const COUNTER_W = 72;
const COUNTER_H = 100;
const ICON_AREA = { x: 4, y: 4, w: 64, h: 64 };

/**
 * Render a unit counter as a complete inline SVG string.
 *
 * @param {object} unit  A spine unit record (must have .class, .factors).
 * @param {string} factionColor  Hex color string for the counter body.
 * @returns {string}  An <svg> element string.
 */
export function renderCounterSVG(unit, factionColor) {
  const ms = getMs();
  const monoColor = iconColorFor(factionColor);
  const sidc = resolveSidc(unit.class);

  const sym = new ms.Symbol(sidc, {
    size: 35,
    frame: false,
    icon: true,
    monoColor: monoColor,
    fill: false
  });

  // Extract paths/groups from milsymbol's SVG output string
  const iconSvgStr = sym.asSVG();
  const innerContent = iconSvgStr
    .replace(/<\?xml[^>]*\?>\s*/i, '')
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>/i, '')
    .trim();

  const factorText = formatFactorText(unit);

  return `<svg xmlns="http://www.w3.org/2000/svg" class="unit-counter" viewBox="0 0 ${COUNTER_W} ${COUNTER_H}" width="${COUNTER_W}" height="${COUNTER_H}">
  <rect x="0.5" y="0.5" width="${COUNTER_W - 1}" height="${COUNTER_H - 1}" fill="${factionColor}" stroke="rgba(0,0,0,0.5)" stroke-width="1" rx="2" />
  <g transform="translate(${ICON_AREA.x}, ${ICON_AREA.y}) scale(${ICON_AREA.w / 100})" fill="${monoColor}" stroke="${monoColor}">
    ${innerContent}
  </g>
  <text x="${COUNTER_W / 2}" y="${COUNTER_H - 10}" text-anchor="middle" fill="${monoColor}" font-family="ui-monospace, SF Mono, Menlo, Monaco, monospace" font-size="10" font-weight="700">${factorText}</text>
</svg>`;
}

/**
 * Render a unit counter into a live SVG DOM element.
 * This is the primary UI entry point — use in the browser tab renderer.
 *
 * @param {object} unit
 * @param {string} factionColor
 * @returns {SVGSVGElement}
 */
export function renderCounterElement(unit, factionColor) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderCounterSVG(unit, factionColor);
  return wrapper.firstElementChild;
}

// ---- Faction color palette (defaults) ------------------------------------

/**
 * Default faction→color mapping for GotA.  Extend or override as needed.
 * Colors are chosen for good contrast with both black and white icon overlays.
 */
export const FACTION_COLORS = {
  USA: '#3b6cb4',   // Union blue
  CSA: '#8b7d6b',   // Confederate grey-brown
  BRITISH: '#8b2f2f', // British red
  FRENCH: '#2f4f8b', // French blue
  PRUSSIAN: '#4a6741', // Prussian green
  AUSTRIAN: '#6b4f3f', // Austrian brown
  SPANISH: '#8b6b3f', // Spanish tan
};

/**
 * Get a default color for a faction name, falling back to a neutral slate.
 */
export function getFactionColor(faction) {
  const key = String(faction ?? '').trim().toUpperCase();
  return FACTION_COLORS[key] || '#68747d';
}
