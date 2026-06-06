/**
 * Realms V2 — proxy to v2.realms.today public API (explore / launchpad data).
 * @see https://docs.realms.today/realms-v2/v2-interface
 * @see https://v2.realms.today/explore
 */

const REALMS_V2_BASE =
  process.env.REALMS_V2_API_URL?.trim() || "https://v2.realms.today/api/v1";

const CACHE_TTL_MS = Number(process.env.REALMS_DAO_CACHE_TTL_MS ?? 30 * 60 * 1000);
const REALMS_METADATA_JSON_URL =
  process.env.REALMS_METADATA_JSON_URL?.trim() ||
  "https://v2.realms.today/realms/mainnet-beta.json";
const REALMS_ASSET_BASE =
  process.env.REALMS_ASSET_BASE_URL?.trim() || "https://v2.realms.today";

/** MycoDAO realm — not in Realms mainnet-beta.json; logo served from MYCODAO public/. */
const MYCO_DAO_REALM_PK = "At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";

const LOCAL_REALM_METADATA: RealmsMetadataRow[] = [
  {
    realmId: MYCO_DAO_REALM_PK,
    displayName: "MycoDAO",
    symbol: "MYCO",
    ogImage: "/org-logos/mycodao.png",
    shortDescription: "Mycosoft organization governance on Solana via Realms.",
    sortRank: 0,
  },
];

export type RealmsDaoSummary = {
  id: number;
  publicKey: string;
  name: string;
  displayName?: string;
  symbol?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  keywords?: string;
  sortRank?: number;
  mint: string;
  program: string;
  plugin: string | null;
  authority: string;
  council: string | null;
  exploreUrl: string;
  treasuryUrl: string;
};

export type RealmsDaoDetail = RealmsDaoSummary & {
  owner?: string;
  account?: {
    name?: string;
    communityMint?: string;
    councilMint?: string;
    authority?: string;
    votingProposalCount?: number;
  };
};

export type RealmsTreasuryHolding = {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
};

export type RealmsTreasuryWallet = {
  governance: string;
  nativeTreasury: string;
  solBalance: number;
  splTokens: RealmsTreasuryHolding[];
};

export type RealmsDaoMemberRole = "council" | "community" | "unknown";

export type RealmsDaoMember = {
  pubkey: string;
  role: RealmsDaoMemberRole;
  governingTokenMint: string;
  governingTokenOwner: string;
  governanceDelegate: string | null;
  governingTokenDepositAmount: string;
  unrelinquishedVotesCount: number;
  outstandingProposalCount: number;
  solscanOwnerUrl: string;
};

export type RealmsProposalRow = {
  pubkey: string;
  name: string;
  state: number;
  stateLabel: string;
  governance: string;
  governingTokenMint: string;
  yesVoteWeight: string;
  denyVoteWeight: string;
  votingAt?: string;
  closedAt?: string;
  realmsUrl: string;
};

type RawDaoListItem = {
  id?: number;
  publicKey?: string;
  name?: string;
  mint?: string;
  program?: string;
  plugin?: string | null;
  authority?: string;
  council?: string | null;
};

let cachedDaoList: RealmsDaoSummary[] | null = null;
let cachedDaoListAt = 0;

type RealmsMetadataRow = {
  symbol?: string;
  displayName?: string;
  programId?: string;
  realmId?: string;
  bannerImage?: string;
  ogImage?: string;
  website?: string;
  keywords?: string;
  twitter?: string;
  discord?: string;
  shortDescription?: string;
  sortRank?: number;
};

let cachedMetadataByRealm: Map<string, RealmsMetadataRow> | null = null;
let cachedMetadataAt = 0;

function resolveRealmsAssetUrl(url: string | undefined): string | undefined {
  const raw = url?.trim();
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/org-logos/")) return raw;
  if (raw.startsWith("/")) return `${REALMS_ASSET_BASE}${raw}`;
  return `${REALMS_ASSET_BASE}/${raw}`;
}

async function loadRealmsMetadataMap(): Promise<Map<string, RealmsMetadataRow>> {
  const now = Date.now();
  if (cachedMetadataByRealm && now - cachedMetadataAt < CACHE_TTL_MS) {
    return cachedMetadataByRealm;
  }

  try {
    const res = await fetch(REALMS_METADATA_JSON_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return cachedMetadataByRealm ?? new Map();

    const rows = (await res.json()) as RealmsMetadataRow[];
    const map = new Map<string, RealmsMetadataRow>();
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const realmId = row.realmId?.trim();
        if (realmId) map.set(realmId, row);
      }
    }
    for (const row of LOCAL_REALM_METADATA) {
      const realmId = row.realmId?.trim();
      if (realmId) map.set(realmId, { ...map.get(realmId), ...row });
    }
    cachedMetadataByRealm = map;
    cachedMetadataAt = now;
    return map;
  } catch (e) {
    console.error("realms metadata fetch:", e);
    return cachedMetadataByRealm ?? new Map();
  }
}

function applyMetadata(
  summary: RealmsDaoSummary,
  meta: RealmsMetadataRow | undefined
): RealmsDaoSummary {
  if (!meta) return summary;

  const displayName = meta.displayName?.trim();
  const logoUrl = resolveRealmsAssetUrl(meta.ogImage);
  const bannerUrl = resolveRealmsAssetUrl(meta.bannerImage);

  return {
    ...summary,
    name: displayName || summary.name,
    displayName: displayName || summary.name,
    symbol: meta.symbol?.trim() || summary.symbol,
    description: meta.shortDescription?.trim() || summary.description,
    logoUrl: logoUrl || summary.logoUrl,
    bannerUrl: bannerUrl || summary.bannerUrl,
    website: meta.website?.trim() || summary.website,
    twitter: meta.twitter?.trim() || summary.twitter,
    discord: meta.discord?.trim() || summary.discord,
    keywords: meta.keywords?.trim() || summary.keywords,
    sortRank: meta.sortRank ?? summary.sortRank,
  };
}

function realmsDaoUrls(publicKey: string) {
  const base = `https://v2.realms.today/dao/${publicKey}`;
  return { exploreUrl: base, treasuryUrl: `${base}/treasury` };
}

function mapDaoSummary(raw: RawDaoListItem): RealmsDaoSummary | null {
  const publicKey = raw.publicKey?.trim();
  const name = raw.name?.trim();
  if (!publicKey || !name) return null;
  const urls = realmsDaoUrls(publicKey);
  return {
    id: raw.id ?? 0,
    publicKey,
    name,
    mint: raw.mint ?? "",
    program: raw.program ?? "",
    plugin: raw.plugin ?? null,
    authority: raw.authority ?? "",
    council: raw.council ?? null,
    ...urls,
  };
}

async function fetchJson<T>(path: string, timeoutMs = 20_000): Promise<T | null> {
  try {
    const res = await fetch(`${REALMS_V2_BASE}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (e) {
    console.error("realms fetch:", path, e);
    return null;
  }
}

export async function loadAllRealmsDaos(): Promise<RealmsDaoSummary[]> {
  const now = Date.now();
  if (cachedDaoList && now - cachedDaoListAt < CACHE_TTL_MS) {
    return cachedDaoList;
  }

  const [raw, metadataMap] = await Promise.all([
    fetchJson<RawDaoListItem[]>("/daos", 60_000),
    loadRealmsMetadataMap(),
  ]);
  if (!raw || !Array.isArray(raw)) return cachedDaoList ?? [];

  const mapped = raw
    .map(mapDaoSummary)
    .filter((d): d is RealmsDaoSummary => d !== null)
    .map((d) => applyMetadata(d, metadataMap.get(d.publicKey)))
    .sort(compareDaoSummaries);

  cachedDaoList = mapped;
  cachedDaoListAt = now;
  return mapped;
}

function compareDaoSummaries(a: RealmsDaoSummary, b: RealmsDaoSummary): number {
  const aFeatured = a.logoUrl ? 1 : 0;
  const bFeatured = b.logoUrl ? 1 : 0;
  if (aFeatured !== bFeatured) return bFeatured - aFeatured;

  const aRank = a.sortRank ?? Number.MAX_SAFE_INTEGER;
  const bRank = b.sortRank ?? Number.MAX_SAFE_INTEGER;
  if (aRank !== bRank) return aRank - bRank;

  return a.name.localeCompare(b.name);
}

export async function searchRealmsDaos(options: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ daos: RealmsDaoSummary[]; total: number }> {
  const q = (options.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(options.limit ?? 40, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);

  const all = await loadAllRealmsDaos();
  const filtered = q
    ? all.filter((d) => {
        const haystack = [
          d.name,
          d.displayName,
          d.symbol,
          d.description,
          d.keywords,
          d.publicKey,
          d.mint,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
    : all;

  const sorted = q ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : filtered;

  return {
    total: sorted.length,
    daos: sorted.slice(offset, offset + limit),
  };
}

export async function fetchRealmsDaoDetail(publicKey: string): Promise<RealmsDaoDetail | null> {
  const pk = publicKey.trim();
  if (!pk) return null;

  const raw = await fetchJson<{
    pubkey?: string;
    owner?: string;
    account?: RealmsDaoDetail["account"];
  }>(`/daos/${pk}`);

  if (!raw?.pubkey) {
    const fromList = (await loadAllRealmsDaos()).find((d) => d.publicKey === pk);
    if (fromList) return fromList;
    const metadataMap = await loadRealmsMetadataMap();
    const urls = realmsDaoUrls(pk);
    const stub = mapDaoSummary({ publicKey: pk, name: metadataMap.get(pk)?.displayName ?? pk.slice(0, 8) });
    if (!stub) return null;
    return applyMetadata(stub, metadataMap.get(pk));
  }

  const metadataMap = await loadRealmsMetadataMap();
  const urls = realmsDaoUrls(pk);
  const base: RealmsDaoDetail = {
    id: 0,
    publicKey: pk,
    name: raw.account?.name ?? pk.slice(0, 8),
    mint: raw.account?.communityMint ?? "",
    program: raw.owner ?? "",
    plugin: null,
    authority: raw.account?.authority ?? "",
    council: raw.account?.councilMint ?? null,
    owner: raw.owner,
    account: raw.account,
    ...urls,
  };
  return applyMetadata(base, metadataMap.get(pk));
}

const PROPOSAL_STATE_LABELS: Record<number, string> = {
  0: "DRAFT",
  1: "SIGNING_OFF",
  2: "VOTING",
  3: "SUCCEEDED",
  4: "EXECUTING",
  5: "COMPLETED",
  6: "CANCELLED",
  7: "DEFEATED",
  8: "EXECUTING_WITH_ERRORS",
  9: "VETOED",
};

export async function fetchRealmsDaoProposals(publicKey: string): Promise<RealmsProposalRow[]> {
  const pk = publicKey.trim();
  if (!pk) return [];

  const raw = await fetchJson<
    Array<{
      pubkey?: string;
      account?: {
        name?: string;
        state?: number;
        governance?: string;
        governingTokenMint?: string;
        denyVoteWeight?: string;
        votingAt?: string;
        closedAt?: string;
        options?: Array<{ label?: string; voteWeight?: string }>;
      };
    }>
  >(`/daos/${pk}/proposals`);

  if (!raw || !Array.isArray(raw)) return [];

  return raw.map((p) => {
    const account = p.account ?? {};
    const state = account.state ?? 0;
    const yes =
      account.options?.find((o) => o.label?.toLowerCase().includes("approve"))?.voteWeight ??
      account.options?.[0]?.voteWeight ??
      "0";

    return {
      pubkey: p.pubkey ?? "",
      name: account.name ?? "Proposal",
      state,
      stateLabel: PROPOSAL_STATE_LABELS[state] ?? `STATE_${state}`,
      governance: account.governance ?? "",
      governingTokenMint: account.governingTokenMint ?? "",
      yesVoteWeight: yes,
      denyVoteWeight: account.denyVoteWeight ?? "0",
      votingAt: account.votingAt,
      closedAt: account.closedAt,
      realmsUrl: `https://v2.realms.today/dao/${pk}/proposal/${p.pubkey ?? ""}`,
    };
  });
}

export async function fetchRealmsDaoTreasury(publicKey: string): Promise<RealmsTreasuryWallet[]> {
  const pk = publicKey.trim();
  if (!pk) return [];

  const raw = await fetchJson<
    Array<{
      governance?: string;
      nativeTreasury?: string;
      solBalance?: number;
    }>
  >(`/daos/${pk}/treasury`, 30_000);

  if (!raw || !Array.isArray(raw)) return [];

  const { fetchOwnerSplBalances } = await import("./solana-rpc");

  const wallets = await Promise.all(
    raw.map(async (row) => {
      const nativeTreasury = row.nativeTreasury?.trim() ?? "";
      const splTokens = nativeTreasury
        ? (await fetchOwnerSplBalances(nativeTreasury)).map((t) => ({
            mint: t.mint,
            amount: t.amount,
            decimals: t.decimals,
            uiAmount: t.uiAmount,
          }))
        : [];

      return {
        governance: row.governance?.trim() ?? "",
        nativeTreasury,
        solBalance: Number(row.solBalance ?? 0),
        splTokens,
      };
    })
  );

  return wallets.sort((a, b) => b.solBalance - a.solBalance);
}

function classifyMemberRole(
  governingTokenMint: string,
  communityMint?: string | null,
  councilMint?: string | null
): RealmsDaoMemberRole {
  const mint = governingTokenMint.trim();
  if (!mint) return "unknown";
  if (councilMint?.trim() === mint) return "council";
  if (communityMint?.trim() === mint) return "community";
  return "unknown";
}

export async function fetchRealmsDaoMembers(publicKey: string): Promise<RealmsDaoMember[]> {
  const pk = publicKey.trim();
  if (!pk) return [];

  const [raw, detail] = await Promise.all([
    fetchJson<
      Array<{
        pubkey?: string;
        account?: {
          governingTokenMint?: string;
          governingTokenOwner?: string;
          governanceDelegate?: string | null;
          governingTokenDepositAmount?: string;
          unrelinquishedVotesCount?: number;
          outstandingProposalCount?: number;
        };
      }>
    >(`/daos/${pk}/members`, 30_000),
    fetchRealmsDaoDetail(pk),
  ]);

  if (!raw || !Array.isArray(raw)) return [];

  const communityMint = detail?.account?.communityMint ?? detail?.mint;
  const councilMint = detail?.account?.councilMint ?? detail?.council;

  return raw
    .map((row) => {
      const account = row.account ?? {};
      const owner = account.governingTokenOwner?.trim() ?? "";
      const deposit = account.governingTokenDepositAmount ?? "0";
      const depositNum = Number(deposit);
      if (!owner || !Number.isFinite(depositNum) || depositNum <= 0) return null;

      return {
        pubkey: row.pubkey?.trim() ?? "",
        role: classifyMemberRole(
          account.governingTokenMint ?? "",
          communityMint,
          councilMint
        ),
        governingTokenMint: account.governingTokenMint?.trim() ?? "",
        governingTokenOwner: owner,
        governanceDelegate: account.governanceDelegate ?? null,
        governingTokenDepositAmount: deposit,
        unrelinquishedVotesCount: account.unrelinquishedVotesCount ?? 0,
        outstandingProposalCount: account.outstandingProposalCount ?? 0,
        solscanOwnerUrl: `https://solscan.io/account/${owner}`,
      } satisfies RealmsDaoMember;
    })
    .filter((m): m is RealmsDaoMember => m !== null)
    .sort((a, b) => {
      const roleOrder = { council: 0, community: 1, unknown: 2 };
      const rd = roleOrder[a.role] - roleOrder[b.role];
      if (rd !== 0) return rd;
      return (
        Number(b.governingTokenDepositAmount) - Number(a.governingTokenDepositAmount)
      );
    });
}

export type RealmsWalletParticipation = {
  wallet: string;
  memberships: RealmsDaoMember[];
  councilDepositTotal: string;
  communityDepositTotal: string;
  openVotingProposals: RealmsProposalRow[];
};

export async function fetchWalletDaoParticipation(
  realmPublicKey: string,
  wallet: string
): Promise<RealmsWalletParticipation | null> {
  const pk = realmPublicKey.trim();
  const owner = wallet.trim();
  if (!pk || !owner) return null;

  const [members, proposals] = await Promise.all([
    fetchRealmsDaoMembers(pk),
    fetchRealmsDaoProposals(pk),
  ]);

  const memberships = members.filter((m) => m.governingTokenOwner === owner);
  const sumDeposits = (role: RealmsDaoMemberRole) =>
    memberships
      .filter((m) => m.role === role)
      .reduce((acc, m) => acc + BigInt(m.governingTokenDepositAmount || "0"), 0n)
      .toString();

  const openVotingProposals = proposals.filter((p) => p.stateLabel === "VOTING");

  return {
    wallet: owner,
    memberships,
    councilDepositTotal: sumDeposits("council"),
    communityDepositTotal: sumDeposits("community"),
    openVotingProposals,
  };
}

export const REALMS_V2_EXPLORE_URL = "https://v2.realms.today/explore";
export const REALMS_V2_LAUNCHPAD_URL = "https://v2.realms.today/launchpad";
export const MYCO_REALM_PUBLIC_KEY = "At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";
