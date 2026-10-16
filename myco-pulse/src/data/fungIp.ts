/**
 * FungIP / Myco App educational constants for Blocks.
 * No mock specimens — live taxa come from /api/tissue/fungi.
 */

/** Images mirrored from mycodao.com/projects/myco-app-mycodex (Webflow CDN originals). */
export const FUNGIP_MEDIA = {
  mycodexHero: "/assets/fungip/mycodex-hero.webp",
  howItWorks: "/assets/fungip/how-it-works.webp",
  mycodexFeatures: "/assets/fungip/mycodex-features.webp",
  mycoAppFeatures: "/assets/fungip/myco-app-features.webp",
} as const;

export const MYCO_APP_PROJECT_URL =
  "https://www.mycodao.com/projects/myco-app-mycodex";

export interface FungIpHowStep {
  id: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
}

export const FUNGIP_HOW_STEPS: FungIpHowStep[] = [
  {
    id: "see",
    title: "1. See a fungus",
    body: "Use the Myco App (phone) or MycoDEX in the field. A photo or sensor pass becomes an observation — not a mint yet.",
    image: FUNGIP_MEDIA.mycoAppFeatures,
    imageAlt: "Myco App features — field identification on a phone",
  },
  {
    id: "match",
    title: "2. Match MINDEX",
    body: "The network checks the licensed Mycosoft MINDEX / Ancestry catalog. Known species get a stable UUID. Unmatched stays a candidate — never auto-declared “new.”",
    image: FUNGIP_MEDIA.howItWorks,
    imageAlt: "How Myco App and MycoDEX work in the field",
  },
  {
    id: "reward",
    title: "3. Earn species token + MYCO",
    body: "Verified finds of known species can receive that species’ token and MYCO. Verified new concepts mint a species token, grant discovery MYCO, then progress MYCO as genetics and uses advance — agents execute; humans only adjudicate science.",
    image: FUNGIP_MEDIA.mycodexFeatures,
    imageAlt: "MycoDEX features — discovery hardware and rewards",
  },
];

export const FUNGIP_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Do I own the mushroom or its DNA?",
    a: "No. Species tokens coordinate contribution and rewards. They are not legal ownership of organisms, DNA, or IP.",
  },
  {
    q: "Why didn’t the app mint a new species coin?",
    a: "A low model match is not a new taxon. Novelty needs review (and often lab/genetics). Until then it stays a candidate.",
  },
  {
    q: "What is FungiP vs Tissue?",
    a: "FungiP links permanent FG IDs and token status to MINDEX UUIDs. Tissue holds real physical accessions. Reference tiles in the library are not jars.",
  },
];
