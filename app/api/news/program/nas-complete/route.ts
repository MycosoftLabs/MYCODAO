// AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See AWS_INFRA_REFERENCE.md for its replacement and disposition. Loopback development and physical-device fixtures are separate.
import { NextResponse } from "next/server";
import {
  applyProducerPatch,
  readProducerState,
  resumeActiveShow,
} from "@/lib/server/news-producer";

export const dynamic = "force-dynamic";

/** POST — viewer NAS clip ended; return producer override to scheduled live when allowed. */
export async function POST() {
  try {
    const state = readProducerState();
    const override = state.programOverride;
    if (!override?.nasPath?.trim()) {
      return NextResponse.json({ ok: false, reason: "no_nas_override" });
    }
    const t = override.type;
    if (t !== "commercial" && t !== "recorded") {
      return NextResponse.json({ ok: false, reason: "not_auto_return_type" });
    }
    if (state.activeShowProgramId) {
      resumeActiveShow();
    } else {
      applyProducerPatch({ returnToLive: true, updatedBy: "nas-complete" });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("news/program/nas-complete:", e);
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
