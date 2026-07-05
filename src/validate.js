/**
 * Live validation: duplicate ids, schema conformance, cross-file collisions,
 * pool derivations, and unknown-field warnings.  Returns an array of findings
 * the UI can render as a panel with row links.
 */

import { GOTA_PROFILE, getProfile } from './schema/profiles.js';
import { deriveAvPerSp, normalizeId, deepClone } from './schema/spine.js';

const EPSILON = 1e-6;

function isNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function finding({ severity, kind, section, id, faction, field, message, derived, stored }) {
  return { severity, kind, section, id, faction, field, message, derived, stored };
}

function checkUnitSchema(unit, section, findings) {
  const schema = section === 'roster'
    ? GOTA_PROFILE.rosterUnitFields
    : GOTA_PROFILE.assetUnitFields;
  const known = new Set([...schema.required, ...schema.optional]);
  const raw = unit._raw || {};

  for (const k of schema.required) {
    if (!(k in raw) && unit[k] === undefined && unit.factors?.[k] === undefined) {
      findings.push(finding({
        severity: 'error',
        kind: 'missing-field',
        section,
        id: unit.id,
        faction: unit.faction,
        field: k,
        message: `${section} unit ${unit.id} missing required field "${k}"`
      }));
    }
  }

  for (const k of Object.keys(raw)) {
    if (!known.has(k)) {
      findings.push(finding({
        severity: 'warning',
        kind: 'unknown-field',
        section,
        id: unit.id,
        faction: unit.faction,
        field: k,
        message: `${section} unit ${unit.id} has unknown field "${k}"`
      }));
    }
  }

  for (const k of schema.numeric) {
    const v = raw[k];
    if (v !== undefined && !isNumber(v)) {
      findings.push(finding({
        severity: 'error',
        kind: 'bad-type',
        section,
        id: unit.id,
        faction: unit.faction,
        field: k,
        message: `${section} unit ${unit.id}.${k} must be a finite number`
      }));
    }
  }

  for (const k of schema.text) {
    const v = raw[k];
    if (v !== undefined && typeof v !== 'string') {
      findings.push(finding({
        severity: 'error',
        kind: 'bad-type',
        section,
        id: unit.id,
        faction: unit.faction,
        field: k,
        message: `${section} unit ${unit.id}.${k} must be a string`
      }));
    }
  }
}

function checkPoolSchema(pool, findings) {
  const schema = GOTA_PROFILE.poolFields;
  const known = new Set([...schema.required, ...schema.optional]);
  const raw = pool._raw || {};

  for (const k of schema.required) {
    if (!(k in raw) && pool[k] === undefined) {
      findings.push(finding({
        severity: 'error',
        kind: 'missing-field',
        section: 'pools',
        faction: pool.faction,
        field: k,
        message: `Pool ${pool.faction} missing required field "${k}"`
      }));
    }
  }

  for (const k of Object.keys(raw)) {
    if (!known.has(k)) {
      findings.push(finding({
        severity: 'warning',
        kind: 'unknown-field',
        section: 'pools',
        faction: pool.faction,
        field: k,
        message: `Pool ${pool.faction} has unknown field "${k}"`
      }));
    }
  }

  for (const k of schema.numeric) {
    const v = raw[k] ?? pool[k];
    if (v !== undefined && !isNumber(v)) {
      findings.push(finding({
        severity: 'error',
        kind: 'bad-type',
        section: 'pools',
        faction: pool.faction,
        field: k,
        message: `Pool ${pool.faction}.${k} must be a finite number`
      }));
    }
  }
}

function checkDuplicates(items, section, findings) {
  const byNorm = new Map();
  for (const item of items) {
    const nid = normalizeId(item.id);
    if (!nid) continue;
    if (!byNorm.has(nid)) {
      byNorm.set(nid, []);
    }
    byNorm.get(nid).push(item);
  }
  for (const [nid, hits] of byNorm) {
    if (hits.length > 1) {
      const ids = hits.map((h) => h.id).join('", "');
      findings.push(finding({
        severity: 'error',
        kind: 'duplicate-id',
        section,
        id: hits[0].id,
        faction: hits[0].faction,
        message: `Duplicate ${section} id "${hits[0].id}" appears ${hits.length} times (normalized: ${nid}) — ids: "${ids}"`
      }));
    }
  }
}

function checkCrossCollisions(project, findings) {
  const rosterByNorm = new Map();
  for (const u of project.units) {
    const nid = normalizeId(u.id);
    if (nid) rosterByNorm.set(nid, u);
  }
  for (const a of project.assets) {
    const nid = normalizeId(a.id);
    if (!nid) continue;
    const u = rosterByNorm.get(nid);
    if (u) {
      findings.push(finding({
        severity: 'error',
        kind: 'cross-collision',
        section: 'assets',
        id: a.id,
        faction: a.faction,
        message: `Asset id "${a.id}" collides with roster unit "${u.id}" (same faction=${a.faction === u.faction ? a.faction : `${a.faction}/${u.faction}`})`
      }));
    }
  }
}

function checkPools(project, findings) {
  const poolFactions = new Set(project.pools.map((p) => normalizeId(p.faction)));
  const unitFactions = new Set([
    ...project.units.map((u) => normalizeId(u.faction)),
    ...project.assets.map((a) => normalizeId(a.faction))
  ]);

  for (const pool of project.pools) {
    checkPoolSchema(pool, findings);
    const derived = deriveAvPerSp(pool.faction, project);
    const stored = Number(pool.av_per_sp);
    const differs = derived !== null && Math.abs(stored - derived) > EPSILON;
    if (derived !== null) {
      findings.push(finding({
        severity: pool.av_per_sp_override ? 'info' : (differs ? 'warning' : 'info'),
        kind: 'pool-derivation',
        section: 'pools',
        faction: pool.faction,
        field: 'av_per_sp',
        stored,
        derived,
        message: `Pool ${pool.faction}: av_per_sp stored=${stored.toFixed(3)}, derived=${derived.toFixed(3)}${pool.av_per_sp_override ? ' (manual override)' : differs ? ' — derivation mismatch' : ' — matches derivation'}`
      }));
    }
  }

  for (const f of unitFactions) {
    if (!poolFactions.has(f)) {
      findings.push(finding({
        severity: 'warning',
        kind: 'missing-pool',
        section: 'pools',
        faction: f,
        message: `Faction "${f}" has units/assets but no SP pool entry`
      }));
    }
  }
}

export function validateProject(project) {
  const findings = [];

  if (!project || typeof project !== 'object') {
    findings.push(finding({
      severity: 'error',
      kind: 'bad-project',
      section: 'project',
      message: 'Project is not an object'
    }));
    return findings;
  }

  const profile = getProfile(project.profile);
  if (!profile) {
    findings.push(finding({
      severity: 'error',
      kind: 'unknown-profile',
      section: 'project',
      message: `Unknown profile "${project.profile}"`
    }));
  }

  for (const u of project.units || []) checkUnitSchema(u, 'roster', findings);
  for (const a of project.assets || []) checkUnitSchema(a, 'assets', findings);

  checkDuplicates(project.units || [], 'roster', findings);
  checkDuplicates(project.assets || [], 'assets', findings);
  checkCrossCollisions(project, findings);
  checkPools(project, findings);

  return findings;
}

export function hasErrors(findings) {
  return findings.some((f) => f.severity === 'error');
}

export function findingsBySeverity(findings) {
  const counts = { error: 0, warning: 0, info: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  return counts;
}

export function normalizeForRoundTrip({ oob, assets, sp_pools }) {
  // Stable semantic normalizer: ignore key order, unit order, and numeric
  // representation so import→export can be proven equivalent even when
  // formatting differs.
  function normValue(v) {
    if (Array.isArray(v)) {
      const normalized = v.map(normValue);
      return normalized.sort((a, b) => {
        const aid = normalizeId(a?.id ?? '');
        const bid = normalizeId(b?.id ?? '');
        if (aid !== bid) return aid.localeCompare(bid);
        return JSON.stringify(a).localeCompare(JSON.stringify(b));
      });
    }
    if (v && typeof v === 'object') {
      const out = {};
      const keys = Object.keys(v).sort();
      for (const k of keys) {
        out[k] = normValue(v[k]);
      }
      return out;
    }
    if (typeof v === 'number') {
      return Number(v.toFixed(6));
    }
    return v;
  }
  return {
    oob: normValue(oob),
    assets: normValue(assets),
    sp_pools: normValue(sp_pools)
  };
}

export function roundTripEqual(source, exported) {
  const a = normalizeForRoundTrip(source);
  const b = normalizeForRoundTrip(exported);
  return JSON.stringify(a) === JSON.stringify(b);
}
