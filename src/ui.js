/**
 * Small table-first UI helpers.  No framework; plain DOM.
 */

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'textContent') e.textContent = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    if (Array.isArray(c)) e.append(...c);
    else if (typeof c === 'string' || typeof c === 'number') e.append(document.createTextNode(c));
    else e.append(c);
  }
  return e;
}

function formatCell(value, type) {
  if (value === null || value === undefined) return '';
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number') return Number(value).toString();
  return String(value);
}

function parseInput(value, type) {
  if (type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (type === 'boolean') return !!value;
  return value;
}

export function renderDataTable({
  container,
  columns,
  rows,
  getRowId = (row) => row.id,
  sortState = { key: null, dir: 'asc' },
  onSort,
  onUpdate,
  onDelete,
  onAdd,
  highlightedId = null
}) {
  container.innerHTML = '';

  const table = el('table', { className: 'data-table' });
  const thead = el('thead');
  const headerRow = el('tr');
  for (const col of columns) {
    const th = el('th', { className: 'sortable' }, col.label || col.key);
    if (sortState.key === col.key) {
      th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
      th.append(document.createTextNode(sortState.dir === 'asc' ? ' ▲' : ' ▼'));
    }
    th.addEventListener('click', () => {
      const dir = sortState.key === col.key && sortState.dir === 'asc' ? 'desc' : 'asc';
      onSort?.({ key: col.key, dir });
    });
    headerRow.append(th);
  }
  headerRow.append(el('th', { className: 'actions' }, 'Actions'));
  thead.append(headerRow);
  table.append(thead);

  const tbody = el('tbody');
  let displayRows = [...rows];
  if (sortState.key) {
    const col = columns.find((c) => c.key === sortState.key);
    if (col) {
      displayRows.sort((a, b) => {
        const av = a[col.accessor ?? col.key];
        const bv = b[col.accessor ?? col.key];
        const as = String(av ?? '').toLowerCase();
        const bs = String(bv ?? '').toLowerCase();
        let cmp = as > bs ? 1 : as < bs ? -1 : 0;
        if (col.type === 'number') {
          cmp = (Number(av) || 0) - (Number(bv) || 0);
        }
        return sortState.dir === 'asc' ? cmp : -cmp;
      });
    }
  }

  for (const row of displayRows) {
    const tr = el('tr', { 'data-row-id': getRowId(row) });
    if (String(getRowId(row)) === String(highlightedId)) {
      tr.classList.add('highlight');
    }
    for (const col of columns) {
      const td = el('td');
      const rawValue = col.accessor ? row[col.accessor] : row[col.key];
      const value = col.format ? col.format(rawValue, row) : formatCell(rawValue, col.type);
      if (col.type === 'boolean') {
        const checkbox = el('input', {
          type: 'checkbox',
          checked: !!rawValue,
          'data-key': col.accessor || col.key
        });
        checkbox.addEventListener('change', (e) => {
          const updates = { [col.accessor || col.key]: e.target.checked };
          onUpdate?.(row, updates);
        });
        td.append(checkbox);
      } else {
        td.textContent = value;
        td.addEventListener('click', () => {
          if (td.querySelector('input')) return;
          const input = el('input', {
            type: col.type === 'number' ? 'number' : 'text',
            value: rawValue ?? '',
            'data-key': col.accessor || col.key,
            className: 'cell-input'
          });
          if (col.type === 'number') input.step = 'any';
          td.innerHTML = '';
          td.append(input);
          input.focus();
          input.select();

          const commit = () => {
            const parsed = parseInput(input.value, col.type);
            if (parsed !== rawValue) {
              const updates = { [col.accessor || col.key]: parsed };
              onUpdate?.(row, updates);
            } else {
              td.textContent = value;
            }
          };

          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { e.preventDefault(); td.textContent = value; }
          });
          input.addEventListener('blur', commit, { once: true });
        });
      }
      tr.append(td);
    }

    const actions = el('td', { className: 'actions' });
    const delBtn = el('button', { className: 'danger', textContent: '×' });
    delBtn.addEventListener('click', () => onDelete?.(row));
    actions.append(delBtn);
    tr.append(actions);

    tbody.append(tr);
  }

  if (displayRows.length === 0) {
    const tr = el('tr');
    const td = el('td', { colspan: columns.length + 1, className: 'empty', textContent: 'No rows.' });
    tr.append(td);
    tbody.append(tr);
  }

  table.append(tbody);
  container.append(table);

  if (onAdd) {
    const addBtn = el('button', { className: 'add-row', textContent: '+ Add row' });
    addBtn.addEventListener('click', onAdd);
    container.append(addBtn);
  }
}

export function clearHighlight(container) {
  for (const row of container.querySelectorAll('.highlight')) {
    row.classList.remove('highlight');
  }
}

export function highlightRow(container, id) {
  clearHighlight(container);
  const row = container.querySelector(`[data-row-id="${CSS.escape(id)}"]`);
  if (row) {
    row.classList.add('highlight');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return row;
  }
  return null;
}

export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
