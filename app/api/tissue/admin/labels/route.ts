import { NextResponse } from "next/server";
import {
  biobankScanBase,
  buildScanUrl,
  computeCheckChar,
  isAccessionCode,
} from "@/lib/server/biobank-id";
import { resolveAccessionForScan } from "@/lib/server/biobank";
import { qrSvg } from "@/lib/server/qr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Printable QR label sheet for a Brother label printer (or any printer).
 *
 *   GET /api/tissue/admin/labels?codes=PLEOST-A-0014,PLEOST-A-0015&layout=jar
 *
 * Opens an HTML page → Ctrl/Cmd-P → print. Each label carries the QR (resolving
 * to /t/<code>), the human accession code, a check character, and — for PUBLIC
 * specimens only — the species name. Internal/hidden units show the code alone,
 * so this endpoint never leaks private catalog data and can stay browser-openable.
 *
 * Layouts (label face size):
 *   jar  (default) 50 × 30 mm   roll-friendly + Letter grid
 *   dish           38 × 19 mm   small Petri / slant labels
 *   roll           62 × 29 mm   one label per page (QL continuous roll)
 */
const LAYOUTS: Record<string, { w: number; h: number; qr: number; roll: boolean }> = {
  jar: { w: 50, h: 30, qr: 22, roll: false },
  dish: { w: 38, h: 19, qr: 15, roll: false },
  roll: { w: 62, h: 29, qr: 24, roll: true },
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const codes = (searchParams.get("codes") || "")
    .split(/[,\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
    .filter(isAccessionCode)
    .slice(0, 120);

  const layoutKey = searchParams.get("layout") || "jar";
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS.jar;

  if (!codes.length) {
    return new NextResponse(
      `<!doctype html><meta charset=utf8><body style="font-family:system-ui;padding:2rem">
       <h1>Biobank label sheet</h1>
       <p>Pass accession codes, e.g.
       <code>?codes=PLEOST-A-0014,PLEOST-A-0015&amp;layout=jar</code></p>
       <p>Layouts: <code>jar</code> (50×30mm), <code>dish</code> (38×19mm),
       <code>roll</code> (62×29mm, one per page).</p></body>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const labels = await Promise.all(
    codes.map(async (code) => {
      const url = buildScanUrl(code);
      const svg = await qrSvg(url, { margin: 0 });
      let name = "";
      try {
        const r = await resolveAccessionForScan(code);
        if (r.accession?.taxon) {
          name =
            r.accession.taxon.commonName ||
            r.accession.taxon.scientificName ||
            "";
        }
      } catch {
        /* unconfigured / private → code only */
      }
      return {
        code,
        check: computeCheckChar(code),
        svg,
        name,
      };
    }),
  );

  const pageCss = layout.roll
    ? `@page { size: ${layout.w}mm ${layout.h}mm; margin: 0; }
       .sheet { display:block; }
       .label { page-break-after: always; }`
    : `@page { size: auto; margin: 8mm; }
       .sheet { display:flex; flex-wrap:wrap; gap:2mm; }`;

  const labelHtml = labels
    .map(
      (l) => `
    <div class="label" style="width:${layout.w}mm;height:${layout.h}mm;">
      <div class="qr" style="width:${layout.qr}mm;height:${layout.qr}mm;">${l.svg}</div>
      <div class="meta">
        ${l.name ? `<div class="name">${esc(l.name)}</div>` : ""}
        <div class="code">${esc(l.code)}</div>
        <div class="check">✓${esc(l.check)}</div>
      </div>
    </div>`,
    )
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<title>Biobank labels (${labels.length})</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; color:#000; }
  .toolbar { padding:10px 14px; background:#0b1f17; color:#d7f5e6; font-family:system-ui;
             display:flex; gap:14px; align-items:center; }
  .toolbar button { font:inherit; padding:6px 14px; border:0; border-radius:6px;
                    background:#22c07a; color:#04130c; font-weight:600; cursor:pointer; }
  .toolbar a { color:#9fe8c6; }
  ${pageCss}
  .sheet { padding:4mm; }
  .label { display:flex; align-items:center; gap:1.5mm; border:0.2mm solid #bbb;
           border-radius:1mm; padding:1.5mm; overflow:hidden; background:#fff; }
  .label .qr svg { width:100%; height:100%; display:block; }
  .label .meta { flex:1; min-width:0; line-height:1.1; }
  .label .name { font-family:system-ui; font-weight:700; font-size:2.4mm;
                 white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .label .code { font-weight:700; font-size:3mm; letter-spacing:0.2px; margin-top:0.5mm; }
  .label .check { font-size:2.2mm; color:#555; }
  @media print { .toolbar { display:none; } .label { border-color:#ddd; } }
</style></head>
<body>
  <div class="toolbar">
    <strong>${labels.length} label(s)</strong>
    <button onclick="window.print()">Print</button>
    <span>Layout: <strong>${esc(layoutKey)}</strong> (${layout.w}×${layout.h}mm)</span>
    <span>Resolve base: <a href="${esc(biobankScanBase())}/t/" target="_blank">${esc(biobankScanBase())}/t/</a></span>
  </div>
  <div class="sheet">${labelHtml}</div>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
