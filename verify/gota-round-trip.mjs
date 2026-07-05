import { readFileSync } from 'fs';
import { importGotA, exportGotA } from '../src/adapters/gota.js';
import { validateProject, hasErrors, roundTripEqual } from '../src/validate.js';
import { skipIfMissing, PATHS } from './_local-data.mjs';

skipIfMissing(PATHS.gotaOob, PATHS.gotaAssets, PATHS.gotaPools);

const source = {
  oob: JSON.parse(readFileSync(PATHS.gotaOob, 'utf8')),
  assets: JSON.parse(readFileSync(PATHS.gotaAssets, 'utf8')),
  sp_pools: JSON.parse(readFileSync(PATHS.gotaPools, 'utf8'))
};

const project = importGotA(source);
const exported = exportGotA(project);
const findings = validateProject(project);

const results = [];
const rec = (name, ok, note = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? '  — ' + note : ''}`);
};

rec('import parses all three GotA files', project.units.length > 0 && project.assets.length > 0 && project.pools.length > 0);
rec('export is semantically equal to source', roundTripEqual(source, exported));
rec('validator flags the known duplicate id 152.0 in assets', findings.some((f) => f.kind === 'duplicate-id' && /152\.0/.test(f.id)));
rec('validator has errors because of duplicate id', hasErrors(findings));

const passed = results.filter((r) => r.ok).length;
console.log(`\n=== ${passed}/${results.length} checks passed ===`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
