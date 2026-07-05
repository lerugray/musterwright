/**
 * GotA adapter: translates between the consumer JSON shape
 * (oob.json, assets.json, sp_pools.json) and the musterwright spine.
 */

import { makeBlankProject, deepClone } from '../schema/spine.js';
import { GOTA_PROFILE } from '../schema/profiles.js';

export { GOTA_PROFILE };

const ROSTER_FIELDS = new Set([
  ...GOTA_PROFILE.rosterUnitFields.required,
  ...GOTA_PROFILE.rosterUnitFields.optional
]);

const ASSET_FIELDS = new Set([
  ...GOTA_PROFILE.assetUnitFields.required,
  ...GOTA_PROFILE.assetUnitFields.optional
]);

function isNoteKey(key) {
  return typeof key === 'string' && key.startsWith('_note_');
}

function factionForNoteKey(key) {
  return key.slice('_note_'.length);
}

function rawToFactors(raw, source) {
  const factors = {};
  if (source === 'roster') {
    if (raw.sp !== undefined) factors.sp = raw.sp;
    if (raw.dv !== undefined) factors.dv = raw.dv;
    if (raw.mp !== undefined) factors.mp = raw.mp;
  } else {
    if (raw.av !== undefined) factors.av = raw.av;
    if (raw.dv !== undefined) factors.dv = raw.dv;
    if (raw.mp !== undefined) factors.mp = raw.mp;
  }
  return factors;
}

function rawToUnit(raw, source) {
  const attrs = {
    id: raw.id,
    name: raw.id,
    faction: raw.faction,
    echelon: raw.size,
    class: raw.type,
    factors: rawToFactors(raw, source),
    source,
    fresh: raw.fresh ?? null,
    _raw: deepClone(raw)
  };
  return attrs;
}

function makeUnit(raw, source) {
  return {
    id: raw.id,
    name: raw.id,
    faction: raw.faction,
    echelon: raw.size,
    class: raw.type,
    factors: rawToFactors(raw, source),
    source,
    fresh: raw.fresh ?? null,
    _raw: deepClone(raw)
  };
}

export function importGotA({ oob = {}, assets = {}, sp_pools = {} } = {}) {
  const project = makeBlankProject('gota', 'gota');
  project.factionOrder = [];

  // OOB file may contain faction arrays and `_note_*` strings.
  for (const [key, value] of Object.entries(oob)) {
    if (isNoteKey(key)) {
      const faction = factionForNoteKey(key);
      if (typeof value === 'string') {
        project.factionNotes[faction] = value;
      }
      continue;
    }
    if (!Array.isArray(value)) continue;
    if (!project.factionOrder.includes(key)) project.factionOrder.push(key);
    for (const raw of value) {
      if (!raw || typeof raw !== 'object') continue;
      project.units.push(makeUnit(raw, 'roster'));
    }
  }

  // Assets file
  for (const [key, value] of Object.entries(assets)) {
    if (isNoteKey(key)) continue;
    if (!Array.isArray(value)) continue;
    if (!project.factionOrder.includes(key)) project.factionOrder.push(key);
    for (const raw of value) {
      if (!raw || typeof raw !== 'object') continue;
      project.assets.push(makeUnit(raw, 'asset'));
    }
  }

  // SP pools file
  const poolFactions = [];
  for (const [faction, raw] of Object.entries(sp_pools)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    poolFactions.push(faction);
    project.pools.push({
      faction,
      sp_count: raw.sp_count,
      av_per_sp: raw.av_per_sp,
      av_per_sp_override: false,
      notes: raw.notes ?? '',
      _raw: deepClone(raw)
    });
  }

  // Ensure every faction seen anywhere is in the order list.
  for (const faction of poolFactions) {
    if (!project.factionOrder.includes(faction)) project.factionOrder.push(faction);
  }

  return project;
}

function unitToRaw(unit, source) {
  const raw = {
    id: unit.id,
    faction: unit.faction,
    type: unit.class,
    size: unit.echelon,
    dv: unit.factors.dv ?? 0,
    mp: unit.factors.mp ?? 0
  };
  if (source === 'roster') {
    raw.sp = unit.factors.sp ?? 0;
  } else {
    raw.av = unit.factors.av ?? 0;
  }
  if (unit.fresh === true || unit.fresh === false) {
    raw.fresh = unit.fresh;
  }
  // Preserve any additional keys the source file carried that the spine does
  // not model (counter images, playability flags, etc.).
  const known = source === 'roster' ? ROSTER_FIELDS : ASSET_FIELDS;
  for (const [k, v] of Object.entries(unit._raw || {})) {
    if (known.has(k)) continue;
    if (k === 'fresh' && (v === true || v === false)) continue; // already handled
    raw[k] = deepClone(v);
  }
  return raw;
}

function sortById(list) {
  return [...list].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function exportGotA(project, { sortUnits = false } = {}) {
  const oob = {};
  const assets = {};
  const sp_pools = {};

  const factions = Array.from(new Set([
    ...project.factionOrder || [],
    ...project.units.map((u) => u.faction),
    ...project.assets.map((a) => a.faction),
    ...project.pools.map((p) => p.faction)
  ])).filter(Boolean);

  for (const faction of factions) {
    const roster = (sortUnits
      ? sortById(project.units.filter((u) => u.faction === faction))
      : project.units.filter((u) => u.faction === faction));
    if (roster.length) {
      oob[faction] = roster.map((u) => unitToRaw(u, 'roster'));
    }

    const assetList = (sortUnits
      ? sortById(project.assets.filter((a) => a.faction === faction))
      : project.assets.filter((a) => a.faction === faction));
    if (assetList.length) {
      assets[faction] = assetList.map((a) => unitToRaw(a, 'asset'));
    }

    const pool = project.pools.find((p) => p.faction === faction);
    if (pool) {
      const raw = { sp_count: pool.sp_count, av_per_sp: pool.av_per_sp };
      if (pool.notes) raw.notes = pool.notes;
      sp_pools[faction] = raw;
    }

    const note = project.factionNotes?.[faction];
    if (typeof note === 'string' && note.trim()) {
      oob[`_note_${faction}`] = note;
    }
  }

  return { oob, assets, sp_pools };
}

export function gotaFilesToProject({ oob, assets, sp_pools }) {
  return importGotA({ oob, assets, sp_pools });
}

export function projectToGotaFiles(project, opts = {}) {
  return exportGotA(project, opts);
}
