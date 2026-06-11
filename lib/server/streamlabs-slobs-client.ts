import type {
  StreamlabsSceneInfo,
  StreamlabsStatus,
} from "@/lib/server/blocks-scheduler-types";

type JsonRpcResult = {
  id?: number;
  result?: unknown;
  error?: { message?: string };
};

let lastRpcId = 0;

function nextId(): number {
  lastRpcId += 1;
  return lastRpcId;
}

function sockJsUrl(apiUrl: string): string {
  const base = apiUrl.trim().replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

async function slobsRpc(
  apiUrl: string,
  token: string,
  resource: string,
  method: string,
  args: unknown[] = [],
): Promise<unknown> {
  const { default: SockJS } = await import("sockjs-client");

  return new Promise((resolve, reject) => {
    const socket = new SockJS(sockJsUrl(apiUrl));
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Streamlabs connection timed out"));
    }, 8000);

    let authed = false;

    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as JsonRpcResult;
        if (!authed && data.result !== undefined) {
          authed = true;
          socket.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: nextId(),
              method,
              params: { resource, args },
            }),
          );
          return;
        }
        if (data.error) {
          clearTimeout(timeout);
          socket.close();
          reject(new Error(data.error.message ?? "Streamlabs RPC error"));
          return;
        }
        if (data.result !== undefined) {
          clearTimeout(timeout);
          socket.close();
          resolve(data.result);
        }
      } catch (e) {
        clearTimeout(timeout);
        socket.close();
        reject(e);
      }
    };

    socket.onclose = () => {
      if (!authed) {
        clearTimeout(timeout);
        reject(new Error("Streamlabs connection closed before auth"));
      }
    };

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: nextId(),
          method: "auth",
          params: {
            resource: "TcpServerService",
            args: [token],
          },
        }),
      );
    };
  });
}

function parseScenes(raw: unknown): StreamlabsSceneInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const row = s as { id?: string; name?: string };
      if (!row.id || !row.name) return null;
      return { id: row.id, name: row.name };
    })
    .filter((x): x is StreamlabsSceneInfo => x !== null);
}

export async function fetchStreamlabsStatus(
  apiUrl: string | undefined,
  token: string | undefined,
): Promise<StreamlabsStatus> {
  const empty: StreamlabsStatus = {
    configured: Boolean(apiUrl?.trim() && token?.trim()),
    connected: false,
    live: false,
    activeSceneId: null,
    activeSceneName: null,
    scenes: [],
  };

  if (!apiUrl?.trim() || !token?.trim()) {
    return { ...empty, error: "Streamlabs Remote API URL and token not configured" };
  }

  try {
    const scenesRaw = await slobsRpc(
      apiUrl.trim(),
      token.trim(),
      "ScenesService",
      "getScenes",
    );
    const scenes = parseScenes(scenesRaw);

    let activeSceneId: string | null = null;
    let activeSceneName: string | null = null;
    try {
      const activeRaw = await slobsRpc(
        apiUrl.trim(),
        token.trim(),
        "ScenesService",
        "getActiveScene",
      );
      const active = activeRaw as { id?: string; name?: string } | null;
      activeSceneId = active?.id ?? null;
      activeSceneName = active?.name ?? null;
    } catch {
      /* optional */
    }

    let live = false;
    try {
      const streamingRaw = await slobsRpc(
        apiUrl.trim(),
        token.trim(),
        "StreamingService",
        "isStreaming",
      );
      live = Boolean(streamingRaw);
    } catch {
      /* optional */
    }

    return {
      configured: true,
      connected: true,
      live,
      activeSceneId,
      activeSceneName,
      scenes,
    };
  } catch (e) {
    return {
      ...empty,
      error: e instanceof Error ? e.message : "Streamlabs connection failed",
    };
  }
}

export async function switchStreamlabsScene(
  apiUrl: string,
  token: string,
  sceneId: string,
): Promise<void> {
  await slobsRpc(apiUrl.trim(), token.trim(), "ScenesService", "makeSceneActive", [
    sceneId,
  ]);
}
