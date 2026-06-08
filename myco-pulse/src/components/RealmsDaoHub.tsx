import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Coins,
  ExternalLink,
  Landmark,
  Link2,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "../lib/utils";
import { DaoWalletConnect, DaoWalletStatusChip } from "./DaoWalletConnect";
import { useDaoWallet } from "../hooks/useDaoWallet";
import {
  fetchRealmsDaoDetail,
  fetchRealmsDaos,
  fetchRealmsWalletParticipation,
  probeRealmsApi,
  type PulseRealmsDao,
  type PulseRealmsMember,
  type PulseRealmsProposal,
  type PulseRealmsTreasuryWallet,
  type PulseRealmsWalletParticipation,
} from "../lib/pulseApi";
import {
  isRealmDaoSaved,
  loadSavedRealmsDaos,
  removeSavedRealmDao,
  saveRealmDao,
  type SavedRealmDao,
} from "../lib/realmsSavedDaos";
import { useMediaQuery } from "../hooks/useMediaQuery";

const MYCO_REALM_PK = "At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";
const REALMS_EXPLORE = "https://v2.realms.today/explore";
const REALMS_LAUNCHPAD = "https://v2.realms.today/launchpad";
const REALMS_INTEGRATE_DOCS = "https://docs.realms.today/developer-resources/integrate-realms";

type HubTab = "EXPLORE" | "SAVED" | "DAO" | "LAUNCHPAD";

function truncatePk(pk: string, head = 6, tail = 4) {
  if (pk.length <= head + tail + 2) return pk;
  return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}

function proposalBadgeClass(stateLabel: string) {
  if (stateLabel === "VOTING") return "bg-myco-accent text-black";
  if (stateLabel === "SUCCEEDED" || stateLabel === "COMPLETED") return "bg-white/10 text-white";
  if (stateLabel === "DEFEATED" || stateLabel === "CANCELLED") return "bg-red-500/20 text-red-300";
  return "bg-white/5 text-dim";
}

export function RealmsDaoHub() {
  const daoWallet = useDaoWallet();
  const isOrgMobile = useMediaQuery("(max-width: 767px)");

  const [tab, setTab] = useState<HubTab>("EXPLORE");
  const [search, setSearch] = useState("");
  const [daos, setDaos] = useState<PulseRealmsDao[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [saved, setSaved] = useState<SavedRealmDao[]>([]);
  const [selectedPk, setSelectedPk] = useState(MYCO_REALM_PK);
  const [activeDao, setActiveDao] = useState<PulseRealmsDao | null>(null);
  const [proposals, setProposals] = useState<PulseRealmsProposal[]>([]);
  const [treasury, setTreasury] = useState<PulseRealmsTreasuryWallet[]>([]);
  const [members, setMembers] = useState<PulseRealmsMember[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [walletParticipation, setWalletParticipation] =
    useState<PulseRealmsWalletParticipation | null>(null);
  const [participationLoading, setParticipationLoading] = useState(false);
  const [participationError, setParticipationError] = useState<string | null>(null);
  const [realmsApiOk, setRealmsApiOk] = useState<boolean | null>(null);

  const refreshList = useCallback(async (query: string) => {
    setListLoading(true);
    const res = await fetchRealmsDaos({ q: query || undefined, limit: 72, offset: 0 });
    setDaos(res.daos);
    setTotal(res.total);
    setListLoading(false);
  }, []);

  const loadDetail = useCallback(async (pk: string) => {
    setDetailLoading(true);
    const { dao, proposals: props, treasury: wallets, members: participants } =
      await fetchRealmsDaoDetail(pk);
    setActiveDao(dao);
    setProposals(props);
    setTreasury(wallets);
    setMembers(participants);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    setSaved(loadSavedRealmsDaos());
    if (!loadSavedRealmsDaos().some((d) => d.publicKey === MYCO_REALM_PK)) {
      saveRealmDao({
        publicKey: MYCO_REALM_PK,
        name: "MycoDAO",
        symbol: "MYCO",
        logoUrl: "/org-logos/mycodao.png",
      });
      setSaved(loadSavedRealmsDaos());
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refreshList(search), 300);
    return () => clearTimeout(t);
  }, [search, refreshList]);

  useEffect(() => {
    if (tab === "DAO" && selectedPk) loadDetail(selectedPk);
  }, [tab, selectedPk, loadDetail]);

  useEffect(() => {
    if (isOrgMobile && tab !== "DAO") setTab("DAO");
  }, [isOrgMobile, tab]);

  const refreshParticipation = useCallback(async () => {
    if (!daoWallet.solanaAddress || !selectedPk) {
      setWalletParticipation(null);
      setParticipationError(null);
      return;
    }
    setParticipationLoading(true);
    setParticipationError(null);
    try {
      const p = await fetchRealmsWalletParticipation(selectedPk, daoWallet.solanaAddress);
      setWalletParticipation(p);
      if (!p) setParticipationError("Wallet participation unavailable — Realms API may be offline.");
    } catch (e) {
      setWalletParticipation(null);
      setParticipationError(e instanceof Error ? e.message : "Failed to load wallet participation");
    } finally {
      setParticipationLoading(false);
    }
  }, [daoWallet.solanaAddress, selectedPk]);

  useEffect(() => {
    let cancelled = false;
    probeRealmsApi().then((r) => {
      if (!cancelled) setRealmsApiOk(r.ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshParticipation();
  }, [refreshParticipation, daoWallet.isConnected]);

  useEffect(() => {
    if (tab !== "DAO" || !selectedPk) return;
    const id = window.setInterval(() => {
      void loadDetail(selectedPk);
      void refreshParticipation();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [tab, selectedPk, loadDetail, refreshParticipation]);

  const openDao = (dao: PulseRealmsDao) => {
    setSelectedPk(dao.publicKey);
    setTab("DAO");
  };

  const toggleSave = (dao: PulseRealmsDao) => {
    if (isRealmDaoSaved(dao.publicKey)) {
      setSaved(removeSavedRealmDao(dao.publicKey));
    } else {
      setSaved(
        saveRealmDao({
          publicKey: dao.publicKey,
          name: dao.displayName ?? dao.name,
          logoUrl: dao.logoUrl,
          symbol: dao.symbol,
        })
      );
    }
  };

  const savedDaosResolved = useMemo(() => {
    const keys = new Set(saved.map((s) => s.publicKey));
    const fromExplore = daos.filter((d) => keys.has(d.publicKey));
    const missing = saved.filter((s) => !fromExplore.some((d) => d.publicKey === s.publicKey));
    return [
      ...fromExplore,
      ...missing.map((s) => ({
        id: 0,
        publicKey: s.publicKey,
        name: s.name,
        displayName: s.name,
        symbol: s.symbol,
        logoUrl: s.logoUrl,
        mint: "",
        program: "",
        plugin: null,
        authority: "",
        council: null,
        exploreUrl: `https://v2.realms.today/dao/${s.publicKey}`,
        treasuryUrl: `https://v2.realms.today/dao/${s.publicKey}/treasury`,
      })),
    ];
  }, [saved, daos]);

  const votingProposals = proposals.filter((p) => p.stateLabel === "VOTING");

  return (
    <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col min-h-0">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-4 shrink-0">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase mb-1">
            Organizations
          </h2>
          <p className="text-[10px] md:text-xs text-dim uppercase tracking-widest font-bold font-mono text-myco-accent">
            Solana governance ·{" "}
            <a href={REALMS_EXPLORE} target="_blank" rel="noreferrer" className="underline hover:text-white">
              Realms explore
            </a>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <DaoWalletConnect />
          <button
            type="button"
            onClick={() => {
              void refreshList(search);
              if (tab === "DAO" && selectedPk) void loadDetail(selectedPk);
              void refreshParticipation();
              probeRealmsApi().then((r) => setRealmsApiOk(r.ok));
            }}
            disabled={listLoading || detailLoading || participationLoading}
            className="px-3 py-2 min-h-[44px] border border-white/15 text-[9px] font-black uppercase tracking-widest text-dim hover:text-white flex items-center justify-center gap-1.5"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                (listLoading || detailLoading || participationLoading) && "animate-spin"
              )}
            />
            Refresh live
          </button>
        </div>
      </div>

      {realmsApiOk === false ? (
        <p
          role="alert"
          className="mb-4 shrink-0 text-[9px] uppercase tracking-widest border border-amber-500/40 bg-amber-500/10 text-amber-100 p-3"
        >
          Realms API is not reachable on this host (deploy latest MYCODAO to pulse.mycodao.com).
          Wallet and treasury data will not load until /api/realms/* is live.
        </p>
      ) : null}

      <DaoSessionBar
        className="hidden md:block"
        wallet={daoWallet}
        participation={walletParticipation}
        participationLoading={participationLoading}
        participationError={participationError}
        activeDao={activeDao}
      />

      <div className="hidden md:flex flex-nowrap gap-1 mb-4 shrink-0 overflow-x-auto no-scrollbar pb-1">
        {(
          [
            { id: "EXPLORE" as const, label: "Directory", icon: <Search className="size-3" /> },
            { id: "SAVED" as const, label: "Saved", icon: <Bookmark className="size-3" /> },
            { id: "DAO" as const, label: "Active", icon: <Landmark className="size-3" /> },
            { id: "LAUNCHPAD" as const, label: "Create", icon: <PlusCircle className="size-3" /> },
          ] as const
        ).map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-none min-w-[7.5rem] sm:min-w-[8.5rem] px-3 py-2.5 min-h-[44px] text-[9px] font-black uppercase tracking-widest border flex items-center justify-center gap-1.5 transition-all touch-manipulation shrink-0",
              tab === id
                ? "bg-white/10 border-white/30 text-white"
                : "bg-black border-white/5 text-dim hover:bg-white/5"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {tab === "EXPLORE" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-dim" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizations by name, symbol, or address…"
                className="w-full pl-10 pr-4 py-3 min-h-[44px] text-base bg-black border border-white/10 text-white placeholder:text-dim focus:border-myco-accent outline-none"
              />
            </div>
            <p className="text-[9px] text-dim uppercase tracking-widest">
              {listLoading ? "Loading…" : `${total.toLocaleString()} organizations on Realms`}
            </p>
            {listLoading ? (
              <div className="glass-bento p-12 flex justify-center">
                <RefreshCw className="size-6 text-myco-accent animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {daos.map((dao) => (
                  <DaoCard
                    key={dao.publicKey}
                    dao={dao}
                    saved={isRealmDaoSaved(dao.publicKey)}
                    onOpen={() => openDao(dao)}
                    onToggleSave={() => toggleSave(dao)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "SAVED" && (
          <div className="space-y-4">
            {!daoWallet.isConnected ? (
              <p className="text-[10px] text-amber-200/90 border border-amber-500/30 bg-amber-500/5 p-4">
                Connect via Phantom Connect (Google, Apple, Phantom, or injected wallets) to deposit
                governance tokens and vote on Realms.
              </p>
            ) : null}
            {savedDaosResolved.length === 0 ? (
              <p className="text-[10px] text-dim uppercase text-center py-12">No saved DAOs yet</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {savedDaosResolved.map((dao) => (
                  <DaoCard
                    key={dao.publicKey}
                    dao={dao}
                    saved
                    onOpen={() => openDao(dao)}
                    onToggleSave={() => toggleSave(dao)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "DAO" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              {detailLoading ? (
                <div className="glass-bento p-12 flex justify-center">
                  <RefreshCw className="size-6 text-myco-accent animate-spin" />
                </div>
              ) : activeDao ? (
                <>
                  <div className="glass-bento overflow-hidden border-l-2 border-myco-accent">
                    {activeDao.bannerUrl ? (
                      <div className="h-24 md:h-32 w-full overflow-hidden border-b border-white/10">
                        <img
                          src={activeDao.bannerUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-4">
                      <div className="flex gap-4 items-start min-w-0">
                        <div className="size-14 md:size-16 shrink-0 aspect-square border border-white/10 overflow-hidden bg-black">
                          <DaoLogo
                            name={activeDao.displayName ?? activeDao.name}
                            symbol={activeDao.symbol}
                            logoUrl={activeDao.logoUrl}
                          />
                        </div>
                        <div className="min-w-0">
                        <h3 className="text-xl md:text-2xl font-bold truncate">
                          {activeDao.displayName ?? activeDao.name}
                        </h3>
                        {activeDao.symbol ? (
                          <p className="text-[10px] font-mono text-myco-accent mt-0.5">{activeDao.symbol}</p>
                        ) : null}
                        <p className="text-[10px] font-mono text-dim mt-1 break-all">{activeDao.publicKey}</p>
                        {activeDao.description ? (
                          <p className="text-[11px] text-white/70 mt-2 leading-relaxed">{activeDao.description}</p>
                        ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={activeDao.exploreUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 min-h-[44px] border border-myco-accent/40 text-myco-accent text-[9px] font-black uppercase flex items-center gap-1 hover:bg-myco-accent hover:text-black"
                        >
                          Open in Realms <ExternalLink className="size-3" />
                        </a>
                        <a
                          href={activeDao.treasuryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 min-h-[44px] border border-white/10 text-[9px] font-black uppercase flex items-center gap-1 hover:bg-white/5"
                        >
                          Treasury
                        </a>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[9px] uppercase tracking-widest text-dim">
                      <span>
                        Proposals: {proposals.length}
                        {votingProposals.length ? ` · ${votingProposals.length} voting` : ""}
                      </span>
                      {activeDao.account?.communityMint ? (
                        <span>Community mint: {truncatePk(activeDao.account.communityMint)}</span>
                      ) : null}
                      {activeDao.keywords ? <span>{activeDao.keywords}</span> : null}
                    </div>
                    </div>
                  </div>

                  {proposals.length === 0 ? (
                    <div className="glass-bento p-8 text-center text-[10px] text-dim uppercase">
                      No proposals for this DAO
                    </div>
                  ) : (
                    proposals.slice(0, 25).map((p) => (
                      <div key={p.pubkey} className="glass-bento p-6 md:p-8 hover:bg-white/[0.02]">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span
                            className={cn(
                              "px-2 py-1 text-[9px] font-bold uppercase rounded-sm",
                              proposalBadgeClass(p.stateLabel)
                            )}
                          >
                            {p.stateLabel}
                          </span>
                          <span className="text-[9px] font-mono text-dim">#{truncatePk(p.pubkey)}</span>
                        </div>
                        <h4 className="text-lg font-bold mb-4 leading-snug">{p.name}</h4>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                          <div className="space-y-1">
                            <p className="text-[9px] text-dim uppercase">
                              Yes weight: {p.yesVoteWeight} · No: {p.denyVoteWeight}
                            </p>
                            <DaoWalletStatusChip />
                          </div>
                          <a
                            href={p.realmsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 min-h-[44px] w-full sm:w-auto text-center bg-myco-accent/10 border border-myco-accent/30 text-myco-accent text-[9px] font-black uppercase hover:bg-myco-accent hover:text-black"
                          >
                            {daoWallet.isConnected ? "Vote on Realms" : "Connect wallet to vote"}
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <p className="text-[10px] text-dim uppercase text-center py-12">Select a DAO from Explore</p>
              )}
            </div>

            <div className="lg:col-span-4 space-y-4">
              <DaoWalletParticipationCard
                wallet={daoWallet}
                participation={walletParticipation}
                loading={participationLoading}
                activeDao={activeDao}
              />
              <DaoTreasuryCard
                dao={activeDao}
                treasury={treasury}
                loading={detailLoading}
              />
              <DaoParticipantsCard members={members} loading={detailLoading} />
            </div>
          </div>
        )}

        {tab === "LAUNCHPAD" && (
          <div className="flex flex-col h-full min-h-[480px] gap-4">
            <p className="text-[10px] text-dim uppercase tracking-widest">
              Create a new DAO on Realms V2 — Community Token, NFT Community, or Multisig (
              <a href={REALMS_LAUNCHPAD} target="_blank" rel="noreferrer" className="text-myco-accent underline">
                launchpad
              </a>
              )
            </p>
            <iframe
              title="Realms V2 Launchpad"
              src={REALMS_LAUNCHPAD}
              className="flex-1 w-full min-h-[420px] border border-white/10 bg-black"
              allow="clipboard-write"
            />
            <a
              href={REALMS_LAUNCHPAD}
              target="_blank"
              rel="noreferrer"
              className="self-center px-6 py-3 min-h-[44px] border border-myco-accent text-myco-accent text-[10px] font-black uppercase hover:bg-myco-accent hover:text-black flex items-center gap-2"
            >
              Open launchpad in new tab <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

type DaoWalletSession = ReturnType<typeof useDaoWallet>;

function DaoSessionBar({
  wallet,
  participation,
  participationLoading,
  participationError,
  activeDao,
  className,
}: {
  wallet: DaoWalletSession;
  participation: PulseRealmsWalletParticipation | null;
  participationLoading: boolean;
  participationError: string | null;
  activeDao: PulseRealmsDao | null;
  className?: string;
}) {
  const daoLabel = activeDao?.displayName ?? activeDao?.name ?? "organization";

  return (
    <div className={cn("glass-bento border border-white/10 p-3 md:p-4 mb-4 shrink-0", className)}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-myco-accent flex items-center gap-2">
            <Shield className="size-3.5 shrink-0" />
            DAO wallet session
          </p>
          <p className="text-[10px] text-dim mt-1 leading-relaxed">
            Phantom Connect + injected wallets for Realms governance on{" "}
            <span className="text-white/80">{daoLabel}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[8px] uppercase tracking-widest">
          <a
            href={REALMS_INTEGRATE_DOCS}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 min-h-[44px] border border-white/10 text-dim hover:text-myco-accent flex items-center gap-1"
          >
            <Link2 className="size-3" /> Realms SDK
          </a>
          <a
            href="https://docs.phantom.com/phantom-connect"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 min-h-[44px] border border-white/10 text-dim hover:text-myco-accent flex items-center gap-1"
          >
            <Link2 className="size-3" /> Phantom Connect
          </a>
        </div>
      </div>

      {wallet.isConnected && wallet.solanaAddress ? (
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:flex-wrap gap-3 text-[9px] uppercase tracking-widest">
          <span className="text-myco-accent font-mono">{wallet.label}</span>
          {wallet.authProvider ? (
            <span className="text-dim">via {wallet.authProvider}</span>
          ) : null}
          {participationLoading ? (
            <span className="text-dim flex items-center gap-1">
              <RefreshCw className="size-3 animate-spin" /> Loading participation…
            </span>
          ) : participationError ? (
            <span className="text-red-300 normal-case">{participationError}</span>
          ) : participation ? (
            <>
              {participation.memberships.length ? (
                <span>
                  {participation.memberships.length} deposit
                  {participation.memberships.length === 1 ? "" : "s"} on Realms
                </span>
              ) : (
                <span className="text-amber-200/90">No governance tokens deposited yet</span>
              )}
              {participation.openVotingProposals.length ? (
                <span className="text-white">
                  {participation.openVotingProposals.length} proposal
                  {participation.openVotingProposals.length === 1 ? "" : "s"} open for vote
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-dim">Participation data unavailable</span>
          )}
        </div>
      ) : (
        <p className="mt-3 pt-3 border-t border-white/10 text-[9px] text-dim uppercase">
          Connect above to deposit governance tokens, view your voting power, and participate in
          proposals without leaving Pulse.
        </p>
      )}
    </div>
  );
}

function DaoWalletParticipationCard({
  wallet,
  participation,
  loading,
  activeDao,
}: {
  wallet: DaoWalletSession;
  participation: PulseRealmsWalletParticipation | null;
  loading: boolean;
  activeDao: PulseRealmsDao | null;
}) {
  if (!wallet.isConnected) {
    return (
      <div className="glass-bento p-4 md:p-6 border border-white/10">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-dim mb-2 flex items-center gap-2">
          <Wallet className="size-4 shrink-0" /> Your participation
        </h4>
        <p className="text-[10px] text-dim uppercase leading-relaxed">
          Connect a Solana wallet to see your council/community deposits and open votes for this
          organization.
        </p>
        <div className="mt-3">
          <DaoWalletConnect />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-bento p-4 md:p-6 border border-myco-accent/25">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-myco-accent mb-3 flex items-center gap-2">
        <Wallet className="size-4 shrink-0" /> Your participation
      </h4>

      {loading ? (
        <div className="py-6 flex justify-center">
          <RefreshCw className="size-5 text-myco-accent animate-spin" />
        </div>
      ) : !participation ? (
        <p className="text-[10px] text-dim uppercase">Could not load wallet participation</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-[9px] uppercase tracking-widest text-dim">
            <span className="font-mono text-white">{truncatePk(participation.wallet, 6, 6)}</span>
            {participation.councilDepositTotal !== "0" ? (
              <span>Council: {participation.councilDepositTotal}</span>
            ) : null}
            {participation.communityDepositTotal !== "0" ? (
              <span>Community: {participation.communityDepositTotal}</span>
            ) : null}
          </div>

          {participation.memberships.length === 0 ? (
            <p className="text-[9px] text-amber-200/90 border border-amber-500/20 bg-amber-500/5 p-3">
              Deposit governance tokens on Realms to vote in {activeDao?.displayName ?? "this DAO"}.
            </p>
          ) : (
            <ul className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
              {participation.memberships.map((m) => (
                <li
                  key={m.pubkey}
                  className="border border-white/10 bg-black/30 p-2 flex justify-between gap-2 text-[9px]"
                >
                  <span className={cn("uppercase font-bold", m.role === "council" ? "text-amber-300" : "text-myco-accent")}>
                    {m.role}
                  </span>
                  <span className="font-bold tabular-nums">{m.governingTokenDepositAmount}</span>
                </li>
              ))}
            </ul>
          )}

          {participation.openVotingProposals.length > 0 ? (
            <div className="pt-2 border-t border-white/10">
              <p className="text-[8px] text-dim uppercase mb-2">Open for your vote</p>
              <ul className="space-y-2">
                {participation.openVotingProposals.slice(0, 5).map((p) => (
                  <li key={p.pubkey}>
                    <a
                      href={p.realmsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[9px] text-white hover:text-myco-accent line-clamp-2 flex items-start gap-1"
                    >
                      <ExternalLink className="size-3 shrink-0 mt-0.5" />
                      {p.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {activeDao?.exploreUrl ? (
            <a
              href={activeDao.exploreUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center px-4 py-2 min-h-[44px] border border-myco-accent/40 text-myco-accent text-[9px] font-black uppercase hover:bg-myco-accent hover:text-black"
            >
              Deposit & vote on Realms
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function formatSol(amount: number) {
  if (!Number.isFinite(amount)) return "0";
  if (amount >= 1) return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatTokenAmount(uiAmount: number | null, amount: string, decimals: number) {
  if (uiAmount !== null && Number.isFinite(uiAmount)) {
    return uiAmount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  try {
    const raw = BigInt(amount);
    const base = 10n ** BigInt(decimals);
    const whole = raw / base;
    const frac = raw % base;
    if (frac === 0n) return whole.toString();
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
    return `${whole}.${fracStr}`;
  } catch {
    return amount;
  }
}

function DaoTreasuryCard({
  dao,
  treasury,
  loading,
}: {
  dao: PulseRealmsDao | null;
  treasury: PulseRealmsTreasuryWallet[];
  loading: boolean;
}) {
  const totalSol = treasury.reduce((sum, w) => sum + (w.solBalance ?? 0), 0);
  const totalSpl = treasury.reduce((sum, w) => sum + w.splTokens.length, 0);

  return (
    <div className="glass-bento p-4 md:p-6 border border-white/10">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-myco-accent flex items-center gap-2">
          <Coins className="size-4 shrink-0" /> Treasury
        </h4>
        {dao?.treasuryUrl ? (
          <a
            href={dao.treasuryUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[8px] font-black uppercase text-dim hover:text-myco-accent flex items-center gap-1 min-h-[44px] px-2"
          >
            Realms <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <RefreshCw className="size-5 text-myco-accent animate-spin" />
        </div>
      ) : !dao ? (
        <p className="text-[10px] text-dim uppercase text-center py-6">Select an organization</p>
      ) : treasury.length === 0 ? (
        <p className="text-[10px] text-dim uppercase text-center py-6">No treasury wallets on record</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-[9px] uppercase tracking-widest text-dim mb-4 pb-3 border-b border-white/10">
            <span>{treasury.length} wallet{treasury.length === 1 ? "" : "s"}</span>
            <span>{formatSol(totalSol)} SOL total</span>
            {totalSpl ? <span>{totalSpl} SPL position{totalSpl === 1 ? "" : "s"}</span> : null}
          </div>
          <div className="space-y-3 max-h-[min(52vh,520px)] overflow-y-auto no-scrollbar pr-1">
            {treasury.map((wallet) => (
              <div
                key={`${wallet.governance}-${wallet.nativeTreasury}`}
                className="border border-white/10 bg-black/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-[9px] font-mono text-white/90">
                    Gov {truncatePk(wallet.governance)}
                  </span>
                  <span className="text-[10px] font-bold text-myco-accent tabular-nums">
                    {formatSol(wallet.solBalance)} SOL
                  </span>
                </div>
                <a
                  href={`https://solscan.io/account/${wallet.nativeTreasury}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[8px] font-mono text-dim hover:text-white break-all block mb-2"
                >
                  {wallet.nativeTreasury}
                </a>
                {wallet.splTokens.length === 0 ? (
                  <p className="text-[8px] text-dim uppercase">No SPL balances</p>
                ) : (
                  <ul className="space-y-1.5 mt-2 pt-2 border-t border-white/5">
                    {wallet.splTokens.map((token) => (
                      <li
                        key={`${wallet.nativeTreasury}-${token.mint}`}
                        className="flex items-center justify-between gap-2 text-[9px]"
                      >
                        <a
                          href={`https://solscan.io/token/${token.mint}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-dim hover:text-myco-accent truncate min-w-0"
                        >
                          {truncatePk(token.mint, 4, 4)}
                        </a>
                        <span className="font-bold text-white tabular-nums shrink-0">
                          {formatTokenAmount(token.uiAmount, token.amount, token.decimals)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DaoParticipantsCard({
  members,
  loading,
}: {
  members: PulseRealmsMember[];
  loading: boolean;
}) {
  const council = members.filter((m) => m.role === "council");
  const community = members.filter((m) => m.role === "community");
  const other = members.filter((m) => m.role === "unknown");

  return (
    <div className="glass-bento p-4 md:p-6 border border-white/10">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-dim mb-3 flex items-center gap-2">
        <Users className="size-4 shrink-0" /> Participants
      </h4>
      <p className="text-[9px] text-dim uppercase tracking-widest mb-4">
        Deposited voters on Realms — council and community token holders
      </p>

      {loading ? (
        <div className="py-8 flex justify-center">
          <RefreshCw className="size-5 text-myco-accent animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-[10px] text-dim uppercase text-center py-6">
          No deposited participants yet
        </p>
      ) : (
        <div className="space-y-4 max-h-[min(48vh,480px)] overflow-y-auto no-scrollbar pr-1">
          <ParticipantSection title="Council" rows={council} accent="text-amber-300" />
          <ParticipantSection title="Community voters" rows={community} accent="text-myco-accent" />
          {other.length ? (
            <ParticipantSection title="Other deposits" rows={other} accent="text-white/80" />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ParticipantSection({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: PulseRealmsMember[];
  accent: string;
}) {
  if (!rows.length) {
    return (
      <div>
        <p className={cn("text-[9px] font-black uppercase tracking-widest mb-2", accent)}>{title}</p>
        <p className="text-[8px] text-dim uppercase pl-1">None deposited</p>
      </div>
    );
  }

  return (
    <div>
      <p className={cn("text-[9px] font-black uppercase tracking-widest mb-2", accent)}>
        {title} · {rows.length}
      </p>
      <ul className="space-y-2">
        {rows.map((m) => (
          <li
            key={m.pubkey}
            className="border border-white/10 bg-black/30 p-2.5 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-2">
              <a
                href={m.solscanOwnerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] font-mono text-white hover:text-myco-accent truncate min-w-0 flex items-center gap-1"
              >
                <Wallet className="size-3 shrink-0 text-dim" />
                {truncatePk(m.governingTokenOwner)}
              </a>
              <span className="text-[10px] font-bold tabular-nums shrink-0">
                {m.governingTokenDepositAmount}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-[8px] text-dim uppercase">
              {m.unrelinquishedVotesCount ? (
                <span>{m.unrelinquishedVotesCount} unrelinquished</span>
              ) : null}
              {m.outstandingProposalCount ? (
                <span>{m.outstandingProposalCount} open proposals</span>
              ) : null}
              {m.governanceDelegate ? (
                <span>Delegate {truncatePk(m.governanceDelegate)}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DaoLogo({
  name,
  symbol,
  logoUrl,
}: {
  name: string;
  symbol?: string;
  logoUrl?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = (symbol?.trim() || name.trim()).slice(0, 2).toUpperCase();

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-black text-sm md:text-base font-black text-myco-accent uppercase">
      {initials}
    </div>
  );
}

function DaoCard({
  dao,
  saved,
  onOpen,
  onToggleSave,
}: {
  dao: PulseRealmsDao;
  saved: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
}) {
  const label = dao.displayName ?? dao.name;

  return (
    <div className="relative aspect-square glass-bento border border-white/5 hover:border-myco-accent/40 transition-all overflow-hidden group">
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 flex flex-col text-left"
        aria-label={`Open ${label}`}
      >
        <div className="flex-1 min-h-0 w-full overflow-hidden bg-black/40">
          <DaoLogo name={label} symbol={dao.symbol} logoUrl={dao.logoUrl} />
        </div>
        <div className="shrink-0 p-2 border-t border-white/10 bg-black/80 min-h-[52px]">
          <p className="text-[10px] font-bold text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-myco-accent transition-colors">
            {label}
          </p>
          {dao.symbol ? (
            <p className="text-[8px] font-mono text-dim mt-0.5 truncate">{dao.symbol}</p>
          ) : (
            <p className="text-[8px] font-mono text-dim/70 mt-0.5 truncate">
              {truncatePk(dao.publicKey)}
            </p>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave();
        }}
        className="absolute top-1.5 right-1.5 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/15 bg-black/70 hover:border-myco-accent/50 backdrop-blur-sm z-10"
        aria-label={saved ? "Remove saved organization" : "Save organization"}
      >
        {saved ? (
          <BookmarkCheck className="size-4 text-myco-accent" />
        ) : (
          <Bookmark className="size-4 text-dim" />
        )}
      </button>
      <a
        href={dao.exploreUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1.5 left-1.5 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/15 bg-black/70 text-dim hover:text-white backdrop-blur-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Open ${label} on Realms`}
      >
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
