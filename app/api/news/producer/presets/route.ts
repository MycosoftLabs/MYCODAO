import { NextResponse } from "next/server";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";
import {
  loadProducerCatalog,
  removeProgramPreset,
  removeTalentPreset,
  removeTitlePreset,
  saveProducerCatalog,
  upsertProgramPreset,
  upsertTalentPreset,
  upsertTitlePreset,
} from "@/lib/server/producer-catalog-store";
import type {
  NewsProducerPresets,
  ProgramAssetPreset,
} from "@/lib/server/news-producer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapPresets(presets: NewsProducerPresets) {
  return {
    talent: presets.talent.map((t) => ({ id: t.id, label: t.label, lines: t.lines })),
    program: presets.program.map((p) => ({
      id: p.id,
      label: p.label,
      type: p.type,
      nasPath: p.nasPath ?? null,
      videoUrl: p.videoUrl ?? null,
      videoId: p.videoId ?? null,
      channelId: p.channelId ?? null,
      titlePresetId: p.titlePresetId ?? null,
      hasSource: Boolean(
        p.videoUrl?.trim() || p.videoId?.trim() || p.channelId?.trim() || p.nasPath?.trim(),
      ),
    })),
    title: presets.title.map((t) => ({
      id: t.id,
      label: t.label,
      title: t.title,
      logoNasPath: t.logoNasPath ?? null,
    })),
  };
}

export async function GET() {
  try {
    const presets = await loadProducerCatalog();
    return NextResponse.json(
      { presets: mapPresets(presets) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "presets_unavailable", detail: String(e) },
      { status: 503 },
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth) },
      { status: auth.reason === "auth_unconfigured" ? 503 : 401 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const kind = typeof body.kind === "string" ? body.kind : "";

    if (action === "replace" && body.presets && typeof body.presets === "object") {
      const raw = body.presets as NewsProducerPresets;
      const saved = await saveProducerCatalog({
        talent: Array.isArray(raw.talent) ? raw.talent : [],
        program: Array.isArray(raw.program) ? raw.program : [],
        title: Array.isArray(raw.title) ? raw.title : [],
      });
      return NextResponse.json({
        ok: true,
        storage: saved.storage,
        presets: mapPresets(saved.presets),
      });
    }

    if (action === "upsert") {
      if (kind === "talent") {
        const label = String(body.label ?? "").trim();
        if (!label) return NextResponse.json({ error: "label_required" }, { status: 400 });
        const presets = await upsertTalentPreset({
          id: typeof body.id === "string" ? body.id : undefined,
          label,
          lines: Array.isArray(body.lines) ? (body.lines as TalentLines) : undefined,
        });
        return NextResponse.json({ ok: true, presets: mapPresets(presets) });
      }
      if (kind === "program") {
        const label = String(body.label ?? "").trim();
        const type = String(body.type ?? "recorded") as ProgramAssetPreset["type"];
        if (!label) return NextResponse.json({ error: "label_required" }, { status: 400 });
        const presets = await upsertProgramPreset({
          id: typeof body.id === "string" ? body.id : undefined,
          label,
          type,
          videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : undefined,
          videoId: typeof body.videoId === "string" ? body.videoId : undefined,
          channelId: typeof body.channelId === "string" ? body.channelId : undefined,
          nasPath: typeof body.nasPath === "string" ? body.nasPath : undefined,
          titlePresetId: typeof body.titlePresetId === "string" ? body.titlePresetId : undefined,
        });
        return NextResponse.json({ ok: true, presets: mapPresets(presets) });
      }
      if (kind === "title") {
        const label = String(body.label ?? "").trim();
        const title = String(body.title ?? label).trim();
        if (!label || !title) return NextResponse.json({ error: "label_required" }, { status: 400 });
        const presets = await upsertTitlePreset({
          id: typeof body.id === "string" ? body.id : undefined,
          label,
          title,
          logoNasPath: typeof body.logoNasPath === "string" ? body.logoNasPath : null,
        });
        return NextResponse.json({ ok: true, presets: mapPresets(presets) });
      }
    }

    if (action === "remove" && typeof body.id === "string") {
      if (kind === "talent") {
        return NextResponse.json({
          ok: true,
          presets: mapPresets(await removeTalentPreset(body.id)),
        });
      }
      if (kind === "program") {
        return NextResponse.json({
          ok: true,
          presets: mapPresets(await removeProgramPreset(body.id)),
        });
      }
      if (kind === "title") {
        return NextResponse.json({
          ok: true,
          presets: mapPresets(await removeTitlePreset(body.id)),
        });
      }
    }

    return NextResponse.json(
      { error: "unsupported_action", hint: "action=upsert|remove|replace with kind=talent|program|title" },
      { status: 400 },
    );
  } catch (e) {
    console.error("news/producer/presets PATCH:", e);
    return NextResponse.json(
      { error: "presets_patch_failed", detail: String(e) },
      { status: 500 },
    );
  }
}

type TalentLines = Array<{ name: string; roles: string[]; creditLine?: string }>;
