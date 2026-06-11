import { createHash } from "crypto";
import type { ObsIntegrationConfig } from "@/lib/server/blocks-scheduler-types";

export interface ObsConnectionStatus {
  connected: boolean;
  host: string;
  port: number;
  currentScene?: string;
  scenes?: string[];
  error?: string;
  checkedAt: string;
}

type ObsMessage = {
  op: number;
  d?: Record<string, unknown>;
};

/** Minimal OBS WebSocket 5.x client (no extra npm deps). */
async function obsRpc(
  host: string,
  port: number,
  password: string,
  requestType: string,
  requestData?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { WebSocket: NodeWebSocket } = await import("ws");
  const WebSocketImpl =
    typeof WebSocket !== "undefined" ? WebSocket : NodeWebSocket;

  return new Promise((resolve, reject) => {
    const ws = new WebSocketImpl(`ws://${host}:${port}`) as WebSocket & {
      on?: (event: string, cb: (...args: unknown[]) => void) => void;
      send: (data: string) => void;
      close: () => void;
    };
    let authed = false;
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("OBS WebSocket timeout"));
    }, 8_000);

    const onMessage = (raw: string | Buffer) => {
      const text = typeof raw === "string" ? raw : raw.toString("utf8");
      let msg: ObsMessage;
      try {
        msg = JSON.parse(text) as ObsMessage;
      } catch {
        return;
      }

      if (msg.op === 0 && msg.d?.eventType === "Hello") {
        const authRequired = Boolean(msg.d.authentication);
        const payload: Record<string, unknown> = {
          op: 1,
          d: { rpcVersion: 1, eventSubscriptions: 0 },
        };
        if (authRequired && password) {
          const authPayload = msg.d.authentication as
            | { salt?: string; challenge?: string }
            | undefined;
          const salt = String(authPayload?.salt ?? "");
          const challenge = String(authPayload?.challenge ?? "");
          const secret = createHash("sha256")
            .update(password + salt)
            .digest("base64");
          const auth = createHash("sha256")
            .update(secret + challenge)
            .digest("base64");
          (payload.d as Record<string, unknown>).authentication = auth;
        }
        ws.send(JSON.stringify(payload));
        return;
      }

      if (msg.op === 2) {
        authed = true;
        ws.send(
          JSON.stringify({
            op: 6,
            d: {
              requestType,
              requestId: "blocks-1",
              requestData: requestData ?? {},
            },
          }),
        );
        return;
      }

      if (msg.op === 7 && msg.d?.requestType === requestType) {
        clearTimeout(timeout);
        ws.close();
        if (
          msg.d.requestStatus &&
          (msg.d.requestStatus as { result: boolean }).result === false
        ) {
          reject(
            new Error(
              String(
                (msg.d.requestStatus as { comment?: string }).comment ??
                  "OBS request failed",
              ),
            ),
          );
          return;
        }
        resolve((msg.d.responseData as Record<string, unknown>) ?? {});
      }
    };

    if (typeof ws.on === "function") {
      ws.on("message", (data: unknown) => {
        onMessage(data as string | Buffer);
      });
      ws.on("error", () => {
        clearTimeout(timeout);
        reject(new Error("OBS WebSocket connection error"));
      });
    } else {
      ws.addEventListener("message", (ev: MessageEvent) => {
        onMessage(ev.data as string);
      });
      ws.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("OBS WebSocket connection error"));
      });
    }
  });
}

export function obsConfigResolved(
  cfg: ObsIntegrationConfig | undefined,
): { host: string; port: number; password: string } | null {
  if (!cfg?.enabled) return null;
  const host =
    cfg.host?.trim() ||
    process.env.OBS_WEBSOCKET_HOST?.trim() ||
    "127.0.0.1";
  const port =
    cfg.port ??
    Number(process.env.OBS_WEBSOCKET_PORT ?? "4455") ??
    4455;
  const password =
    cfg.password?.trim() ||
    process.env.OBS_WEBSOCKET_PASSWORD?.trim() ||
    "";
  return { host, port, password };
}

export async function getObsStatus(
  cfg: ObsIntegrationConfig | undefined,
): Promise<ObsConnectionStatus> {
  const resolved = obsConfigResolved(cfg);
  const checkedAt = new Date().toISOString();
  if (!resolved) {
    return {
      connected: false,
      host: "127.0.0.1",
      port: 4455,
      checkedAt,
      error: "OBS integration disabled",
    };
  }

  try {
    const sceneList = await obsRpc(
      resolved.host,
      resolved.port,
      resolved.password,
      "GetSceneList",
    );
    const scenes = (sceneList.scenes as Array<{ sceneName?: string }> | undefined)?.map(
      (s) => s.sceneName ?? "",
    ).filter(Boolean);
    const current = String(sceneList.currentProgramSceneName ?? "");
    return {
      connected: true,
      host: resolved.host,
      port: resolved.port,
      currentScene: current || undefined,
      scenes,
      checkedAt,
    };
  } catch (e) {
    return {
      connected: false,
      host: resolved.host,
      port: resolved.port,
      checkedAt,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function switchObsScene(
  cfg: ObsIntegrationConfig | undefined,
  sceneName: string,
): Promise<void> {
  const resolved = obsConfigResolved(cfg);
  if (!resolved) return;
  const name = sceneName.trim();
  if (!name) return;
  await obsRpc(resolved.host, resolved.port, resolved.password, "SetCurrentProgramScene", {
    sceneName: name,
  });
}

export function resolveObsSceneForSlot(
  cfg: ObsIntegrationConfig | undefined,
  slot: { id: string; type?: string },
): string | null {
  if (!cfg?.enabled) return null;
  const byId = cfg.sceneBySlotId?.[slot.id]?.trim();
  if (byId) return byId;
  const t = slot.type?.trim();
  if (t && cfg.sceneBySlotType?.[t]?.trim()) {
    return cfg.sceneBySlotType[t].trim();
  }
  return null;
}
