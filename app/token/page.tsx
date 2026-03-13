import Link from "next/link";

export const metadata = {
  title: "MYCO Token | MycoDAO",
  description: "MYCO token: governance, funding, and transactional tool for the MycoDAO ecosystem.",
};

export default function TokenPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/pulse" className="text-sm text-stone-500 hover:text-stone-700 mb-4 inline-block">
        ← Market Pulse
      </Link>
      <h1 className="text-2xl font-bold text-stone-900">MYCO Token</h1>
      <p className="text-stone-600 mt-2">
        MYCO is the governance and funding token for the MycoDAO ecosystem. It serves as a transactional tool for grants, biobank incentives, and industry partnerships.
      </p>
      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-semibold text-stone-800">Tokenomics</h2>
        <ul className="list-disc pl-6 text-stone-600 space-y-1">
          <li>Total supply: 210,000,000 MYCO</li>
          <li>Chain: Solana</li>
          <li>Also: Bitcoin inscriptions, Proof of Invention on Ethereum</li>
        </ul>
        <h3 className="text-base font-semibold text-stone-800 mt-4">Distribution</h3>
        <ul className="list-disc pl-6 text-stone-600 space-y-1">
          <li>30% Community & Research Grants</li>
          <li>22% Biobank & Data Incentives</li>
          <li>18% Industry Partnerships</li>
          <li>12% Liquidity & Operations</li>
          <li>18% Founding Team</li>
        </ul>
        <h3 className="text-base font-semibold text-stone-800 mt-4">Utilities</h3>
        <p className="text-stone-600">
          Citizen science rewards, compound marketplace, biobank storage, tissue licensing, environmental monitoring data, IP tokenization and licensing.
        </p>
      </section>
      <Link href="/pulse/myco" className="inline-block mt-6 font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--accent-gold)" }}>
        View MYCO in Market Pulse →
      </Link>
    </div>
  );
}
