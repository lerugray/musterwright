import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { importGotA } from '../src/adapters/gota.js';
import { validateProject, hasErrors } from '../src/validate.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(here, '../test/fixtures');

const project = importGotA({
  oob: JSON.parse(readFileSync(resolve(fixtures, 'oob.json'), 'utf8')),
  assets: JSON.parse(readFileSync(resolve(fixtures, 'duplicate-assets.json'), 'utf8')),
  sp_pools: JSON.parse(readFileSync(resolve(fixtures, 'sp_pools.json'), 'utf8'))
});

const findings = validateProject(project);
const duplicateFinding = findings.find((f) => f.kind === 'duplicate-id');

console.log(`${duplicateFinding ? 'PASS' : 'FAIL'}  validator flags duplicate id in synthetic assets fixture`);
console.log(`${hasErrors(findings) ? 'PASS' : 'FAIL'}  validator reports errors for duplicate id`);

process.exit(duplicateFinding && hasErrors(findings) ? 0 : 1);
