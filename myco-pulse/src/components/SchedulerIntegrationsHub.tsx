import React, { useState } from "react";
import { Bell, Cloud, Loader2, Radio, Save, Webhook } from "lucide-react";

import type { SchedulerIntegrationsDraft } from "./SchedulerIntegrationsSection";

export interface IntegrationsHubStatus {
  epg?: {
    now?: { label: string; slotId: string } | null;
    next?: { label: string; slotId: string } | null;
  };
  youtube?: Array<{ channelId: string; isLive: boolean; error?: string }>;
  obs?: { connected: boolean; currentScene?: string; error?: string };
  multistream?: { live: boolean; error?: string };
  nas?: { status?: { available: boolean; totalAssets: number }; proposals?: number };
  finnhub?: { marketHoursActive: boolean; priorityBoost: number };
  commercials?: { count: number; enabled: number };
  configured?: Record<string, boolean>;
}

interface SchedulerIntegrationsHubProps {
  integrations: SchedulerIntegrationsDraft;
  hubStatus: IntegrationsHubStatus | null;
  busy: boolean;
  disabled: boolean;
  onChangeIntegrations: (patch: SchedulerIntegrationsDraft) => void;
  onSave: () => Promise<void>;
  onHubAction: (action: string, extra?: Record<string, unknown>) => Promise<unknown>;
  onReloadHub: () => Promise<void>;
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 min-h-[44px] text-xs">
      <span className="text-white/70">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[#5eb3ff]"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">
        {label}
      </span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[44px] px-3 text-base bg-black/60 border border-white/15"
      />
    </label>
  );
}

export function SchedulerIntegrationsHub({
  integrations,
  hubStatus,
  busy,
  disabled,
  onChangeIntegrations,
  onSave,
  onHubAction,
  onReloadHub,
}: SchedulerIntegrationsHubProps) {
  const [localBusy, setLocalBusy] = useState(false);
  const locked = busy || localBusy || disabled;

  async function run(fn: () => Promise<void>) {
    setLocalBusy(true);
    try {
      await fn();
    } finally {
      setLocalBusy(false);
    }
  }

  async function runAction(action: string, extra?: Record<string, unknown>) {
    setLocalBusy(true);
    try {
      await onHubAction(action, extra);
      await onReloadHub();
    } finally {
      setLocalBusy(false);
    }
  }

  const cfg = hubStatus?.configured ?? {};

  return (
    <section
      className="border border-white/15 p-4 space-y-4 bg-black/40"
      aria-label="Extended scheduler integrations"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
          <Webhook className="size-4" />
          Integrations hub (local)
        </p>
        <button
          type="button"
          disabled={locked}
          onClick={() => void run(onReloadHub)}
          className="min-h-[44px] px-3 border border-white/20 text-[10px] font-black uppercase touch-manipulation"
        >
          Refresh status
        </button>
      </div>

      {hubStatus?.epg ? (
        <div className="border border-emerald-500/25 p-3 text-xs space-y-1">
          <p className="text-[9px] font-black uppercase text-emerald-400">EPG preview</p>
          <p>
            <span className="text-white/45">Now:</span>{" "}
            {hubStatus.epg.now?.label ?? "—"}
          </p>
          <p>
            <span className="text-white/45">Next:</span>{" "}
            {hubStatus.epg.next?.label ?? "—"}
          </p>
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3 border border-white/10 p-3">
          <p className="text-[9px] font-black uppercase text-[#5eb3ff] flex items-center gap-2">
            <Bell className="size-3.5" /> Notifications
          </p>
          <ToggleRow
            label="Enabled"
            checked={Boolean(integrations.notifications?.enabled)}
            disabled={locked}
            onChange={(enabled) =>
              onChangeIntegrations({
                notifications: { ...integrations.notifications, enabled },
              })
            }
          />
          <TextField
            label="Slack webhook URL"
            value={integrations.notifications?.slackWebhookUrl ?? ""}
            disabled={locked}
            onChange={(slackWebhookUrl) =>
              onChangeIntegrations({
                notifications: { ...integrations.notifications, slackWebhookUrl },
              })
            }
          />
          <TextField
            label="Discord webhook URL"
            value={integrations.notifications?.discordWebhookUrl ?? ""}
            disabled={locked}
            onChange={(discordWebhookUrl) =>
              onChangeIntegrations({
                notifications: { ...integrations.notifications, discordWebhookUrl },
              })
            }
          />
          <button
            type="button"
            disabled={locked}
            onClick={() =>
              void run(async () => {
                await onSave();
                await runAction("test_notifications");
              })
            }
            className="w-full min-h-[44px] border border-white/20 text-[10px] font-black uppercase touch-manipulation"
          >
            Test notifications
          </button>
        </div>

        <div className="space-y-3 border border-white/10 p-3">
          <p className="text-[9px] font-black uppercase text-[#5eb3ff] flex items-center gap-2">
            <Radio className="size-3.5" /> OBS WebSocket
          </p>
          <ToggleRow
            label="Enabled"
            checked={Boolean(integrations.obs?.enabled)}
            disabled={locked}
            onChange={(enabled) =>
              onChangeIntegrations({ obs: { ...integrations.obs, enabled } })
            }
          />
          <TextField
            label="Host"
            value={integrations.obs?.host ?? "127.0.0.1"}
            disabled={locked}
            onChange={(host) =>
              onChangeIntegrations({ obs: { ...integrations.obs, host } })
            }
          />
          <TextField
            label="Port"
            value={String(integrations.obs?.port ?? 4455)}
            disabled={locked}
            onChange={(v) =>
              onChangeIntegrations({
                obs: { ...integrations.obs, port: Number(v) || 4455 },
              })
            }
          />
          <p className="text-[10px] text-white/40">
            Status:{" "}
            {hubStatus?.obs?.connected ? (
              <span className="text-emerald-400">
                connected · {hubStatus.obs.currentScene ?? "—"}
              </span>
            ) : (
              <span className="text-red-300">
                {hubStatus?.obs?.error ?? "not connected"}
              </span>
            )}
          </p>
          <button
            type="button"
            disabled={locked}
            onClick={() =>
              void run(async () => {
                await onSave();
                await runAction("test_obs");
              })
            }
            className="w-full min-h-[44px] border border-white/20 text-[10px] font-black uppercase touch-manipulation"
          >
            Test OBS connection
          </button>
        </div>

        <div className="space-y-3 border border-white/10 p-3">
          <p className="text-[9px] font-black uppercase text-[#5eb3ff]">YouTube live</p>
          <ToggleRow
            label="Enabled"
            checked={Boolean(integrations.youtube?.enabled)}
            disabled={locked}
            onChange={(enabled) =>
              onChangeIntegrations({ youtube: { ...integrations.youtube, enabled } })
            }
          />
          <TextField
            label="Channel ID"
            value={integrations.youtube?.channelId ?? ""}
            disabled={locked}
            placeholder="UC…"
            onChange={(channelId) =>
              onChangeIntegrations({ youtube: { ...integrations.youtube, channelId } })
            }
          />
          {hubStatus?.youtube?.length ? (
            <ul className="text-[10px] text-white/50 space-y-1">
              {hubStatus.youtube.map((y) => (
                <li key={y.channelId}>
                  {y.channelId}:{" "}
                  {y.isLive ? (
                    <span className="text-red-400">LIVE</span>
                  ) : (
                    "offline"
                  )}
                  {y.error ? ` · ${y.error}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-3 border border-white/10 p-3">
          <p className="text-[9px] font-black uppercase text-[#5eb3ff]">NAS ingest</p>
          <ToggleRow
            label="Enabled"
            checked={Boolean(integrations.nasIngest?.enabled)}
            disabled={locked}
            onChange={(enabled) =>
              onChangeIntegrations({
                nasIngest: { ...integrations.nasIngest, enabled },
              })
            }
          />
          <p className="text-[10px] text-white/45">
            NAS:{" "}
            {hubStatus?.nas?.status?.available ? (
              <span className="text-emerald-400">
                {hubStatus.nas.status.totalAssets} assets
              </span>
            ) : (
              "unavailable locally"
            )}
            {typeof hubStatus?.nas?.proposals === "number"
              ? ` · ${hubStatus.nas.proposals} new slot proposals`
              : ""}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                void run(async () => {
                  await onSave();
                  await runAction("nas_ingest_preview");
                })
              }
              className="flex-1 min-h-[44px] border border-white/20 text-[10px] font-black uppercase touch-manipulation"
            >
              Preview ingest
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                void run(async () => {
                  await onSave();
                  await runAction("nas_ingest_apply");
                })
              }
              className="flex-1 min-h-[44px] border border-[#5eb3ff]/40 text-[10px] font-black uppercase touch-manipulation"
            >
              Apply ingest
            </button>
          </div>
        </div>

        <div className="space-y-3 border border-white/10 p-3">
          <p className="text-[9px] font-black uppercase text-[#5eb3ff]">MAS / webhooks</p>
          <ToggleRow
            label="MAS webhook"
            checked={Boolean(integrations.mas?.enabled)}
            disabled={locked}
            onChange={(enabled) =>
              onChangeIntegrations({ mas: { ...integrations.mas, enabled } })
            }
          />
          <TextField
            label="MAS webhook URL"
            value={integrations.mas?.webhookUrl ?? ""}
            disabled={locked}
            placeholder="http://192.168.0.188:8001/api/webhooks/…"
            onChange={(webhookUrl) =>
              onChangeIntegrations({ mas: { ...integrations.mas, webhookUrl } })
            }
          />
          <ToggleRow
            label="Outbound webhooks"
            checked={Boolean(integrations.webhookOut?.enabled)}
            disabled={locked}
            onChange={(enabled) =>
              onChangeIntegrations({
                webhookOut: { ...integrations.webhookOut, enabled },
              })
            }
          />
          <TextField
            label="Webhook URLs (comma-separated)"
            value={(integrations.webhookOut?.urls ?? []).join(", ")}
            disabled={locked}
            onChange={(raw) =>
              onChangeIntegrations({
                webhookOut: {
                  ...integrations.webhookOut,
                  urls: raw.split(",").map((u) => u.trim()).filter(Boolean),
                },
              })
            }
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                void run(async () => {
                  await onSave();
                  await runAction("test_mas");
                })
              }
              className="flex-1 min-h-[44px] border border-white/20 text-[10px] font-black uppercase touch-manipulation"
            >
              Test MAS
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                void run(async () => {
                  await onSave();
                  await runAction("test_webhook_out");
                })
              }
              className="flex-1 min-h-[44px] border border-white/20 text-[10px] font-black uppercase touch-manipulation"
            >
              Test webhooks
            </button>
          </div>
        </div>

        <div className="space-y-3 border border-white/10 p-3">
          <p className="text-[9px] font-black uppercase text-[#5eb3ff] flex items-center gap-2">
            <Cloud className="size-3.5" /> Finnhub / Cloudflare / audit
          </p>
          <ToggleRow
            label="Finnhub markets boost"
            checked={Boolean(integrations.finnhub?.enabled)}
            disabled={locked}
            onChange={(enabled) =>
              onChangeIntegrations({ finnhub: { ...integrations.finnhub, enabled } })
            }
          />
          {hubStatus?.finnhub ? (
            <p className="text-[10px] text-white/45">
              Market hours:{" "}
              {hubStatus.finnhub.marketHoursActive ? "active" : "closed"} · boost +
              {hubStatus.finnhub.priorityBoost}
            </p>
          ) : null}
          <ToggleRow
            label="Cloudflare purge on save"
            checked={Boolean(integrations.cloudflare?.purgeOnScheduleSave)}
            disabled={locked}
            onChange={(purgeOnScheduleSave) =>
              onChangeIntegrations({
                cloudflare: {
                  ...integrations.cloudflare,
                  enabled: integrations.cloudflare?.enabled ?? true,
                  purgeOnScheduleSave,
                },
              })
            }
          />
          <ToggleRow
            label="Supabase audit log"
            checked={Boolean(integrations.supabaseAudit?.enabled)}
            disabled={locked}
            onChange={(enabled) =>
              onChangeIntegrations({
                supabaseAudit: { ...integrations.supabaseAudit, enabled },
              })
            }
          />
          <p className="text-[10px] text-white/35">
            Commercial library: {hubStatus?.commercials?.count ?? 0} entries (
            {hubStatus?.commercials?.enabled ?? 0} enabled)
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[9px] text-white/35 uppercase tracking-widest">
        {Object.entries(cfg).map(([k, v]) => (
          <span key={k} className={v ? "text-emerald-400/80" : "text-white/25"}>
            {k}
          </span>
        ))}
      </div>

      <button
        type="button"
        disabled={locked}
        onClick={() => void run(onSave)}
        className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[#5eb3ff] text-black text-[10px] font-black uppercase tracking-widest touch-manipulation disabled:opacity-50"
      >
        {localBusy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save all integration settings
      </button>
    </section>
  );
}
