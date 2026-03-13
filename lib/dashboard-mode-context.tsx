"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import {
  MODULE_REGISTRY as INITIAL_REGISTRY,
  MODULE_DEFINITIONS,
  getModulesForRotatingSlots,
  type ModuleId,
  type ModuleMetadata,
} from "@/lib/dashboard-module-types";
import { selectEditorialCandidates } from "@/lib/dashboard-editorial";
import { packPlacements, type Placement } from "@/lib/dashboard-packing";

export type DashboardMode = 1 | 2 | 3;

type DashboardModeContextValue = {
  mode: DashboardMode;
  setMode: (m: DashboardMode) => void;
  moduleRegistry: Record<ModuleId, ModuleMetadata>;
  setModuleShown: (id: ModuleId) => void;
  getRotatingSlotIds: (slotCount: number) => ModuleId[];
  /** Adaptive packing: editorial selection + no-gap layout for Mode 2. */
  getPlacements: (availableWidth: number) => Placement[];
  focusModuleId: ModuleId | null; // Mode 3 expanded focus
  setFocusModuleId: (id: ModuleId | null) => void;
};

const DashboardModeContext = createContext<DashboardModeContextValue | null>(null);

function cloneRegistry(r: Record<ModuleId, ModuleMetadata>): Record<ModuleId, ModuleMetadata> {
  const out = {} as Record<ModuleId, ModuleMetadata>;
  (Object.keys(r) as ModuleId[]).forEach((id) => {
    out[id] = { ...r[id] };
  });
  return out;
}

export function DashboardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DashboardMode>(1);
  const [moduleRegistry, setModuleRegistry] = useState<Record<ModuleId, ModuleMetadata>>(() =>
    cloneRegistry(INITIAL_REGISTRY)
  );
  const [focusModuleId, setFocusModuleId] = useState<ModuleId | null>(null);

  const setMode = useCallback((m: DashboardMode) => {
    setModeState(m);
    if (m !== 3) setFocusModuleId(null);
  }, []);

  const setModuleShown = useCallback((id: ModuleId) => {
    const now = Math.floor(Date.now() / 1000);
    setModuleRegistry((prev) => {
      const next = cloneRegistry(prev);
      if (next[id]) next[id] = { ...next[id], lastShownAt: now };
      return next;
    });
  }, []);

  const getRotatingSlotIds = useCallback(
    (slotCount: number) => getModulesForRotatingSlots(moduleRegistry, slotCount),
    [moduleRegistry]
  );

  const getPlacements = useCallback(
    (availableWidth: number): Placement[] => {
      const candidates = selectEditorialCandidates({
        definitions: MODULE_DEFINITIONS,
        registry: moduleRegistry,
      });
      return packPlacements({
        candidateIds: candidates,
        definitions: MODULE_DEFINITIONS,
        totalWidth: availableWidth,
      });
    },
    [moduleRegistry]
  );

  const value = useMemo<DashboardModeContextValue>(
    () => ({
      mode,
      setMode,
      moduleRegistry,
      setModuleShown,
      getRotatingSlotIds,
      getPlacements,
      focusModuleId,
      setFocusModuleId,
    }),
    [mode, setMode, moduleRegistry, setModuleShown, getRotatingSlotIds, getPlacements, focusModuleId]
  );

  return (
    <DashboardModeContext.Provider value={value}>
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  const ctx = useContext(DashboardModeContext);
  if (!ctx) throw new Error("useDashboardMode must be used within DashboardModeProvider");
  return ctx;
}
