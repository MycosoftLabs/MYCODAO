import React, { createContext, useContext } from "react";
import { useNewsProgramState } from "../hooks/useNewsProgram";

export type NewsProgramContextValue = ReturnType<typeof useNewsProgramState>;

const NewsProgramContext = createContext<NewsProgramContextValue | null>(null);

/** Single program poll shared across tab switches so News remounts with data immediately. */
export function NewsProgramProvider({ children }: { children: React.ReactNode }) {
  const value = useNewsProgramState();
  return (
    <NewsProgramContext.Provider value={value}>
      {children}
    </NewsProgramContext.Provider>
  );
}

export function useNewsProgram(): NewsProgramContextValue {
  const ctx = useContext(NewsProgramContext);
  if (!ctx) {
    throw new Error("useNewsProgram must be used within NewsProgramProvider");
  }
  return ctx;
}
