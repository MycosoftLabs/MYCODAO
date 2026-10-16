import Link from "next/link";
import SpeciesTokenLibrary from "@/components/species-tokens/SpeciesTokenLibrary";
import { getPublicSupabaseConfig } from "@/lib/server/supabase-public";
import styles from "@/components/species-tokens/species-tokens.module.css";

export const metadata = {
  title: "Species Library & Rewards | MycoDAO",
  description: "Explore licensed fungal records, verify a Solana wallet, and submit observations for review by MycoDAO.",
};
export const dynamic = "force-dynamic";

export default function SpeciesTokensPage() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseConfig();
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav aria-label="Main navigation" className={styles.navigation}>
          <Link href="/" className={styles.brand}>MycoDAO <span>Fungal science, together.</span></Link>
          <Link href="/token">MYCO token ↗</Link>
        </nav>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A living record of fungal discovery</p>
            <h1>Know the species.<br /><em>Grow the knowledge.</em></h1>
            <p className={styles.intro}>Explore fungal records licensed from MINDEX. Contribute documented observations, link your Solana wallet, and follow your contribution through review and rewards.</p>
            <a href="#contribute" className={styles.primary}>Contribute an observation <span aria-hidden="true">↗</span></a>
          </div>
          <aside className={styles.heroNote} aria-label="How species rewards work">
            <span className={styles.noteIndex}>01 / FIELD TO LIBRARY</span>
            <h2>Every observation starts with evidence.</h2>
            <p>Approved observations of existing species can earn that species’ reward token. Eligible new or rare species can earn MYCO, according to the funded reward policy.</p>
            <div className={styles.noteRule} />
            <p className={styles.small}>Rewards depend on verification, an eligible policy, and allocated funds. A submitted observation does not guarantee a reward.</p>
          </aside>
        </header>
        <SpeciesTokenLibrary supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />
        <footer className={styles.footer}>
          <p>Species tokens are community reward assets. Holding a token does not establish ownership of a species, biological material, a patent, or underlying data rights.</p>
          <p>Observations are subject to scientific review. A new database record is not proof of a species new to science.</p>
          <Link href="/">← MycoDAO</Link>
        </footer>
      </div>
    </div>
  );
}
