import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { importGotA, exportGotA } from '../src/adapters/gota.js';
import { roundTripEqual } from '../src/validate.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(here, 'fixtures');

function load(name) {
  return JSON.parse(readFileSync(resolve(fixtures, name), 'utf8'));
}

describe('GotA adapter', () => {
  it('imports the synthetic fixture into the spine', () => {
    const project = importGotA({
      oob: load('oob.json'),
      assets: load('assets.json'),
      sp_pools: load('sp_pools.json')
    });
    assert.equal(project.profile, 'gota');
    assert.equal(project.units.length, 2);
    assert.equal(project.assets.length, 2);
    assert.equal(project.pools.length, 2);
    const usa = project.units.find((u) => u.faction === 'USA');
    assert.ok(usa);
    assert.equal(usa.factors.sp, 4);
    assert.equal(usa.factors.dv, 7.0);
    assert.equal(usa.class, 'inf');
    assert.equal(usa.echelon, 'xx');
  });

  it('round-trips the synthetic fixture', () => {
    const source = {
      oob: load('oob.json'),
      assets: load('assets.json'),
      sp_pools: load('sp_pools.json')
    };
    const project = importGotA(source);
    const exported = exportGotA(project);
    assert.ok(roundTripEqual(source, exported), 'exported data should be semantically equal to source');
  });

  it('imports assets without duplicating them in the roster', () => {
    const project = importGotA({
      oob: load('oob.json'),
      assets: load('assets.json'),
      sp_pools: load('sp_pools.json')
    });
    const assetIds = new Set(project.assets.map((a) => a.id));
    for (const u of project.units) {
      assert.ok(!assetIds.has(u.id), 'asset id must not appear in roster list');
    }
  });
});
