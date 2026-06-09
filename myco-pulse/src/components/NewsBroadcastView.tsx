import React from "react";
import { CNBCNewsWidget } from "./CNBCNewsWidget";
import { NewsLiveStage } from "./NewsLiveStage";
import { ProducerTalentBar } from "./ProducerTalentBar";

/** News tab: program video (producer/schedule) + CNBC chrome + talent lower-thirds. */
export function NewsBroadcastView() {
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col isolate">
      <NewsLiveStage className="z-0" />
      <div className="relative z-10 flex-1 min-h-0 flex flex-col min-w-0">
        <CNBCNewsWidget overlayMode />
      </div>
      <ProducerTalentBar />
    </div>
  );
}
