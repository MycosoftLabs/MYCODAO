import { NextResponse } from "next/server";
import {
  applyProducerPatch,
  buildProducerPublicView,
  readProducerPresets,
  type ProducerTitleContext,
} from "@/lib/server/news-producer";
import { resolveNewsProgramNow } from "@/lib/server/news-channel-program";
import {
  producerAuthErrorMessage,
  verifyProducerAuth,
} from "@/lib/server/producer-auth";

export const dynamic = "force-dynamic";

function producerTitleContext(): ProducerTitleContext {
  try {
    const now = resolveNewsProgramNow();
    return {
      programSlotId: now.slotId || null,
      programLabel: now.label || null,
    };
  } catch {
    return {};
  }
}

/** Full producer payload — GET and PATCH must return the same shape (includes presets). */
function buildProducerApiPayload(ctx?: ProducerTitleContext) {
  const view = buildProducerPublicView(ctx ?? producerTitleContext());
  const presets = readProducerPresets();
  return {
    ...view,
    presets: {
      talent: presets.talent.map((t) => ({
        id: t.id,
        label: t.label,
      })),
      program: presets.program.map((p) => ({
        id: p.id,
        label: p.label,
        type: p.type,
        hasSource: Boolean(
          p.videoUrl?.trim() ||
            p.videoId?.trim() ||
            p.channelId?.trim() ||
            p.nasPath?.trim(),
        ),
      })),
      title: presets.title.map((t) => ({
        id: t.id,
        label: t.label,
        logoNasPath: t.logoNasPath?.trim() || null,
      })),
    },
  };
}

export async function GET() {
  try {
    return NextResponse.json(buildProducerApiPayload(), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    console.error("news/producer GET:", e);
    return NextResponse.json(
      { error: "producer_unavailable", detail: String(e) },
      { status: 503 },
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyProducerAuth(req);
  if (!auth.ok) {
    const status =
      auth.reason === "auth_unconfigured"
        ? 503
        : auth.reason === "auth_upstream_error"
          ? 502
          : 401;
    return NextResponse.json(
      { error: producerAuthErrorMessage(auth) },
      { status },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const state = applyProducerPatch({
      activeTalentPresetId:
        body.activeTalentPresetId === null
          ? null
          : typeof body.activeTalentPresetId === "string"
            ? body.activeTalentPresetId
            : undefined,
      customTalent:
        body.customTalent === null
          ? null
          : Array.isArray(body.customTalent)
            ? (body.customTalent as {
                name: string;
                roles: string[];
                creditLine?: string;
              }[])
            : undefined,
      activeTitlePresetId:
        body.activeTitlePresetId === null
          ? null
          : typeof body.activeTitlePresetId === "string"
            ? body.activeTitlePresetId
            : undefined,
      customTitleText:
        body.customTitleText === null
          ? null
          : typeof body.customTitleText === "string"
            ? body.customTitleText
            : undefined,
      customTitleLogoNasPath:
        body.customTitleLogoNasPath === null
          ? null
          : typeof body.customTitleLogoNasPath === "string"
            ? body.customTitleLogoNasPath
            : undefined,
      programMode:
        typeof body.programMode === "string"
          ? (body.programMode as
              | "schedule"
              | "live"
              | "commercial"
              | "bumper"
              | "partner"
              | "recorded")
          : undefined,
      activeProgramPresetId:
        body.activeProgramPresetId === null
          ? null
          : typeof body.activeProgramPresetId === "string"
            ? body.activeProgramPresetId
            : undefined,
      programOverride:
        body.programOverride === null
          ? null
          : body.programOverride && typeof body.programOverride === "object"
            ? (body.programOverride as {
                label: string;
                type: "commercial" | "bumper" | "partner" | "live" | "recorded";
                videoUrl?: string;
                videoId?: string;
                channelId?: string;
                nasPath?: string;
              })
            : undefined,
      fireProgramPresetId:
        typeof body.fireProgramPresetId === "string"
          ? body.fireProgramPresetId
          : undefined,
      fireNasAsset:
        body.fireNasAsset && typeof body.fireNasAsset === "object"
          ? (body.fireNasAsset as {
              relPath: string;
              label?: string;
              type?: "commercial" | "bumper" | "partner" | "live" | "recorded";
              category?: string;
            })
          : undefined,
      activeGraphicNasPath:
        body.activeGraphicNasPath === null
          ? null
          : typeof body.activeGraphicNasPath === "string"
            ? body.activeGraphicNasPath
            : undefined,
      clearGraphic: body.clearGraphic === true,
      liveStreamDataAssetIds: Array.isArray(body.liveStreamDataAssetIds)
        ? (body.liveStreamDataAssetIds as string[])
        : body.liveStreamDataAssetIds === null
          ? []
          : undefined,
      liveStreamDataMarketingNasPath:
        body.liveStreamDataMarketingNasPath === null
          ? null
          : typeof body.liveStreamDataMarketingNasPath === "string"
            ? body.liveStreamDataMarketingNasPath
            : undefined,
      clearLiveStreamDataMarketing: body.clearLiveStreamDataMarketing === true,
      clearTitleBarLogo: body.clearTitleBarLogo === true,
      returnToLive: body.returnToLive === true,
      updatedBy:
        typeof body.updatedBy === "string" ? body.updatedBy : auth.email,
    });

    const view = buildProducerApiPayload();
    return NextResponse.json({ ok: true, state, view });
  } catch (e) {
    console.error("news/producer PATCH:", e);
    return NextResponse.json(
      { error: "producer_patch_failed", detail: String(e) },
      { status: 500 },
    );
  }
}
