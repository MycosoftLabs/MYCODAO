import React, { useEffect, useState } from "react";

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

  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [titleBar.syncKey, titleBar.logoUrl]);

  if (!title) return null;

  const remoteLogoSrc = titleBar.logoUrl
    ? titleBar.logoUrl.startsWith("http")
      ? titleBar.logoUrl
      : pulseApiUrl(titleBar.logoUrl)
    : null;

  const logoSrc =
    logoFailed || !remoteLogoSrc ? mycodaoWhiteLogo : remoteLogoSrc;



  return (

    <div

      className={cn(

        "shrink-0 w-full relative z-40 pointer-events-none bg-black",

        className,

      )}

      aria-live="polite"

    >

      <div className="flex h-9 md:h-[68px] border-b md:border-b-2 border-white/20">

        <div className="shrink-0 w-[4.5rem] sm:w-[5.5rem] md:w-[7.5rem] lg:w-[184px] self-stretch min-h-9 md:min-h-[68px] bg-[#0055cc] flex items-center justify-center px-1.5 sm:px-2 md:px-3">

          <LiveStreamMarketingLogo
            src={logoSrc}
            variant="titleBar"
            onError={() => setLogoFailed(true)}
          />

        </div>

        <div className="flex-1 min-w-0 bg-white overflow-hidden flex items-center justify-center px-2 sm:px-3 md:px-4">

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

