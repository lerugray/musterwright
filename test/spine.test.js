import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeBlankProject,
  generateId,
  ensureUniqueId,
  createUnit,
  createAsset,
  createPool,
  removeUnit,
  deriveAvPerSp
} from '../src/schema/spine.js';

describe('spine model', () => {
  it('generates a unique id against existing units and assets', () => {
    const p = makeBlankProject('gota');
    const id1 = generateId('unit', p);
    createUnit(p, { id: id1, faction: 'USA' }, 'roster');
    const id2 = generateId('unit', p);
    assert.notEqual(id1, id2);
    createAsset(p, { id: id2, faction: 'USA' });
    const id3 = generateId('unit', p);
    assert.ok(!new Set([id1, id2]).has(id3));
  });

  it('ensures uniqueness by appending a counter', () => {
    const p = makeBlankProject('gota');
    createUnit(p, { id: 'A', faction: 'USA' }, 'roster');
    assert.equal(ensureUniqueId('A', p), 'A-2');
    assert.equal(ensureUniqueId('A', p), 'A-2'); // deterministic against current state)
    createUnit(p, { id: 'A-2', faction: 'USA' }, 'roster');
    assert.equal(ensureUniqueId('A', p), 'A-3');
  });

  it('is case/whitespace tolerant for id uniqueness', () => {
    const p = makeBlankProject('gota');
    createUnit(p, { id: '  A  ', faction: 'USA' }, 'roster');
    assert.equal(ensureUniqueId('a', p), 'a-2');
  });

  it('creates assets separately from roster', () => {
    const p = makeBlankProject('gota');
    createUnit(p, { id: 'U1', faction: 'USA' }, 'roster');
    createAsset(p, { id: 'A1', faction: 'USA' });
    assert.equal(p.units.length, 1);
    assert.equal(p.assets.length, 1);
    assert.equal(p.assets[0].source, 'asset');
  });

  it('removes a unit from both roster and assets', () => {
    const p = makeBlankProject('gota');
    createUnit(p, { id: 'U1', faction: 'USA' }, 'roster');
    createAsset(p, { id: 'A1', faction: 'USA' });
    removeUnit(p, 'U1');
    removeUnit(p, 'A1');
    assert.equal(p.units.length, 0);
    assert.equal(p.assets.length, 0);
  });

  it('derives av_per_sp from infantry roster dv mean', () => {
    const p = makeBlankProject('gota');
    createUnit(p, { id: 'U1', faction: 'USA', class: 'inf', factors: { dv: 6 } }, 'roster');
    createUnit(p, { id: 'U2', faction: 'USA', class: 'inf', factors: { dv: 8 } }, 'roster');
    createUnit(p, { id: 'U3', faction: 'USA', class: 'cav', factors: { dv: 5 } }, 'roster');
    assert.equal(deriveAvPerSp('USA', p), 7);
    assert.equal(deriveAvPerSp('CSA', p), null);
  });

  it('creates pools', () => {
    const p = makeBlankProject('gota');
    const pool = createPool(p, { faction: 'USA', sp_count: 10, av_per_sp: 4.5 });
    assert.equal(pool.faction, 'USA');
    assert.equal(pool.sp_count, 10);
    assert.equal(pool.av_per_sp, 4.5);
  });
});
