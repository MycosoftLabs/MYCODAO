/** Fallback on-air credits when producer API is unavailable. */



export interface BroadcastTalentEntry {

  name: string;

  roles: readonly string[];

  creditLine: string;

}



export const BLOCKS_BROADCAST_TALENT: readonly BroadcastTalentEntry[] = [

  {

    name: "Morgan Rockwell",

    roles: ["Founder & CEO", "News Anchor"] as const,

    creditLine: "Morgan Rockwell · Founder & CEO · News Anchor",

  },

] as const;


