import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const PATHS = {
  gotaSource: resolve(REPO, 'local/gota/source'),
  gotaOob: resolve(REPO, 'local/gota/source/oob.json'),
  gotaAssets: resolve(REPO, 'local/gota/source/assets.json'),
  gotaPools: resolve(REPO, 'local/gota/source/sp_pools.json')
};

export function skipIfMissing(...paths) {
  const missing = paths.filter((p) => !existsSync(p));
  if (missing.length) {
    const rel = missing.map((p) => (p.startsWith(REPO) ? p.slice(REPO.length + 1) : p));
    console.log(`SKIP local game data not present (${rel.join(', ')})`);
    process.exit(0);
  }
}
