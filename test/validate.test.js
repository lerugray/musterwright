import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { importGotA } from '../src/adapters/gota.js';
import { validateProject, hasErrors, findingsBySeverity } from '../src/validate.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(here, 'fixtures');

function load(name) {
  return JSON.parse(readFileSync(resolve(fixtures, name), 'utf8'));
}

describe('validator', () => {
  it('has no errors on the clean synthetic fixture', () => {
    const project = importGotA({
      oob: load('oob.json'),
      assets: load('assets.json'),
      sp_pools: load('sp_pools.json')
    });
    const findings = validateProject(project);
    assert.equal(hasErrors(findings), false);
  });

  it('flags duplicate asset ids', () => {
    const project = importGotA({
      oob: load('oob.json'),
      assets: load('duplicate-assets.json'),
      sp_pools: load('sp_pools.json')
    });
    const findings = validateProject(project);
    assert.equal(hasErrors(findings), true);
    const dup = findings.find((f) => f.kind === 'duplicate-id' && f.section === 'assets');
    assert.ok(dup, 'expected duplicate-id finding in assets');
    assert.equal(normalizeId(dup.id), '152.0');
  });

  it('warns on unknown unit fields', () => {
    const oob = load('oob.json');
    oob.USA[0].post_v1 = true;
    const project = importGotA({
      oob,
      assets: load('assets.json'),
      sp_pools: load('sp_pools.json')
    });
    const findings = validateProject(project);
    const unknown = findings.find((f) => f.kind === 'unknown-field' && f.field === 'post_v1');
    assert.ok(unknown);
    assert.equal(unknown.severity, 'warning');
  });

  it('reports derivation info for pools', () => {
    const project = importGotA({
      oob: load('oob.json'),
      assets: load('assets.json'),
      sp_pools: load('sp_pools.json')
    });
    const findings = validateProject(project);
    const derivation = findings.find((f) => f.kind === 'pool-derivation');
    assert.ok(derivation);
    assert.ok(Number.isFinite(derivation.derived));
    assert.ok(Number.isFinite(derivation.stored));
  });

  it('counts findings by severity', () => {
    const project = importGotA({
      oob: load('oob.json'),
      assets: load('duplicate-assets.json'),
      sp_pools: load('sp_pools.json')
    });
    const findings = validateProject(project);
    const counts = findingsBySeverity(findings);
    assert.ok(counts.error >= 1);
    assert.ok('warning' in counts);
    assert.ok('info' in counts);
  });
});

function normalizeId(value) {
  return String(value ?? '').trim().toLowerCase();
}
