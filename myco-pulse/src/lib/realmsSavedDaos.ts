const STORAGE_KEY = "pulse-realms-saved-daos";

export type SavedRealmDao = {
  publicKey: string;
  name: string;
  logoUrl?: string;
  symbol?: string;
  savedAt: string;
};

export function loadSavedRealmsDaos(): SavedRealmDao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedRealmDao[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRealmDao(dao: {
  publicKey: string;
  name: string;
  logoUrl?: string;
  symbol?: string;
}): SavedRealmDao[] {
  const existing = loadSavedRealmsDaos();
  if (existing.some((d) => d.publicKey === dao.publicKey)) return existing;
  const next = [
    {
      publicKey: dao.publicKey,
      name: dao.name,
      logoUrl: dao.logoUrl,
      symbol: dao.symbol,
      savedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeSavedRealmDao(publicKey: string): SavedRealmDao[] {
  const next = loadSavedRealmsDaos().filter((d) => d.publicKey !== publicKey);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function isRealmDaoSaved(publicKey: string): boolean {
  return loadSavedRealmsDaos().some((d) => d.publicKey === publicKey);
}
