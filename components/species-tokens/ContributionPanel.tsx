"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { type Account, type CatalogItem, type Reward, explorerUrl, label, readApi, shortAddress, tokenAmount } from "./types";
import styles from "./species-tokens.module.css";

type Phantom = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (message: Uint8Array, display?: "utf8") => Promise<{ signature: Uint8Array }>;
};

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "The request could not be completed."; }
function displayDate(raw: string | number) { const date = new Date(raw); return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }

export default function ContributionPanel({ supabaseUrl, supabaseAnonKey, selected, cluster, serviceAvailable }: { supabaseUrl: string; supabaseAnonKey: string; selected: CatalogItem | null; cluster: string; serviceAvailable: boolean }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [taxonId, setTaxonId] = useState("");
  const [source, setSource] = useState("inaturalist");
  const [sourceRecordId, setSourceRecordId] = useState("");
  const [evidenceUri, setEvidenceUri] = useState("");
  const [evidenceSha256, setEvidenceSha256] = useState("");
  const currentAccessToken = useRef<string | null>(null);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) { setAuthLoading(false); return; }
    let active = true;
    let supabase: SupabaseClient;
    try { supabase = createClient(supabaseUrl, supabaseAnonKey); } catch { setAuthError("Account sign in is not configured correctly."); setAuthLoading(false); return; }
    setClient(supabase);
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) { currentAccessToken.current = data.session?.access_token || null; setSession(data.session); setAuthLoading(false); if (error) setAuthError(error.message); }
    }).catch(() => { if (active) { setAuthError("The account session could not be loaded."); setAuthLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { currentAccessToken.current = next?.access_token || null; setSession(next); setAccount(null); setRewards(null); setAccountError(""); }
    });
    return () => { active = false; currentAccessToken.current = null; listener.subscription.unsubscribe(); };
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => { if (selected) setTaxonId(selected.taxonId); }, [selected]);

  const loadAccount = useCallback(async () => {
    if (!session?.access_token) return;
    const accessToken = session.access_token;
    setAccountLoading(true);
    setAccountError("");
    try {
      const [nextAccount, nextRewards] = await Promise.all([
        readApi<Account>("me", accessToken),
        readApi<{ items: Reward[] }>("rewards", accessToken),
      ]);
      if (currentAccessToken.current !== accessToken) return;
      if (!Array.isArray(nextAccount.wallets) || !Array.isArray(nextAccount.discoveries) || !Array.isArray(nextRewards.items)) throw new Error("Your account returned an invalid response.");
      setAccount(nextAccount);
      setRewards(nextRewards.items);
    } catch (error) { if (currentAccessToken.current === accessToken) { setAccount(null); setRewards(null); setAccountError(errorMessage(error)); } }
    finally { if (currentAccessToken.current === accessToken) setAccountLoading(false); }
  }, [session?.access_token]);

  useEffect(() => { void loadAccount(); }, [loadAccount]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy("signin"); setAuthError(""); setAuthMessage("");
    try {
      const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/species-tokens` } });
      if (error) throw error;
      setAuthMessage("Check your email for a secure sign-in link. Return here to continue your contribution.");
    } catch (error) { setAuthError(errorMessage(error)); } finally { setBusy(""); }
  }

  async function signOut() {
    if (!client) return;
    setBusy("signout"); setAuthError("");
    try { const { error } = await client.auth.signOut(); if (error) throw error; currentAccessToken.current = null; setSession(null); setAccount(null); setRewards(null); setMessage(""); setActionError(""); }
    catch (error) { setAuthError(errorMessage(error)); } finally { setBusy(""); }
  }

  async function connectWallet() {
    if (!session?.access_token) return;
    setBusy("wallet"); setActionError(""); setMessage("");
    try {
      const provider = (window as Window & { solana?: Phantom }).solana;
      if (!provider?.isPhantom || typeof provider.signMessage !== "function") throw new Error("Open this page in a browser with Phantom installed, or in Phantom’s browser, to verify your Solana wallet.");
      const connected = await provider.connect();
      const wallet = connected.publicKey.toString();
      const challenge = await readApi<{ nonce: string; message: string; expiresAt: string | number }>("wallet/challenge", session.access_token, { wallet });
      if (!challenge.nonce || !challenge.message || new Date(challenge.expiresAt).getTime() <= Date.now()) throw new Error("The wallet verification challenge has expired. Please try again.");
      const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
      const signatureBase64 = btoa(Array.from(signed.signature, (byte) => String.fromCharCode(byte)).join(""));
      await readApi("wallet/verify", session.access_token, { wallet, nonce: challenge.nonce, signatureBase64 });
      setMessage(`Wallet ${shortAddress(wallet)} verified for this account.`);
      await loadAccount();
    } catch (error) { setActionError(errorMessage(error)); } finally { setBusy(""); }
  }

  async function submitDiscovery(event: FormEvent) {
    event.preventDefault();
    if (!session?.access_token) return;
    setBusy("discovery"); setActionError(""); setMessage("");
    try {
      await readApi("discoveries", session.access_token, { taxonId: taxonId.trim(), source, sourceRecordId: sourceRecordId.trim(), evidenceUri: evidenceUri.trim(), evidenceSha256: evidenceSha256.trim().toLowerCase() });
      setMessage("Observation received for review. Track its verification and any reward below.");
      setSourceRecordId(""); setEvidenceUri(""); setEvidenceSha256("");
      await loadAccount();
    } catch (error) { setActionError(errorMessage(error)); } finally { setBusy(""); }
  }

  const available = serviceAvailable && !!account;
  const hasWallet = !!account?.wallets.length;

  return (
    <section className={styles.contribution} id="contribute" aria-labelledby="contribute-heading">
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>Share what you find</p><h2 id="contribute-heading">Your fieldwork. Shared knowledge.</h2></div>
        <p>Sign in, verify your wallet, and submit traceable evidence. Review decisions and confirmed transfers stay with your account.</p>
      </div>
      {authLoading ? <div className={styles.panel} role="status">Checking your account…</div> : !session ? (
        <div className={styles.signInGrid}>
          <div className={styles.panel}>
            <h3>Start with your MycoDAO account</h3><p className={styles.muted}>We will email you a secure sign-in link.</p>
            {!client ? <p role="status" className={styles.notice}>Account sign in is unavailable until Supabase is configured.</p> : <form onSubmit={signIn} className={styles.form}>
              <label htmlFor="contributor-email">Email address<input id="contributor-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} placeholder="you@example.com" /></label>
              <button className={styles.primary} type="submit" disabled={!!busy}>{busy === "signin" ? "Sending sign-in link…" : "Email me a sign-in link"}</button>
            </form>}
            {authMessage && <p className={styles.success} role="status">{authMessage}</p>}{authError && <p className={styles.error} role="alert">{authError}</p>}
          </div>
          <ol className={styles.steps}><li><span>01</span><div><h3>Connect your wallet</h3><p>Prove ownership with a signed message in Phantom. Wallet verification does not send a transaction.</p></div></li><li><span>02</span><div><h3>Share your observation</h3><p>Provide a source record, evidence link, and the evidence file’s SHA-256 fingerprint.</p></div></li><li><span>03</span><div><h3>Follow the review</h3><p>Qualified reviewers verify your contribution. Eligible rewards proceed only when funds and tokens are available.</p></div></li></ol>
        </div>
      ) : <>
        <div className={styles.accountBar}><p>Signed in as <strong>{session.user.email || "MycoDAO contributor"}</strong></p><div><button type="button" className={styles.textButton} disabled={!!busy || accountLoading} onClick={() => void loadAccount()}>{accountLoading ? "Refreshing…" : "Refresh account"}</button><button type="button" className={styles.textButton} onClick={() => void signOut()} disabled={!!busy}>Sign out</button></div></div>
        {authError && <p className={styles.error} role="alert">{authError}</p>}
        {accountError && <p className={styles.notice} role="alert">Account information unavailable: {accountError}</p>}
        {accountLoading && <p className={styles.muted} role="status">Loading your verified wallets and contributions…</p>}
        {!serviceAvailable && <p className={styles.notice}>The rewards service is unavailable. Wallet verification and submissions will resume when it reconnects.</p>}
        {message && <p className={styles.success} role="status">{message}</p>}{actionError && <p className={styles.error} role="alert">{actionError}</p>}
        <div className={styles.contributionGrid}>
          <div className={styles.panel}>
            <p className={styles.eyebrow}>01 / Reward destination</p><h3>Your Solana wallet</h3><p className={styles.muted}>A signed message links a wallet to your account. Review the message in Phantom before you sign.</p>
            {account && (account.wallets.length ? <ul className={styles.walletList}>{account.wallets.map((wallet) => <li key={wallet.wallet}><span className={styles.verified}>Verified</span><span title={wallet.wallet}>{shortAddress(wallet.wallet)}</span><small>{displayDate(wallet.verifiedAt)}</small></li>)}</ul> : <p className={styles.muted}>No verified wallet is linked to this account.</p>)}
            <button type="button" className={styles.primary} onClick={() => void connectWallet()} disabled={!available || !!busy}>{busy === "wallet" ? "Verify in Phantom…" : hasWallet ? "Verify another wallet" : "Connect & verify with Phantom"}</button>
            <p className={styles.small}>New observations use your most recently verified wallet. Wallet network: {cluster}. This page never asks for a seed phrase.</p>
          </div>
          <div className={styles.panel}>
            <p className={styles.eyebrow}>02 / Evidence for review</p><h3>Submit an observation</h3>
            {selected?.taxonId === taxonId && <p className={styles.selected}>Selected: <em>{selected.scientificName}</em></p>}
            <form onSubmit={submitDiscovery} className={styles.form}>
              <fieldset disabled={!available || !hasWallet || !!busy}>
                <label htmlFor="observation-taxon">MINDEX taxon ID<input id="observation-taxon" value={taxonId} onChange={(event) => setTaxonId(event.target.value)} required pattern="[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}" maxLength={36} /></label>
                <div className={styles.formRow}><label htmlFor="observation-source">Record source<select id="observation-source" value={source} onChange={(event) => setSource(event.target.value)}><option value="inaturalist">iNaturalist</option><option value="fundis">FUNDIS</option><option value="mindex">MINDEX</option><option value="specimen">Lab / citizen specimen</option></select></label><label htmlFor="observation-record">Source record ID<input id="observation-record" value={sourceRecordId} onChange={(event) => setSourceRecordId(event.target.value)} required maxLength={200} pattern={"[a-zA-Z0-9_:.\\/\\-]{1,200}"} /></label></div>
                <label htmlFor="observation-evidence">Evidence URL<input id="observation-evidence" type="url" pattern="(https://|ipfs://).*" value={evidenceUri} onChange={(event) => setEvidenceUri(event.target.value)} required maxLength={1000} placeholder="https://… or ipfs://…" aria-describedby="evidence-help" /></label>
                <p id="evidence-help" className={styles.small}>Link to a stable observation or evidence file. Avoid publicly exposing precise locations of sensitive species.</p>
                <label htmlFor="observation-hash">Evidence SHA-256<input id="observation-hash" value={evidenceSha256} onChange={(event) => setEvidenceSha256(event.target.value)} required pattern="[A-Fa-f0-9]{64}" minLength={64} maxLength={64} placeholder="64-character file fingerprint" aria-describedby="hash-help" /></label>
                <p id="hash-help" className={styles.small}>Use the SHA-256 fingerprint of the evidence file for later verification. A fingerprint establishes file identity; it does not validate the observation.</p>
                <button className={styles.primary} type="submit">{busy === "discovery" ? "Submitting…" : "Submit for review"}</button>
              </fieldset>
              {!hasWallet && <p className={styles.small}>Verify a wallet to enable submissions.</p>}
            </form>
          </div>
        </div>
        <div className={styles.historyGrid}>
          <div className={styles.panel}><p className={styles.eyebrow}>Verification</p><h3>Your observations</h3>
            {account === null ? <p className={styles.muted}>{accountLoading ? "Loading observations…" : "Observation information is unavailable."}</p> : !account.discoveries.length ? <p className={styles.muted}>You have no submitted observations.</p> : <ul className={styles.history}>{account.discoveries.map((discovery) => <li key={discovery.id}><div><strong>{discovery.taxonId}</strong><span className={styles.statusBadge}>{label(discovery.status)}</span></div><small>{displayDate(discovery.createdAt)} · {shortAddress(discovery.id)}</small>{discovery.reason && <p>{discovery.reason}</p>}</li>)}</ul>}
          </div>
          <div className={styles.panel}><p className={styles.eyebrow}>Distribution</p><h3>Your rewards</h3><p className={styles.small}>Queued or submitted rewards are not confirmed transfers. Check the transaction and network for completed distributions.</p>
            {rewards === null ? <p className={styles.muted}>{accountLoading ? "Loading rewards…" : "Reward information is unavailable."}</p> : !rewards.length ? <p className={styles.muted}>No rewards have been recorded for this account.</p> : <ul className={styles.history}>{rewards.map((reward) => {
              const transaction = reward.signature ? explorerUrl("tx", reward.signature, cluster) : undefined;
              return <li key={reward.id}><div><strong>{tokenAmount(String(reward.amount), reward.decimals)} {reward.kind === "myco" ? "MYCO" : "species tokens"}</strong><span className={styles.statusBadge}>{label(reward.status)}</span></div>{reward.taxonId && <small>Taxon {reward.taxonId}</small>}{reward.mint && <small title={reward.mint}>Mint {shortAddress(reward.mint)}</small>}{reward.reason && <p>{reward.reason}</p>}{transaction ? <a href={transaction} target="_blank" rel="noopener noreferrer">View transaction ↗</a> : reward.signature ? <small>Transaction {shortAddress(reward.signature)}</small> : null}</li>;
            })}</ul>}
          </div>
        </div>
      </>}
    </section>
  );
}
