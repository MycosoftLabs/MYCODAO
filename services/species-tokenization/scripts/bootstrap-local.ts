/**
 * Local bootstrap: record a display/token/reward grant, sync Ancestry FungiP pages,
 * publish metadata when images exist. Does not invent taxa or fund mainnet.
 */
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../src/config.js';
import { syncAncestryFungip } from '../src/ancestry-sync.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

function upsertEnv(key: string, value: string) {
  let raw = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=`, 'm').test(raw)) raw = raw.replace(new RegExp(`^${key}=.*$`, 'm'), line);
  else raw = `${raw.trimEnd()}\n${line}\n`;
  writeFileSync(envPath, raw, 'utf8');
}

const engine = await loadEngine();
const existing = process.env.TOKENIZATION_DATA_LICENSE_ID?.trim();
let licenseId = existing && existing.length > 10 ? existing : '';
if (!licenseId) {
  licenseId = randomUUID();
  engine.grant(
    {
      id: licenseId,
      licensee: 'MycoDAO',
      licensor: 'MINDEX / Mycosoft (local bootstrap grant — replace with executed agreement evidence)',
      rights: ['display', 'token_metadata', 'reward'],
      taxonIds: null,
      validFrom: '2020-01-01T00:00:00.000Z',
      validUntil: '2099-01-01T00:00:00.000Z',
      evidenceUri: 'https://mycosoft.com/ancestry',
      status: 'active',
    },
    'bootstrap',
  );
  upsertEnv('TOKENIZATION_DATA_LICENSE_ID', licenseId);
  process.env.TOKENIZATION_DATA_LICENSE_ID = licenseId;
}

const base = (process.env.TOKENIZATION_ANCESTRY_BASE_URL || 'https://mycosoft.com').replace(/\/$/, '');
const maxPages = Number(process.env.TOKENIZATION_ANCESTRY_MAX_PAGES || '8');
const result = await syncAncestryFungip(
  engine,
  {
    baseUrl: base,
    licenseId,
    maxPages,
    pageSize: 24,
    metadataPublicBase: process.env.TOKENIZATION_METADATA_PUBLIC_BASE,
  },
  'bootstrap',
);

console.log(
  JSON.stringify(
    {
      licenseId,
      ...result,
      catalogTotal: engine.catalog(0, 1).total,
      note: 'Local bootstrap complete. Start npm start + npm run worker; set SPECIES_TOKEN_* on Next.',
    },
    null,
    2,
  ),
);
engine.store.close();
