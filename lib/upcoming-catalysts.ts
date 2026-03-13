/**
 * Upcoming catalysts that may affect markets.
 * Used by Calendar/Events module; Phase 2 can back with API.
 */

export type CatalystImportance = "high" | "medium" | "low";

export type UpcomingCatalyst = {
  date: string;
  label: string;
  time: string;
  importance: CatalystImportance;
  relatedSymbols?: string[];
  catalystType?: string;
};

const MOCK_UPCOMING: UpcomingCatalyst[] = [
  { date: "Feb 18", label: "CPI Release", time: "8:30 ET", importance: "high", relatedSymbols: ["SPY", "DXY", "GOLD"], catalystType: "macro" },
  { date: "Feb 20", label: "FOMC Minutes", time: "2:00 ET", importance: "high", relatedSymbols: ["SPY", "DXY"], catalystType: "macro" },
  { date: "Feb 21", label: "NVDA Earnings", time: "4:00 ET", importance: "high", relatedSymbols: ["NVDA"], catalystType: "earnings" },
  { date: "Feb 24", label: "PCE Inflation", time: "8:30 ET", importance: "high", relatedSymbols: ["SPY", "DXY"], catalystType: "macro" },
  { date: "Feb 26", label: "Fed Speaker", time: "10:00 ET", importance: "medium", relatedSymbols: ["DXY", "SPY"], catalystType: "macro" },
  { date: "Mar 1", label: "ISM Mfg", time: "10:00 ET", importance: "medium", relatedSymbols: ["SPY"], catalystType: "macro" },
  { date: "Mar 3", label: "Ethereum upgrade", time: "TBD", importance: "medium", relatedSymbols: ["ETH"], catalystType: "network activity" },
  { date: "Mar 5", label: "MYCO proposal vote", time: "12:00 UTC", importance: "high", relatedSymbols: ["MYCO"], catalystType: "proposal" },
];

export function getUpcomingCatalysts(): UpcomingCatalyst[] {
  return [...MOCK_UPCOMING];
}
