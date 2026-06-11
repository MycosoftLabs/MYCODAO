import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { CommercialLibraryEntry } from "@/lib/server/blocks-scheduler-types";

const LIB_PATH = path.join(process.cwd(), "data", "commercial-library.json");

function ensureFile(): CommercialLibraryEntry[] {
  const dir = path.dirname(LIB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LIB_PATH)) {
    fs.writeFileSync(LIB_PATH, "[]\n", "utf8");
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LIB_PATH, "utf8")) as CommercialLibraryEntry[];
  } catch {
    return [];
  }
}

export function listCommercialLibrary(): CommercialLibraryEntry[] {
  return ensureFile();
}

export function upsertCommercialEntry(
  input: Omit<CommercialLibraryEntry, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): CommercialLibraryEntry {
  const all = ensureFile();
  const now = new Date().toISOString();
  const id = input.id?.trim() || randomUUID();
  const existingIdx = all.findIndex((e) => e.id === id);
  const entry: CommercialLibraryEntry = {
    id,
    sponsor: input.sponsor.trim(),
    label: input.label.trim(),
    nasPath: input.nasPath.trim(),
    durationSeconds: Math.max(1, input.durationSeconds),
    clickThroughUrl: input.clickThroughUrl?.trim(),
    enabled: input.enabled !== false,
    tags: input.tags ?? [],
    createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : now,
    updatedAt: now,
  };
  if (existingIdx >= 0) all[existingIdx] = entry;
  else all.push(entry);
  fs.writeFileSync(LIB_PATH, `${JSON.stringify(all, null, 2)}\n`, "utf8");
  return entry;
}

export function deleteCommercialEntry(id: string): boolean {
  const all = ensureFile();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  fs.writeFileSync(LIB_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return true;
}

export function enabledCommercials(): CommercialLibraryEntry[] {
  return listCommercialLibrary().filter((e) => e.enabled && e.nasPath);
}
