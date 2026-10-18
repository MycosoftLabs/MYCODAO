/**

 * MycoDAO DeSci pipeline catalog — public program initiatives (Season 1 / BLOCK Funding).

 * Raise/backer numbers come from live APIs when available; never invented here.

 */



export type FundingPipelineStage = "incubation" | "curation" | "auction" | "live";



export type FundingEntityKind = "mycodao-project" | "dao-incubation" | "mycosoft-platform";

export const MYCO_REALMS_URL =
  "https://v2.realms.today/dao/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";

/** Canonical outbound program pages (mycodao.com / mycosoft.com). */
export const SCIENCE_PROGRAM_URLS = {
  "project-oyster": "https://www.mycodao.com/projects/project-oyster",
  "mushroomgo": "https://www.mycodao.com/projects/mushroomgo",
  "myco-scholarships": "https://www.mycodao.com/projects/myco-scholarships",
  "fungip-biobank": "https://www.mycodao.com/fungip",
  "project-lion": "https://www.mycodao.com/projects/project-lion",
  "project-fusarium": "https://www.mycodao.com/projects/project-fusarium",
  "lab-in-a-box": "https://www.mycodao.com/projects/lab-in-a-box",
  "fci-compute": "https://mycosoft.com/sensing/fungi-compute-fci",
  "first-grants": `${MYCO_REALMS_URL}/proposals`,
  "desci-network": "https://www.mycodao.com/science",
  "mycosoft-ai": "https://mycosoft.com/ai",
  projectsHub: "https://www.mycodao.com/projects",
} as const;



export interface DesciFundingProject {

  id: string;

  name: string;

  tagline: string;

  stage: FundingPipelineStage;

  category: "bioremediation" | "biobank" | "lab" | "compute" | "network" | "ip" | "grants" | "nutrition" | "pathogen";

  kind: FundingEntityKind;

  fungIpEligible: boolean;

  featured?: boolean;

  imageUrl?: string;

  statusLabel?: string;

  docsUrl?: string;

  proposalUrl?: string;

  highlight?: string;

}



const FUNDING_IMG = (file: string) => `${import.meta.env.BASE_URL}funding/${file}`;



/** Hero cards on Funding tab — MycoDAO science programs in incubation. */

export const FEATURED_FUNDING_BLOCKS: DesciFundingProject[] = [

  {

    id: "project-lion",

    name: "Project Lion",

    tagline: "Lion's mane protein improvement — cultivation, extraction, and functional nutrition science",

    stage: "incubation",

    category: "nutrition",

    kind: "mycodao-project",

    fungIpEligible: true,

    featured: true,

    imageUrl: FUNDING_IMG("project-lion.png"),

    docsUrl: SCIENCE_PROGRAM_URLS["project-lion"],

    highlight: "MycoDAO operation — Hericium erinaceus protein & bioactive optimization",

  },

  {

    id: "project-fusarium",

    name: "Project Fusarium",

    tagline: "Finding, gathering, studying, and eliminating Fusarium threats to crops and ecosystems",

    stage: "incubation",

    category: "pathogen",

    kind: "mycodao-project",

    fungIpEligible: true,

    featured: true,

    imageUrl: FUNDING_IMG("project-fusarium.png"),

    docsUrl: SCIENCE_PROGRAM_URLS["project-fusarium"],

    highlight: "MycoDAO operation — field surveillance, lab isolation, and biocontrol R&D",

  },

];



export const BLOCK_FUNDING_LINKS = {

  treasury: `${MYCO_REALMS_URL}/treasury`,

  proposals: `${MYCO_REALMS_URL}/proposals`,

  launchpad: "https://v2.realms.today/launchpad",

  token: "https://www.mycodao.com/token",

  fungip: "https://blocks.mycodao.com/blocks/",

  researchhub: "https://www.researchhub.com/popular",

  researchhubDocs: "https://docs.researchhub.com/",

} as const;



/** Documented MycoDAO science programs — pipeline stage reflects BLOCK Funding ops. */

export const MYCO_DESCI_PROJECTS: DesciFundingProject[] = [

  {

    id: "project-oyster",

    name: "Project Oyster",

    tagline:
      "Research program evaluating salt tolerance and bioremediation potential in oyster mushrooms (Pleurotus djamor). Stage: laboratory culture work.",

    stage: "curation",

    category: "bioremediation",

    kind: "mycodao-project",

    fungIpEligible: true,

    imageUrl: FUNDING_IMG("project-oyster.png"),

    docsUrl: SCIENCE_PROGRAM_URLS["project-oyster"],

    highlight: "Season 1 program — laboratory culture work (Pleurotus djamor)",

  },

  {

    id: "mushroomgo",

    name: "MushroomGO",

    tagline: "Real-world fungal safari — gamified citizen mycology in the field",

    stage: "incubation",

    category: "network",

    kind: "mycodao-project",

    fungIpEligible: true,

    imageUrl: FUNDING_IMG("mushroomgo.png"),

    statusLabel: "Coming 2026",

    docsUrl: SCIENCE_PROGRAM_URLS["mushroomgo"],

    highlight: "Field exploration app — replaces Myco App on the public roadmap",

  },

  {

    id: "myco-scholarships",

    name: "MYCO Scholarships",

    tagline: "Long-term goal: a recurring grant program for mycological societies. Funding levels and recipients will be announced after budgets and program arrangements are confirmed.",

    stage: "auction",

    category: "grants",

    kind: "mycodao-project",

    fungIpEligible: false,

    docsUrl: SCIENCE_PROGRAM_URLS["myco-scholarships"],

    proposalUrl: `${MYCO_REALMS_URL}/proposals`,

    highlight: "Planned — not yet funded",

  },

  {

    id: "fungip-biobank",

    name: "FungIP Biobank",

    tagline: "Specimen records and timestamps that support provenance for fungal samples",

    stage: "curation",

    category: "ip",

    kind: "mycodao-project",

    fungIpEligible: true,

    docsUrl: SCIENCE_PROGRAM_URLS["fungip-biobank"],

    highlight: "Provenance records; any licensing happens only under a named, signed agreement",

  },

  {

    id: "project-lion",

    name: "Project Lion",

    tagline: "Lion's mane protein improvement — cultivation, extraction, and functional nutrition science",

    stage: "incubation",

    category: "nutrition",

    kind: "mycodao-project",

    fungIpEligible: true,

    featured: true,

    imageUrl: FUNDING_IMG("project-lion.png"),

    docsUrl: SCIENCE_PROGRAM_URLS["project-lion"],

    highlight: "Hericium erinaceus protein & bioactive optimization",

  },

  {

    id: "project-fusarium",

    name: "Project Fusarium",

    tagline: "Finding, gathering, studying, and eliminating Fusarium threats to crops and ecosystems",

    stage: "incubation",

    category: "pathogen",

    kind: "mycodao-project",

    fungIpEligible: true,

    featured: true,

    imageUrl: FUNDING_IMG("project-fusarium.png"),

    docsUrl: SCIENCE_PROGRAM_URLS["project-fusarium"],

    highlight: "Field surveillance, lab isolation, and biocontrol R&D",

  },

  {

    id: "lab-in-a-box",

    name: "LAB-IN-A-BOX",

    tagline: "Mobile mycology lab kits for field science and citizen researchers",

    stage: "incubation",

    category: "lab",

    kind: "mycodao-project",

    fungIpEligible: false,

    docsUrl: SCIENCE_PROGRAM_URLS["lab-in-a-box"],

  },

  {

    id: "fci-compute",

    name: "Fungal Compute Interface",

    tagline: "FCI, Mushroom1, SporeBase, and NatureOS biological computing stack",

    stage: "incubation",

    category: "compute",

    kind: "mycodao-project",

    fungIpEligible: true,

    docsUrl: SCIENCE_PROGRAM_URLS["fci-compute"],

  },

  {

    id: "first-grants",

    name: "MycoDAO First Grants",

    tagline: "Milestone-based treasury grants for peer-reviewed fungal science",

    stage: "auction",

    category: "grants",

    kind: "mycodao-project",

    fungIpEligible: false,

    docsUrl: SCIENCE_PROGRAM_URLS["first-grants"],

    proposalUrl: `${MYCO_REALMS_URL}/proposals`,

    highlight: "DAO-weighted funding rounds on Solana Realms",

  },

  {

    id: "desci-network",

    name: "MycoDAO Network",

    tagline: "DeSci, DeFi, and DePIN rails for cross-BioDAO collaboration",

    stage: "live",

    category: "network",

    kind: "mycodao-project",

    fungIpEligible: false,

    docsUrl: SCIENCE_PROGRAM_URLS["desci-network"],

    proposalUrl: `${MYCO_REALMS_URL}/proposals`,

    highlight: "Open science funding without centralized gatekeepers",

  },

];

/** Research tab program list — MycoDAO science programs plus Mycosoft AI platform. */
export const MYCO_RESEARCH_PROGRAMS: DesciFundingProject[] = [
  ...MYCO_DESCI_PROJECTS,
  {
    id: "mycosoft-ai",
    name: "Mycosoft AI",
    tagline: "MYCA, AVANI, and NLM — layered intelligence for planet-scale fungal and environmental science",
    stage: "live",
    category: "compute",
    kind: "mycosoft-platform",
    fungIpEligible: false,
    docsUrl: SCIENCE_PROGRAM_URLS["mycosoft-ai"],
    highlight: "Edge-native agents, Earth substrate, and Nature Learning Models",
  },
];



/** Pipeline list excluding featured hero duplicates. */

export function getPipelineProjects(): DesciFundingProject[] {

  const featuredMycoIds = new Set(

    FEATURED_FUNDING_BLOCKS.filter((p) => p.kind === "mycodao-project").map((p) => p.id)

  );

  return MYCO_DESCI_PROJECTS.filter((p) => !featuredMycoIds.has(p.id));

}



export const FUNDING_STAGE_META: Record<

  FundingPipelineStage,

  { label: string; description: string }

> = {

  incubation: {

    label: "Incubation",

    description: "Early science programs vetted by MycoDAO stewards before public curation.",

  },

  curation: {

    label: "Curation",

    description: "Due diligence, milestones, and community review before auction opens.",

  },

  auction: {

    label: "Auction",

    description: "Treasury-weighted funding rounds — MYCO governance sets allocations.",

  },

  live: {

    label: "Live Funding",

    description: "Programs with an approved, active funding allocation.",

  },

};


