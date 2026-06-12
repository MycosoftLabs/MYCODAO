import { useCallback, useEffect, useState } from "react";
import { useProducerAuth } from "./useProducerAuth";
import { verifyTissueCurator } from "../lib/tissueApi";

/** Signed-in user who passes tissue curator / producer allowlist. */
export function useTissueCurator() {
  const auth = useProducerAuth();
  const [isCurator, setIsCurator] = useState(false);
  const [curatorChecking, setCuratorChecking] = useState(false);

  const refreshCurator = useCallback(async () => {
    if (!auth.isAuthenticated) {
      setIsCurator(false);
      return false;
    }
    setCuratorChecking(true);
    try {
      const ok = await verifyTissueCurator();
      setIsCurator(ok);
      return ok;
    } catch {
      setIsCurator(false);
      return false;
    } finally {
      setCuratorChecking(false);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    void refreshCurator();
  }, [refreshCurator, auth.accessToken]);

  return {
    ...auth,
    isCurator,
    curatorChecking,
    refreshCurator,
  };
}
