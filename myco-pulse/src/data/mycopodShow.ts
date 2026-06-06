/** Permanent MycoPOD show metadata for BLOCKS Podcast tab (episodes come from RSS API). */

export const MYCOPOD_RSS_URL = "https://media.rss.com/mycopod/feed.xml";

export const MYCOPOD_COVER_URL =
  "https://media.rss.com/mycopod/podcast_cover_20260606_090642_0771c9572b9b69de65c4cf4f8935d568.png";

export const MYCOPOD_SHOW = {
  title: "MycoPOD",
  subtitle: "The Official Podcast of MycoDAO",
  tagline: "Funding Science. Growing Knowledge. Connecting Nature.",
  websiteUrl: "https://mycodao.com",
  rssUrl: MYCOPOD_RSS_URL,
  coverUrl: MYCOPOD_COVER_URL,
  hosts: ["Morgan Rockwell", "Abelardo Rodriguez"],
  shortDescription:
    "MycoPOD is the official podcast of MycoDAO. Fungi, DeSci, BioDAOs, biotechnology, AI, crypto, environmental restoration, and the future of science.",
  about:
    "Exploring fungi, decentralized science, biotechnology, AI, and the next generation of scientific funding — with scientists, founders, investors, and builders at the intersection of biology, technology, and DAO governance.",
} as const;

export interface MycopodSeasonEpisode {
  number: number;
  title: string;
  focus: string;
}

/** Season 1 guide — shown until RSS episodes publish. */
export const MYCOPOD_SEASON_ONE_GUIDE: MycopodSeasonEpisode[] = [
  { number: 1, title: "Welcome to MycoPOD: Why Fungi Need a DAO", focus: "Origin story & mission" },
  { number: 2, title: "DAO 101 for Scientists", focus: "Proposals, voting, treasury" },
  { number: 3, title: "DeSci 101: Fixing the Funding Gap", focus: "DeSci & MycoDAO" },
  { number: 4, title: "The BioDAO Map", focus: "BioDAO landscape & guests" },
  { number: 5, title: "Funding the First Projects", focus: "Grants & milestones" },
  { number: 6, title: "Project Oyster", focus: "Coastal bioremediation" },
  { number: 7, title: "From Mushroom Sample to FungIP", focus: "Biobanks & tokenized IP" },
  { number: 8, title: "LAB-IN-A-BOX", focus: "Mobile mycology labs" },
  { number: 9, title: "Fungal Computers", focus: "FCI, Mushroom1, NatureOS" },
  { number: 10, title: "The MycoDAO Network", focus: "DeSci, DeFi, Season 2" },
];

export const MYCOPOD_HOST_BIOS = [
  {
    name: "Morgan Rockwell",
    role: "Co-Host · Mycosoft CEO · MycoDAO Co-Founder",
    bio: "Pioneer in Bitcoin, decentralized systems, biological computing, and fungal technology — building infrastructure for fungal science and environmental restoration.",
  },
  {
    name: "Abelardo Rodriguez",
    role: "Co-Host · MycoDAO Co-Founder & Secretary",
    bio: "Partnerships, governance, and community — connecting researchers, institutions, and sponsors to decentralized scientific funding.",
  },
] as const;
