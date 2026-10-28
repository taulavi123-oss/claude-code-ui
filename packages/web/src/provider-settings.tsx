// Settings › Provider: opt-in Anthropic-compatible API mode. The key is write-only (secrets.json); this page only learns
// whether one is saved. Subscription and env modes keep the previous behavior.
import { useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import type { ProviderTestResult, Settings, SettingsPatch, SettingsResult } from "@claude-ui/protocol";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Request } from "./client.ts";
import { isImeKey } from "./ime.ts";

type Props = {
  provider: Settings["provider"];
  keySet: boolean;
  saving: boolean;
  save: (patch: SettingsPatch, field?: string) => Promise<void>;
  request: <T>(m: Request) => Promise<T>;
  onResult: (r: SettingsResult) => void;
  onError: (message: string) => void;
};

const INPUT = "h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-11";
const ROW = "flex flex-col gap-1 border-t py-2";

export function ProviderSection({ provider, keySet, saving, save, request, onResult, onError }: Props) {
  const [draft, setDraft] = useState<Partial<Record<"baseUrl" | "model" | "models" | "contextWindow" | "maxOutputTokens", string>>>({});
  const [replacing, setReplacing] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; text: string }>();
  const api = provider.mode === "api";

  const commit = (k: "baseUrl" | "model" | "models") => {
    const v = draft[k];
    if (v === undefined) return;
    setTest(undefined);
    void save({ provider: { [k]: v.trim() } as never }).then(() => setDraft(({ [k]: _, ...rest }) => rest));
  };
  const commitNumber = (k: "contextWindow" | "maxOutputTokens") => {
    const v = draft[k];
    if (v === undefined) return;
    const n = Number(v);
    if (!Number.isInteger(n)) return;
    setTest(undefined);
    void save({ provider: { [k]: n } as never }).then(() => setDraft(({ [k]: _, ...rest }) => rest));
  };
  const field = (k: "baseUrl" | "model" | "models", label: string, hint: string, placeholder?: string) => (
    <label className={ROW}>
      <span className="text-sm">{label}</span>
      <input
        type="text"
        value={draft[k] ?? provider[k] ?? ""}
        placeholder={placeholder}
        onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
        onBlur={() => commit(k)}
        onKeyDown={(e) => e.key === "Enter" && !isImeKey(e.nativeEvent) && e.currentTarget.blur()}
        disabled={saving}
        className={INPUT}
        aria-describedby={`settings-provider-${k}-hint`}
        data-testid={`settings-provider-${k}`}
      />
      <span id={`settings-provider-${k}-hint`} className="text-muted-foreground text-xs">
        {hint}
      </span>
    </label>
  );
  const numberField = (k: "contextWindow" | "maxOutputTokens", label: string, hint: string) => (
    <label className={ROW}>
      <span className="text-sm">{label}</span>
      <input
        type="number"
        min={k === "contextWindow" ? 1000 : 256}
        max={k === "contextWindow" ? 2000000 : 1000000}
        value={draft[k] ?? String(provider[k])}
        onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
        onBlur={() => commitNumber(k)}
        onKeyDown={(e) => e.key === "Enter" && !isImeKey(e.nativeEvent) && e.currentTarget.blur()}
        disabled={saving}
        className={INPUT}
        aria-describedby={`settings-provider-${k}-hint`}
        data-testid={`settings-provider-${k}`}
      />
      <span id={`settings-provider-${k}-hint`} className="text-muted-foreground text-xs">
        {hint}
      </span>
    </label>
  );

  const setTokenTo = async (value: string | null) => {
    setBusy(true);
    setTest(undefined);
    try {
      onResult(await request<SettingsResult>({ type: "provider.token", token: value }));
      setReplacing(false);
      setToken("");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const testConnection = async () => {
    setBusy(true);
    setTest(undefined);
    try {
      const r = await request<ProviderTestResult>({ type: "provider.test" });
      setTest({ ok: true, text: `${r.model} answered in ${r.latencyMs} ms` });
    } catch (e) {
      setTest({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="settings-provider" className="flex flex-col" data-testid="settings-provider">
      <h3 id="settings-provider" className="pb-1 font-medium text-[13px] text-muted-foreground">
        Provider
      </h3>
      <div className={ROW}>
        <span className="text-sm">Mode</span>
        <Select value={provider.mode} onValueChange={(v) => v && void save({ provider: { mode: v as Settings["provider"]["mode"] } })}>
          <SelectTrigger aria-label="Provider mode" data-testid="settings-provider-mode" className="w-full max-md:h-11">
            <SelectValue>{(v: Settings["provider"]["mode"]) => v === "api" ? "Custom API" : v === "subscription" ? "Claude subscription" : "From environment"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="env">From environment</SelectItem>
            <SelectItem value="subscription">Claude subscription</SelectItem>
            <SelectItem value="api">Custom Anthropic-compatible API</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-xs">
          From environment keeps whatever the launcher exported. Subscription strips inherited API keys. Custom API uses the endpoint and key below.
        </span>
      </div>
      {api && (
        <>
          {field("baseUrl", "Base URL", "Anthropic Messages API base, for example https://gateway.example (no /v1 suffix).", "https://gateway.example")}
          {field("model", "Default model", "The model id sent to the gateway, including any vendor prefix.", "vendor/model")}
          {field("models", "Model list", "Optional comma-separated ids for the model picker. Empty: the default model.", "vendor/model, vendor/model-fast")}
          {numberField("contextWindow", "Context window (tokens)", "Exposed to the UI and passed to Claude Code as its context limit.")}
          {numberField("maxOutputTokens", "Maximum output tokens", "Passed to Claude Code as the output cap for most requests.")}
          <div className={ROW}>
            <span id="settings-provider-token-label" className="text-sm">API key</span>
            {keySet && !replacing ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 text-sm" data-testid="settings-provider-token-set">Key set</span>
                <Button variant="outline" size="sm" className="cursor-pointer max-md:h-11" disabled={busy} onClick={() => setReplacing(true)} data-testid="settings-provider-token-replace">Replace</Button>
                <Button variant="destructive" size="sm" className="cursor-pointer max-md:h-11" disabled={busy} onClick={() => void setTokenTo(null)} data-testid="settings-provider-token-clear">Clear</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isImeKey(e.nativeEvent) && token.trim() && void setTokenTo(token.trim())}
                  aria-labelledby="settings-provider-token-label"
                  aria-describedby="settings-provider-token-hint"
                  className={INPUT}
                  data-testid="settings-provider-token"
                />
                <Button size="sm" className="cursor-pointer max-md:h-11" disabled={busy || !token.trim()} onClick={() => void setTokenTo(token.trim())} data-testid="settings-provider-token-save">Save</Button>
                {replacing && (
                  <Button variant="ghost" size="sm" className="cursor-pointer max-md:h-11" onClick={() => (setReplacing(false), setToken(""))} data-testid="settings-provider-token-cancel">Cancel</Button>
                )}
              </div>
            )}
            <span id="settings-provider-token-hint" className="text-muted-foreground text-xs">
              Saved on the daemon's computer only (secrets.json), never sent to a browser or written to logs.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t py-2">
            <Button variant="outline" size="sm" className="cursor-pointer max-md:h-11" disabled={busy || !provider.baseUrl || !provider.model || !keySet} onClick={() => void testConnection()} data-testid="settings-provider-test">
              {busy && <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" aria-hidden />}
              Test connection
            </Button>
            {test && (
              <span role={test.ok ? "status" : "alert"} className={`min-w-0 flex-1 text-sm ${test.ok ? "" : "text-destructive"}`} data-testid="settings-provider-test-result">
                {test.text}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
