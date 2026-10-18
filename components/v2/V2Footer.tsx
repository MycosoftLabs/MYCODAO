import Link from "next/link";
import type { Page } from "@mycodao/sdk";
import { routeChip } from "./labels";
import { SourceNote, StatusChip } from "./primitives";
import { getServerClient, load } from "./server-api";

interface V2FooterProps {
  /** Route key as listed by /routes, e.g. "/v2/myco". */
  route: string;
  sources: ReadonlyArray<Page<unknown>["source"]>;
}

export async function V2Footer({ route, sources }: V2FooterProps) {
  const routes = await load(() => getServerClient().routes());
  const entry = routes.ok ? routes.data.items.find((item) => item.route === route) : undefined;
  return (
    <footer className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-4 text-sm text-white/50 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {entry ? (
          <>
            <StatusChip chip={routeChip(entry.classification)} />
            <span className="text-xs text-white/45">{entry.reason}</span>
          </>
        ) : (
          <span className="text-xs text-white/40">{routes.ok ? "Route not classified yet." : "Route status unavailable."}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SourceNote sources={routes.ok ? [...sources, routes.data.source] : sources} />
        <Link href="/blocks/" className="inline-flex min-h-[44px] items-center text-xs uppercase tracking-widest text-white/45 hover:text-white md:hidden">
          Blocks v1 ↗
        </Link>
      </div>
    </footer>
  );
}
