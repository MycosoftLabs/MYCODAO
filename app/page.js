import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-stone-900">MycoDAO</h1>
        <p className="text-stone-600 mt-2">Community-driven platform for governance, biobank incentives, and research.</p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Link href="/species-tokens" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700">
          Species tokens and rewards
        </Link>
        <Link
          href="/blocks"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-900 text-stone-100 px-4 py-2 text-sm font-medium hover:bg-stone-800"
        >
          Blocks
        </Link>
        <Link
          href="/token"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          MYCO Token
        </Link>
      </div>
    </div>
  );
}
