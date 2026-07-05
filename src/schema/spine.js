/**
 * Game-agnostic spine model.  Adapters (GotA first) translate consumer
 * JSON into this shape and back.  The UI and validator operate only on the
 * spine plus a profile id.
 */

export const SPINE_VERSION = 1;

export function makeBlankProject(profileId = 'gota', name = 'untitled') {
  return {
    schemaVersion: SPINE_VERSION,
    name,
    profile: profileId,
    createdAt: new Date().toISOString(),
    units: [],
    assets: [],
    pools: [],
    formations: [],
    schedules: [],
    factionNotes: {},
    factionOrder: [],
    provenance: {}
  };
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function normalizeId(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function allUnitIds(project) {
  const ids = new Set();
  for (const u of project.units) ids.add(normalizeId(u.id));
  for (const a of project.assets) ids.add(normalizeId(a.id));
  return ids;
}

export function generateId(prefix = 'unit', project) {
  const existing = allUnitIds(project);
  let n = 1;
  let candidate = `${prefix}-${n}`;
  while (existing.has(normalizeId(candidate))) {
    n += 1;
    candidate = `${prefix}-${n}`;
  }
  return candidate;
}

export function ensureUniqueId(id, project) {
  const base = String(id || '').trim() || generateId('unit', project);
  const existing = allUnitIds(project);
  if (!existing.has(normalizeId(base))) return base;
  let n = 2;
  let candidate = `${base}-${n}`;
  while (existing.has(normalizeId(candidate))) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export function createUnit(project, attrs = {}, source = 'roster') {
  const id = ensureUniqueId(attrs.id, project);
  const unit = {
    id,
    name: attrs.name ?? attrs.id ?? id,
    faction: attrs.faction ?? '',
    echelon: attrs.echelon ?? attrs.size ?? '',
    class: attrs.class ?? attrs.type ?? '',
    factors: deepClone(attrs.factors ?? {}),
    tags: deepClone(attrs.tags ?? {}),
    notes: attrs.notes ?? '',
    provenance: attrs.provenance ?? '',
    source,
    fresh: attrs.fresh ?? null,
    _raw: deepClone(attrs._raw ?? attrs ?? {})
  };
  project.units.push(unit);
  return unit;
}

export function createAsset(project, attrs = {}) {
  const asset = createUnit(project, attrs, 'asset');
  project.assets.push(asset);
  // remove the duplicate from units roster
  const idx = project.units.indexOf(asset);
  if (idx !== -1) project.units.splice(idx, 1);
  return asset;
}

export function createPool(project, attrs = {}) {
  const pool = {
    faction: attrs.faction ?? '',
    sp_count: attrs.sp_count ?? 0,
    av_per_sp: attrs.av_per_sp ?? 0,
    av_per_sp_override: attrs.av_per_sp_override ?? false,
    notes: attrs.notes ?? '',
    _raw: deepClone(attrs._raw ?? attrs ?? {})
  };
  project.pools.push(pool);
  return pool;
}

export function removeUnit(project, id) {
  project.units = project.units.filter((u) => u.id !== id);
  project.assets = project.assets.filter((a) => a.id !== id);
}

export function removePool(project, faction) {
  project.pools = project.pools.filter((p) => p.faction !== faction);
}

export function deriveAvPerSp(faction, project) {
  const roster = project.units.filter((u) =>
    normalizeId(u.faction) === normalizeId(faction) &&
    /\binf\b/.test(String(u.class).toLowerCase())
  );
  if (!roster.length) return null;
  const sum = roster.reduce((acc, u) => acc + Number(u.factors?.dv ?? 0), 0);
  return sum / roster.length;
}

export function moveUnitToAssets(project, id) {
  const idx = project.units.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const u = project.units.splice(idx, 1)[0];
  u.source = 'asset';
  project.assets.push(u);
  return u;
}

export function moveAssetToRoster(project, id) {
  const idx = project.assets.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const a = project.assets.splice(idx, 1)[0];
  a.source = 'roster';
  project.units.push(a);
  return a;
}
