import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** One SQLite WAL file per cluster, on local durable storage; no network filesystem. */
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS licenses (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS species (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tokens (taxon_id TEXT PRIMARY KEY, mint TEXT NOT NULL UNIQUE, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS funding (signature TEXT PRIMARY KEY, lamports INTEGER NOT NULL CHECK(lamports>0), body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS allocations (id TEXT PRIMARY KEY, funding_signature TEXT NOT NULL REFERENCES funding(signature), budget INTEGER NOT NULL CHECK(budget>0), reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved>=0), spent INTEGER NOT NULL DEFAULT 0 CHECK(spent>=0), body TEXT NOT NULL, CHECK(reserved+spent<=budget));
      CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, dedupe_key TEXT NOT NULL UNIQUE, allocation_id TEXT NOT NULL REFERENCES allocations(id), taxon_id TEXT NOT NULL, payload TEXT NOT NULL, max_lamports INTEGER NOT NULL CHECK(max_lamports>0), state TEXT NOT NULL, plan TEXT, error TEXT, lease_until INTEGER NOT NULL DEFAULT 0, lease_token TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS jobs_work ON jobs(state,lease_until,created_at);
      CREATE TABLE IF NOT EXISTS challenges (nonce TEXT PRIMARY KEY, user_id TEXT NOT NULL, wallet TEXT NOT NULL, message TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS wallets (wallet TEXT PRIMARY KEY, user_id TEXT NOT NULL, verified_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS discoveries (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, taxon_id TEXT NOT NULL, occurrence_key TEXT NOT NULL UNIQUE, evidence_hash TEXT NOT NULL UNIQUE, wallet TEXT NOT NULL, status TEXT NOT NULL, body TEXT NOT NULL, review TEXT, reviewed_at TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rewards (id TEXT PRIMARY KEY, discovery_id TEXT NOT NULL REFERENCES discoveries(id), user_id TEXT NOT NULL, mint TEXT NOT NULL, amount TEXT NOT NULL, kind TEXT NOT NULL, job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id), body TEXT NOT NULL, UNIQUE(discovery_id,kind));
      CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, state TEXT NOT NULL, checkpoint TEXT, error TEXT, source_endpoint TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS scan_species (scan_id TEXT NOT NULL REFERENCES scans(id), taxon_id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(scan_id,taxon_id));
      CREATE TABLE IF NOT EXISTS scan_exclusions (scan_id TEXT NOT NULL REFERENCES scans(id), taxon_id TEXT NOT NULL, reason TEXT NOT NULL, PRIMARY KEY(scan_id,taxon_id));
      CREATE TABLE IF NOT EXISTS metadata (hash TEXT PRIMARY KEY, taxon_id TEXT NOT NULL, license_id TEXT, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS holds (id TEXT PRIMARY KEY, kind TEXT NOT NULL, value TEXT NOT NULL, reason TEXT NOT NULL, evidence_uri TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, UNIQUE(kind,value));
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, actor TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
    // Additive migration for development snapshots, with no guessing about old license bindings.
    for(const [table,column,declaration] of [['jobs','lease_token',"TEXT NOT NULL DEFAULT ''"],['discoveries','reviewed_at','TEXT'],['scans','source_endpoint','TEXT'],['metadata','license_id','TEXT']]){
      if(!this.all<{name:string}>(`PRAGMA table_info(${table})`).some(row=>row.name===column))this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration}`);
    }
    this.db.exec('PRAGMA user_version=1; CREATE INDEX IF NOT EXISTS discoveries_user_date ON discoveries(user_id,status,reviewed_at); CREATE INDEX IF NOT EXISTS wallets_user ON wallets(user_id,verified_at); CREATE INDEX IF NOT EXISTS rewards_mint ON rewards(mint);');
  }
  get<T = any>(sql: string, ...params: any[]): T | undefined { return this.db.prepare(sql).get(...params) as T | undefined; }
  all<T = any>(sql: string, ...params: any[]): T[] { return this.db.prepare(sql).all(...params) as T[]; }
  run(sql: string, ...params: any[]) { return this.db.prepare(sql).run(...params); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  audit(action: string, actor: string, body: unknown) {
    this.run('INSERT INTO audit(action,actor,body,created_at) VALUES (?,?,?,?)', action, actor, JSON.stringify(body), new Date().toISOString());
  }
  close() { this.db.close(); }
}
