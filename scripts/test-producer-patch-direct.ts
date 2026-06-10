/**
 * Direct server patch test (no HTTP auth). Run from MYCODAO root:
 *   npx --yes tsx scripts/test-producer-patch-direct.ts
 */
import {
  applyProducerPatch,
  buildProducerPublicView,
  readProducerState,
} from "../lib/server/news-producer";
import { readProgramShowConfigs } from "../lib/server/news-program-show-config";

const PROGRAM_ID = "show-mycosoft-garage";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    process.exit(1);
  }
  console.log(`OK   ${msg}`);
}

function main() {
  console.log("Producer patch direct test\n");

  applyProducerPatch({
    returnToLive: true,
    updatedBy: "patch-direct-test",
  });

  applyProducerPatch({
    selectProgramPresetId: PROGRAM_ID,
    updatedBy: "patch-direct-test",
  });
  let state = readProducerState();
  assert(
    state.selectedProgramPresetId === PROGRAM_ID,
    "selectProgramPresetId persisted",
  );
  assert(
    state.activeShowProgramId === null,
    "select does not go on air",
  );

  const configs = readProgramShowConfigs();
  const base = configs[PROGRAM_ID];
  assert(Boolean(base), "show config exists for garage");

  applyProducerPatch({
    saveProgramShowConfig: {
      programPresetId: PROGRAM_ID,
      config: {
        ...base,
        bottomBar: {
          mode: "customText",
          customText: "SIDE PANEL SMOKE TEST — Jun 09 2026",
        },
        newsReel: { mode: "hidden" },
      },
    },
    updatedBy: "patch-direct-test",
  });
  const saved = readProgramShowConfigs()[PROGRAM_ID];
  assert(
    saved?.bottomBar?.mode === "customText",
    "saveProgramShowConfig bottomBar customText",
  );
  assert(saved?.newsReel?.mode === "hidden", "saveProgramShowConfig newsReel hidden");

  applyProducerPatch({
    goOnAirProgramId: PROGRAM_ID,
    updatedBy: "patch-direct-test",
  });
  state = readProducerState();
  assert(
    state.activeShowProgramId === PROGRAM_ID,
    "goOnAirProgramId sets activeShowProgramId",
  );
  assert(Boolean(state.showStartedAt), "goOnAirProgramId sets showStartedAt");
  assert(
    Array.isArray(state.commercialFiredSlotIds) &&
      state.commercialFiredSlotIds.length === 0,
    "goOnAir clears commercialFiredSlotIds",
  );

  const view = buildProducerPublicView();
  assert(view.showOverlay !== null, "showOverlay present on air");
  assert(
    view.showOverlay?.bottomBarMode === "customText",
    "showOverlay bottomBarMode customText",
  );
  assert(
    view.showOverlay?.newsReelMode === "hidden",
    "showOverlay newsReelMode hidden",
  );
  assert(
    view.showOverlay?.liveDataEnabled === true,
    "showOverlay liveDataEnabled default true",
  );

  applyProducerPatch({
    returnToLive: true,
    updatedBy: "patch-direct-test",
  });
  state = readProducerState();
  assert(state.activeShowProgramId === null, "returnToLive clears show");
  const offAir = buildProducerPublicView();
  assert(offAir.showOverlay === null, "showOverlay null off air");

  console.log("\nAll direct patch tests passed.");
}

main();
