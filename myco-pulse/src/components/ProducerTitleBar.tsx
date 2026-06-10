import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { mycodaoWhiteLogo } from "../lib/brandLogos";
import { useNewsProducer } from "../hooks/useNewsProducer";
import { pulseApiUrl } from "../lib/apiOrigin";
import { cn } from "../lib/utils";
import { LiveStreamMarketingLogo } from "./LiveStreamMarketingLogo";

interface ProducerTitleBarProps {
  className?: string;
}

/** Top title row — mirrors bottom bumper on desktop; slim band on mobile. */
export function ProducerTitleBar({ className }: ProducerTitleBarProps) {
  const { titleBar } = useNewsProducer();
  const title = titleBar.text?.trim();
  const [displayLogoSrc, setDisplayLogoSrc] = useState(mycodaoWhiteLogo);

  const remoteLogoSrc = useMemo(() => {
    if (!titleBar.logoUrl) return null;
    return titleBar.logoUrl.startsWith("http")
      ? titleBar.logoUrl
      : pulseApiUrl(titleBar.logoUrl);
  }, [titleBar.logoUrl]);

  useEffect(() => {
    if (!remoteLogoSrc) {
      setDisplayLogoSrc(mycodaoWhiteLogo);
      return;
    }

    let cancelled = false;
    const probe = new Image();
    probe.decoding = "sync";
    probe.onload = () => {
      if (!cancelled) setDisplayLogoSrc(remoteLogoSrc);
    };
    probe.onerror = () => {
      if (!cancelled) setDisplayLogoSrc(mycodaoWhiteLogo);
    };
    probe.src = remoteLogoSrc;

    return () => {
      cancelled = true;
    };
  }, [remoteLogoSrc, titleBar.syncKey]);

  if (!title) return null;

  return (
    <div
      className={cn(
        "shrink-0 w-full relative z-40 pointer-events-none bg-black",
        className,
      )}
      aria-live="polite"
    >
      <div className="flex items-center border-b md:border-b-2 border-white/20 h-9 md:h-[68px] min-h-9 md:min-h-[68px] shrink-0">
        <div className="shrink-0 w-[4.5rem] sm:w-[5.5rem] md:w-[7.5rem] lg:w-[184px] h-9 md:h-[68px] min-h-9 md:min-h-[68px] bg-[#0055cc] flex items-center justify-center overflow-hidden px-1 sm:px-1.5 md:px-2 py-0.5 md:py-1">
          <LiveStreamMarketingLogo
            src={displayLogoSrc}
            variant="titleBar"
            onError={() => setDisplayLogoSrc(mycodaoWhiteLogo)}
          />
        </div>

        <div className="flex-1 min-w-0 h-9 md:h-[68px] bg-white overflow-hidden flex items-center justify-center px-2 sm:px-3 md:px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={titleBar.syncKey}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.3 }}
              className="w-full text-center text-[10px] sm:text-[11px] md:text-xl font-black uppercase tracking-[0.1em] md:tracking-[0.14em] text-black leading-none truncate"
            >
              {title}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
