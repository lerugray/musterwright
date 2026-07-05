/**
 * Project store: holds spine state, loads/saves localStorage, imports/exports
 * GotA files, and validates.
 */

import { makeBlankProject, createUnit, createAsset, createPool, removeUnit, removePool, deepClone, deriveAvPerSp, normalizeId } from './schema/spine.js';
import { importGotA, exportGotA } from './adapters/gota.js';
import { validateProject } from './validate.js';

const AUTOSAVE_PREFIX = 'musterwright:';
const MAX_SLOTS = 6;

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export class ProjectStore {
  constructor() {
    this.project = makeBlankProject('gota', 'untitled');
    this.autosaveKey = null;
    this.onChange = null;
    this.validation = [];
  }

  setProject(project) {
    this.project = project;
    this.autosaveKey = AUTOSAVE_PREFIX + (project.name || 'untitled');
    this.revalidate();
    this.autosave();
    this._notify();
  }

  getProject() {
    return this.project;
  }

  getValidation() {
    return this.validation;
  }

  revalidate() {
    this.validation = validateProject(this.project);
  }

  autosave() {
    if (!this.autosaveKey) return;
    try {
      localStorage.setItem(this.autosaveKey, JSON.stringify(this.project));
    } catch (_) {
      /* storage may be full or disabled */
    }
    this._pruneSlots();
  }

  loadAutosave(name) {
    const key = AUTOSAVE_PREFIX + (name || 'untitled');
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  listSlots() {
    const slots = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(AUTOSAVE_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const p = JSON.parse(raw);
          if (!p || typeof p !== 'object') continue;
          slots.push({ key, name: p.name || 'untitled', units: p.units?.length || 0, assets: p.assets?.length || 0, pools: p.pools?.length || 0 });
        } catch (_) {}
      }
    } catch (_) {}
    return slots;
  }

  _pruneSlots() {
    const slots = this.listSlots();
    if (slots.length <= MAX_SLOTS) return;
    for (const slot of slots.slice(MAX_SLOTS)) {
      try { localStorage.removeItem(slot.key); } catch (_) {}
    }
  }

  _notify() {
    if (typeof this.onChange === 'function') this.onChange();
  }

  // ----------------- mutations -----------------

  addUnit(faction = 'USA') {
    const unit = createUnit(this.project, { faction, class: 'inf', echelon: 'xx', factors: { sp: 4, dv: 6, mp: 1 } }, 'roster');
    this._afterChange();
    return unit;
  }

  updateUnit(id, updates) {
    const unit = this.project.units.find((u) => u.id === id);
    if (!unit) return;
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'factors') {
        unit.factors = { ...unit.factors, ...v };
      } else {
        unit[k] = v;
      }
      // Keep raw mirror in sync for fields that live there too.
      if (unit._raw && (k in unit._raw)) unit._raw[k] = deepClone(v);
      if (k === 'class' && unit._raw) unit._raw.type = v;
      if (k === 'echelon' && unit._raw) unit._raw.size = v;
      if (k === 'factors') {
        for (const [fk, fv] of Object.entries(v)) {
          if (unit._raw) unit._raw[fk] = fv;
        }
      }
    }
    this._afterChange();
  }

  deleteUnit(id) {
    removeUnit(this.project, id);
    this._afterChange();
  }

  addAsset(faction = 'USA') {
    const asset = createAsset(this.project, { faction, class: 'art', echelon: 'x', factors: { av: 4, dv: 1, mp: 0 } });
    this._afterChange();
    return asset;
  }

  updateAsset(id, updates) {
    const asset = this.project.assets.find((a) => a.id === id);
    if (!asset) return;
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'factors') {
        asset.factors = { ...asset.factors, ...v };
      } else {
        asset[k] = v;
      }
      if (asset._raw && (k in asset._raw)) asset._raw[k] = deepClone(v);
      if (k === 'class' && asset._raw) asset._raw.type = v;
      if (k === 'echelon' && asset._raw) asset._raw.size = v;
      if (k === 'factors') {
        for (const [fk, fv] of Object.entries(v)) {
          if (asset._raw) asset._raw[fk] = fv;
        }
      }
    }
    this._afterChange();
  }

  deleteAsset(id) {
    this.project.assets = this.project.assets.filter((a) => a.id !== id);
    this._afterChange();
  }

  addPool(faction = 'USA') {
    const pool = createPool(this.project, { faction, sp_count: 0, av_per_sp: 0 });
    this._afterChange();
    return pool;
  }

  updatePool(faction, updates) {
    const pool = this.project.pools.find((p) => p.faction === faction);
    if (!pool) return;
    for (const [k, v] of Object.entries(updates)) {
      pool[k] = v;
      if (pool._raw && (k in pool._raw)) pool._raw[k] = deepClone(v);
    }
    this._afterChange();
  }

  deletePool(faction) {
    removePool(this.project, faction);
    this._afterChange();
  }

  setPoolOverride(faction, override) {
    const pool = this.project.pools.find((p) => p.faction === faction);
    if (!pool) return;
    pool.av_per_sp_override = override;
    this._afterChange();
  }

  _afterChange() {
    this.revalidate();
    this.autosave();
    this._notify();
  }

  // ----------------- import / export -----------------

  async importGotAFiles(oobUrl, assetsUrl, poolsUrl) {
    const [oob, assets, sp_pools] = await Promise.all([
      fetch(oobUrl).then((r) => r.json()),
      fetch(assetsUrl).then((r) => r.json()),
      fetch(poolsUrl).then((r) => r.json())
    ]);
    const project = importGotA({ oob, assets, sp_pools });
    this.setProject(project);
    return project;
  }

  exportGotAFiles() {
    return exportGotA(this.project);
  }

  exportJsonBlob() {
    return exportGotA(this.project);
  }
}

export function makeBlankGotAProject(name = 'untitled') {
  return makeBlankProject('gota', name);
}

export { deriveAvPerSp, normalizeId };
