/**
 * Musterwright app bootstrap.  Plain ES modules, zero build.
 */

import { ProjectStore, makeBlankGotAProject } from './store.js';
import { renderDataTable, downloadJson, highlightRow, el } from './ui.js';
import { findingsBySeverity } from './validate.js';
import { deriveAvPerSp } from './schema/spine.js';
import { renderCounterSVG, getFactionColor } from './counters/render-counter.js';
import {
  initTheme,
  toggleTheme,
  setStoredTheme,
  applyTheme,
  themeToggleLabel
} from './theme.js';

const store = new ProjectStore();

let currentTheme = initTheme(document, localStorage, window.matchMedia('(prefers-color-scheme: dark)'));

const UI = {
  projectName: document.getElementById('project-name'),
  autosaveStatus: document.getElementById('autosave-status'),
  tabButtons: document.querySelectorAll('[data-tab]'),
  tabPanes: document.querySelectorAll('[data-pane]'),
  rosterContainer: document.getElementById('roster-container'),
  assetsContainer: document.getElementById('assets-container'),
  poolsContainer: document.getElementById('pools-container'),
  validationContainer: document.getElementById('validation-container'),
  countersContainer: document.getElementById('counters-container'),
  openGotA: document.getElementById('open-gota'),
  newBlank: document.getElementById('new-blank'),
  exportOob: document.getElementById('export-oob'),
  exportAssets: document.getElementById('export-assets'),
  exportPools: document.getElementById('export-pools'),
  exportAll: document.getElementById('export-all'),
  themeToggle: document.getElementById('theme-toggle')
};

UI.themeToggle.textContent = themeToggleLabel(currentTheme);
UI.themeToggle.addEventListener('click', () => {
  currentTheme = toggleTheme(currentTheme);
  applyTheme(document, currentTheme);
  setStoredTheme(localStorage, currentTheme);
  UI.themeToggle.textContent = themeToggleLabel(currentTheme);
});

const sortState = {
  roster: { key: null, dir: 'asc' },
  assets: { key: null, dir: 'asc' },
  pools: { key: null, dir: 'asc' }
};

let highlightedId = null;

function switchTab(tab, { keepHighlight = false } = {}) {
  for (const btn of UI.tabButtons) btn.classList.toggle('active', btn.dataset.tab === tab);
  for (const pane of UI.tabPanes) pane.hidden = pane.dataset.pane !== tab;
  if (!keepHighlight && tab !== 'validation') highlightedId = null;
  render();
}

for (const btn of UI.tabButtons) {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
}

function updateTitle() {
  const p = store.getProject();
  UI.projectName.textContent = p.name || 'untitled';
  document.title = `Musterwright — ${p.name || 'untitled'}`;
}

function updateStatus() {
  UI.autosaveStatus.textContent = `saved ${new Date().toLocaleTimeString()}`;
}

function makeRosterColumns() {
  return [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'faction', label: 'Faction', type: 'text' },
    { key: 'class', label: 'Type', accessor: 'class', type: 'text' },
    { key: 'echelon', label: 'Size', accessor: 'echelon', type: 'text' },
    { key: 'sp', label: 'SP', accessor: 'factors.sp', type: 'number' },
    { key: 'dv', label: 'DV', accessor: 'factors.dv', type: 'number' },
    { key: 'mp', label: 'MP', accessor: 'factors.mp', type: 'number' },
    { key: 'fresh', label: 'Fresh', type: 'boolean' }
  ];
}

function makeAssetColumns() {
  return [
    { key: 'id', label: 'ID', type: 'text' },
    { key: 'faction', label: 'Faction', type: 'text' },
    { key: 'class', label: 'Type', accessor: 'class', type: 'text' },
    { key: 'echelon', label: 'Size', accessor: 'echelon', type: 'text' },
    { key: 'av', label: 'AV', accessor: 'factors.av', type: 'number' },
    { key: 'dv', label: 'DV', accessor: 'factors.dv', type: 'number' },
    { key: 'mp', label: 'MP', accessor: 'factors.mp', type: 'number' },
    { key: 'fresh', label: 'Fresh', type: 'boolean' }
  ];
}

function makePoolColumns() {
  return [
    { key: 'faction', label: 'Faction', type: 'text' },
    { key: 'sp_count', label: 'SP Count', type: 'number' },
    { key: 'av_per_sp', label: 'AV per SP', type: 'number' },
    {
      key: 'av_per_sp_override',
      label: 'Override',
      type: 'boolean',
      format: (v, row) => v ? 'yes' : 'no'
    },
    { key: 'derived', label: 'Derived', type: 'number', format: (v, row) => {
      const d = deriveAvPerSp(row.faction, store.getProject());
      return d === null ? '—' : d.toFixed(2);
    } },
    { key: 'notes', label: 'Notes', type: 'text' }
  ];
}

function readPath(obj, path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}

function adaptRowsForTable(rows, columns) {
  return rows.map((row) => {
    const adapted = { ...row };
    for (const col of columns) {
      if (col.accessor) adapted[col.key] = readPath(row, col.accessor);
    }
    return adapted;
  });
}

function buildUpdateFn(storeMethod, factorPrefix) {
  return (row, updates) => {
    const normalized = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k.startsWith('factors.')) {
        normalized.factors = normalized.factors || {};
        normalized.factors[k.slice('factors.'.length)] = v;
      } else if (k === 'sp' || k === 'dv' || k === 'mp' || k === 'av') {
        normalized.factors = normalized.factors || {};
        normalized.factors[k] = v;
      } else {
        normalized[k] = v;
      }
    }
    store[storeMethod](row.id, normalized);
  };
}

function renderRoster() {
  const project = store.getProject();
  const columns = makeRosterColumns();
  const rows = adaptRowsForTable(project.units, columns);
  renderDataTable({
    container: UI.rosterContainer,
    columns,
    rows,
    sortState: sortState.roster,
    highlightedId,
    onSort: (s) => { sortState.roster = s; renderRoster(); },
    onUpdate: buildUpdateFn('updateUnit'),
    onDelete: (row) => store.deleteUnit(row.id),
    onAdd: () => store.addUnit()
  });
}

function renderAssets() {
  const project = store.getProject();
  const columns = makeAssetColumns();
  const rows = adaptRowsForTable(project.assets, columns);
  renderDataTable({
    container: UI.assetsContainer,
    columns,
    rows,
    sortState: sortState.assets,
    highlightedId,
    onSort: (s) => { sortState.assets = s; renderAssets(); },
    onUpdate: buildUpdateFn('updateAsset'),
    onDelete: (row) => store.deleteAsset(row.id),
    onAdd: () => store.addAsset()
  });
}

function renderPools() {
  const project = store.getProject();
  const columns = makePoolColumns();
  const rows = project.pools.map((p) => ({ ...p, derived: null }));
  renderDataTable({
    container: UI.poolsContainer,
    columns,
    rows,
    getRowId: (row) => row.faction,
    sortState: sortState.pools,
    highlightedId,
    onSort: (s) => { sortState.pools = s; renderPools(); },
    onUpdate: (row, updates) => {
      if ('av_per_sp_override' in updates) {
        store.setPoolOverride(row.faction, updates.av_per_sp_override);
      } else {
        store.updatePool(row.faction, updates);
      }
    },
    onDelete: (row) => store.deletePool(row.faction),
    onAdd: () => store.addPool()
  });
}

function severityClass(sev) {
  return sev === 'error' ? 'badge-error' : sev === 'warning' ? 'badge-warn' : 'badge-info';
}

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

function renderValidation() {
  const findings = [...store.getValidation()].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );
  const counts = findingsBySeverity(findings);
  UI.validationContainer.innerHTML = '';

  const summary = el('div', { className: 'validation-summary' },
    el('span', { className: 'badge-error' }, `${counts.error} errors`),
    el('span', { className: 'badge-warn' }, `${counts.warning} warnings`),
    el('span', { className: 'badge-info' }, `${counts.info} info`)
  );
  UI.validationContainer.append(summary);

  if (!findings.length) {
    UI.validationContainer.append(el('p', { textContent: 'No findings.' }));
    return;
  }

  const list = el('ul', { className: 'validation-list' });
  for (const f of findings) {
    const li = el('li', { className: 'validation-item' },
      el('span', { className: `badge ${severityClass(f.severity)}` }, f.severity),
      el('span', { className: 'validation-message', textContent: f.message })
    );
    if (f.id || f.faction) {
      li.classList.add('linked');
      li.addEventListener('click', () => {
        const section = f.section === 'assets' ? 'assets' : f.section === 'pools' ? 'pools' : 'roster';
        highlightedId = f.id || f.faction;
        switchTab(section, { keepHighlight: true });
      });
    }
    list.append(li);
  }
  UI.validationContainer.append(list);
}

function renderCounters() {
  const project = store.getProject();
  const container = UI.countersContainer;
  container.innerHTML = '';

  const units = project.units;
  if (!units.length) {
    container.append(el('p', { className: 'empty', textContent: 'No units in the roster.' }));
    return;
  }

  // Group units by faction
  const byFaction = {};
  for (const u of units) {
    const f = u.faction || 'Unknown';
    if (!byFaction[f]) byFaction[f] = [];
    byFaction[f].push(u);
  }

  for (const [faction, factionUnits] of Object.entries(byFaction)) {
    const color = getFactionColor(faction);
    const group = el('div', { className: 'counter-group' },
      el('h3', { className: 'counter-faction-label', textContent: faction })
    );
    const grid = el('div', { className: 'counter-grid' });

    for (const u of factionUnits) {
      const svgStr = renderCounterSVG(u, color);
      const cell = el('div', { className: 'counter-cell' });
      cell.innerHTML = svgStr;
      // Add unit id label below the counter
      const label = el('div', { className: 'counter-unit-label', textContent: u.name || u.id });
      cell.append(label);
      grid.append(cell);
    }

    group.append(grid);
    container.append(group);
  }
}

function render() {
  updateTitle();
  updateStatus();
  const active = document.querySelector('[data-tab].active')?.dataset.tab || 'roster';
  if (active === 'roster') renderRoster();
  if (active === 'assets') renderAssets();
  if (active === 'pools') renderPools();
  if (active === 'validation') renderValidation();
  if (active === 'counters') renderCounters();
}

store.onChange = render;

function exportFile(name, obj) {
  downloadJson(name, obj);
}

UI.openGotA.addEventListener('click', async () => {
  try {
    const base = window.location.href;
    await store.importGotAFiles(
      new URL('local/gota/source/oob.json', base).href,
      new URL('local/gota/source/assets.json', base).href,
      new URL('local/gota/source/sp_pools.json', base).href
    );
  } catch (e) {
    alert(`Failed to open GotA source: ${e.message}`);
  }
});

UI.newBlank.addEventListener('click', () => {
  store.setProject(makeBlankGotAProject('untitled'));
});

UI.exportOob.addEventListener('click', () => {
  exportFile('oob.json', store.exportGotAFiles().oob);
});

UI.exportAssets.addEventListener('click', () => {
  exportFile('assets.json', store.exportGotAFiles().assets);
});

UI.exportPools.addEventListener('click', () => {
  exportFile('sp_pools.json', store.exportGotAFiles().sp_pools);
});

UI.exportAll.addEventListener('click', () => {
  const { oob, assets, sp_pools } = store.exportGotAFiles();
  exportFile('oob.json', oob);
  exportFile('assets.json', assets);
  exportFile('sp_pools.json', sp_pools);
});

async function boot() {
  const params = new URLSearchParams(window.location.search);
  const project = params.get('project');
  if (project) {
    try {
      const base = window.location.href;
      const dir = project.replace(/\/$/, '');
      await store.importGotAFiles(
        new URL(`${dir}/oob.json`, base).href,
        new URL(`${dir}/assets.json`, base).href,
        new URL(`${dir}/sp_pools.json`, base).href
      );
    } catch (e) {
      console.error(e);
    }
  } else {
    // If there is a stored autosave, prefer it to the blank default.
    const slots = store.listSlots();
    if (slots.length > 0) {
      const saved = store.loadAutosave(slots[0].name);
      if (saved) store.setProject(saved);
    }
  }
  render();
}

boot();

// Expose a small API for verify scripts / console inspection.
window.musterwright = { store, render, switchTab };
