import { useEffect, useState } from "react";

const MD_QUERY = "(min-width: 768px)";

/** True when viewport is md breakpoint (768px+) — matches Tailwind `md:`. */
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
