"use client";

import { SegmentError } from "@/components/v2/SegmentStates";

export default function SiteV2Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SegmentError error={error} reset={reset} />;
}
