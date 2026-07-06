import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Load milsymbol in Node (the UMD dist exports via module.exports)
const ms = require('../src/vendor/milsymbol.js');

// Make ms available globally so renderCounterSVG can find it
globalThis.ms = ms;

import { getSidc, resolveSidc, SIDC_MAP, FALLBACK_SIDC } from '../src/counters/sidc-map.js';
import { iconColorFor, formatFactorText, renderCounterSVG, COUNTER_LAYOUT } from '../src/counters/render-counter.js';

// ---- SIDC map tests ------------------------------------------------------

describe('SIDC map', () => {
  it('resolves every known unit type to a valid SIDC', () => {
    for (const type of Object.keys(SIDC_MAP)) {
      const sidc = getSidc(type);
      assert.ok(sidc, `type "${type}" should map to a SIDC`);
      assert.equal(typeof sidc, 'string');
      assert.ok(sidc.startsWith('SUG-'), `SIDC for "${type}" should start with SUG-`);
    }
  });

  it('returns null for an unknown type', () => {
    assert.equal(getSidc('dinosaur'), null);
    assert.equal(getSidc(''), null);
    assert.equal(getSidc(undefined), null);
    assert.equal(getSidc(null), null);
  });

  it('resolves unknown types to the fallback SIDC (not null, not throwing)', () => {
    assert.equal(resolveSidc('dinosaur'), FALLBACK_SIDC);
    assert.equal(resolveSidc(''), FALLBACK_SIDC);
    assert.equal(resolveSidc(undefined), FALLBACK_SIDC);
  });

  it('is case and whitespace tolerant', () => {
    assert.ok(getSidc('INF'), 'should map uppercase');
    assert.ok(getSidc(' Inf '), 'should map trimmed/upper');
    assert.equal(getSidc('INF'), getSidc('inf'), 'case should map same type');
  });

  it('every SIDC produces a valid milsymbol icon (isValid === true)', () => {
    for (const [type, sidc] of Object.entries(SIDC_MAP)) {
      const sym = new ms.Symbol(sidc, { size: 35, frame: false, icon: true, fill: false });
      assert.ok(sym.isValid(), `milsymbol rejects SIDC for type "${type}": ${sidc} — ${JSON.stringify(sym.isValid(true))}`);
    }
  });

  it('fallback SIDC produces a valid milsymbol symbol', () => {
    const sym = new ms.Symbol(FALLBACK_SIDC, { size: 35, frame: false, icon: true, fill: false });
    assert.ok(sym.isValid());
  });
});

// ---- Luminance / icon color tests ----------------------------------------

describe('icon color selection', () => {
  it('returns white for dark colors', () => {
    assert.equal(iconColorFor('#000000'), '#ffffff');
    assert.equal(iconColorFor('#15171a'), '#ffffff');
    assert.equal(iconColorFor('#3b6cb4'), '#ffffff');
    assert.equal(iconColorFor('#2f4f8b'), '#ffffff');
    assert.equal(iconColorFor('#4a6741'), '#ffffff');
  });

  it('returns black for light colors', () => {
    assert.equal(iconColorFor('#ffffff'), '#000000');
    assert.equal(iconColorFor('#f0f0f0'), '#000000');
    assert.equal(iconColorFor('#d5d9de'), '#000000');
    assert.equal(iconColorFor('#e8e8ec'), '#000000');
    assert.equal(iconColorFor('#c0c0c0'), '#000000');
  });

  it('copes with missing # prefix', () => {
    assert.equal(iconColorFor('000000'), '#ffffff');
    assert.equal(iconColorFor('ffffff'), '#000000');
  });
});

// ---- Factor formatting tests ---------------------------------------------

describe('factor text formatting', () => {
  it('formats roster unit factors as sp/dv/mp', () => {
    assert.equal(formatFactorText({ factors: { sp: 4, dv: 6, mp: 1 } }), '4/6/1');
  });

  it('formats asset unit factors as av/dv/mp', () => {
    assert.equal(formatFactorText({ factors: { av: 4, dv: 1, mp: 0 } }), '4/1/0');
  });

  it('handles decimal values', () => {
    assert.equal(formatFactorText({ factors: { sp: 1.5, dv: 3.0, mp: 0 } }), '1.5/3/0');
  });

  it('returns empty string for null/undefined unit', () => {
    assert.equal(formatFactorText(null), '');
    assert.equal(formatFactorText(undefined), '');
  });

  it('returns empty string when there are no factors', () => {
    assert.equal(formatFactorText({ factors: {} }), '');
    assert.equal(formatFactorText({}), '');
  });
});

// ---- SVG rendering tests -------------------------------------------------

describe('counter SVG rendering', () => {
  it('produces an SVG string for every known unit type', () => {
    for (const type of Object.keys(SIDC_MAP)) {
      const unit = { class: type, factors: { sp: 4, dv: 6, mp: 1 }, id: `test-${type}` };
      const svg = renderCounterSVG(unit, '#3b6cb4');
      assert.ok(svg.includes('<svg'), `${type}: should produce SVG string`);
      assert.ok(svg.includes('</svg>'), `${type}: should close SVG`);
      assert.ok(svg.includes('viewBox'), `${type}: should have viewBox`);
      assert.ok(svg.includes('unit-counter'), `${type}: should have CSS class`);
    }
  });

  it('contains icon content (path elements) in the SVG', () => {
    const unit = { class: 'inf', factors: { sp: 4, dv: 6, mp: 1 } };
    const svg = renderCounterSVG(unit, '#3b6cb4');
    // The milsymbol output should contain at least one <path> or <circle>
    const hasPath = svg.includes('<path') || svg.includes('<circle');
    assert.ok(hasPath, 'SVG should contain icon geometry from milsymbol');
  });

  it('includes factor text in the SVG', () => {
    const unit = { class: 'inf', factors: { sp: 4, dv: 6, mp: 1 } };
    const svg = renderCounterSVG(unit, '#3b6cb4');
    assert.ok(svg.includes('4/6/1'), 'SVG should contain factor string');
  });

  it('renders unknown type without throwing', () => {
    const unit = { class: 'does-not-exist', factors: { sp: 4, dv: 6, mp: 1 } };
    assert.doesNotThrow(() => {
      const svg = renderCounterSVG(unit, '#3b6cb4');
      assert.ok(svg.includes('viewBox'), 'fallback SVG should still have viewBox');
    });
  });

  it('uses white icon color on dark faction color, black on light', () => {
    const darkUnit = { class: 'inf', factors: { sp: 4, dv: 6, mp: 1 } };
    const lightUnit = { class: 'inf', factors: { sp: 4, dv: 6, mp: 1 } };

    const darkSvg = renderCounterSVG(darkUnit, '#15171a');
    const lightSvg = renderCounterSVG(lightUnit, '#e8e8ec');

    // Dark color should have white strokes (fill="#ffffff")
    assert.ok(darkSvg.includes('#ffffff'), 'dark background should use white icon');

    // Light color should have black strokes (fill="#000000")
    assert.ok(lightSvg.includes('#000000'), 'light background should use black icon');
  });

  it('lays out SPI proportions: centered icon box, large factor row', () => {
    const { width, height, iconBox, factorRowHeight, factorFontSize } = COUNTER_LAYOUT;

    const widthRatio = iconBox.w / width;
    assert.ok(widthRatio >= 0.45 && widthRatio <= 0.55, `icon box width ratio ${widthRatio}`);
    assert.equal(iconBox.x, (width - iconBox.w) / 2, 'icon box should be horizontally centered');
    assert.ok(iconBox.y + iconBox.h <= height - factorRowHeight, 'icon sits above factor row');
    assert.ok(factorRowHeight >= height * 0.2, 'factor row reserves at least 20% of counter height');
    assert.ok(factorFontSize >= 12, 'factor font should be enlarged for legibility');

    const unit = { class: 'inf', factors: { sp: 4, dv: 6, mp: 1 } };
    const svg = renderCounterSVG(unit, '#3b6cb4');
    assert.ok(svg.includes(`translate(${iconBox.x}, ${iconBox.y})`), 'SVG uses centered icon transform');
    assert.ok(svg.includes(`font-size="${factorFontSize}"`), 'SVG uses enlarged factor font');
    assert.ok(svg.includes('font-weight="700"'), 'factor text is bold');
  });
});
