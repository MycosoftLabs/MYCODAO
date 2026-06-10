import { useEffect, useState } from "react";

const MD_QUERY = "(min-width: 768px)";

/**
 * True at Tailwind `md` (768px+): tablet landscape/portrait and desktop.
 * Phones stay false — no PiP, inline News video instead of body portal.
 */
export function useMediaMinMd(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MD_QUERY).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return matches;
}
