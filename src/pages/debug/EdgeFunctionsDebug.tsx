import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { appEnv } from "@/config/env";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LogEntry = {
  time: string;
  level: "info" | "error";
  message: string;
  context?: Record<string, unknown>;
};

// Accept log entries without time; time is added when pushing.
type NewLogEntry = Omit<LogEntry, "time">;

const now = () => new Date().toISOString();

export default function EdgeFunctionsDebug() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [provider, setProvider] = useState<"suno" | "replicate">("suno");

  const pushLog = (entry: NewLogEntry) => setLogs((prev) => [{ ...entry, time: now() }, ...prev].slice(0, 200));

  const getNetworkEndpoint = (fn: string) => `${appEnv.supabaseUrl}/functions/v1/${fn}`;

  const pingUnauthFunction = async () => {
    const fn = "suno-callback"; // verify_jwt = false
    const endpoint = getNetworkEndpoint(fn);
    pushLog({ level: "info", message: "Calling unauth function", context: { endpoint, fn } });
    try {
      const { data, error } = await SupabaseFunctions.invoke(fn, {
        body: { ping: true },
      });
      if (error) {
        pushLog({ level: "error", message: "Unauth function error", context: { error: error.message } });
      } else {
        pushLog({ level: "info", message: "Unauth function response", context: { data } });
      }
    } catch (e) {
      pushLog({ level: "error", message: "Unauth function threw", context: { error: e instanceof Error ? e.message : String(e) } });
    }
  };

  const invokeGetBalance = async () => {
    const fn = "get-balance"; // verify_jwt = true
    const endpoint = getNetworkEndpoint(fn);
    pushLog({ level: "info", message: "Invoking get-balance", context: { endpoint, fn, provider } });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        pushLog({ level: "error", message: "No session – auth required", context: { hint: "Sign in before calling verify_jwt functions" } });
        return;
      }

      const { data, error } = await SupabaseFunctions.invoke(fn, {
        body: { provider },
      });
      if (error) {
        pushLog({ level: "error", message: "get-balance error", context: { error: error.message } });
      } else {
        pushLog({ level: "info", message: "get-balance response", context: { data } });
      }
    } catch (e) {
      pushLog({ level: "error", message: "get-balance threw", context: { error: e instanceof Error ? e.message : String(e) } });
    }
  };

  const simulateExternalGet401 = async () => {
    const fn = "get-balance";
    const endpoint = `${getNetworkEndpoint(fn)}?provider=${provider}`;
    pushLog({ level: "info", message: "Simulating external GET to get-balance (no Authorization)", context: { endpoint, fn, provider } });
    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          // apikey is typically required; omit Authorization intentionally
          apikey: appEnv.supabaseAnonKey,
          "Content-Type": "application/json",
        },
      });
      const text = await res.text();
      pushLog({ level: res.ok ? "info" : "error", message: `GET ${res.status}`, context: { body: text?.slice(0, 500) } });
    } catch (e) {
      pushLog({ level: "error", message: "External GET threw", context: { error: e instanceof Error ? e.message : String(e) } });
    }
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edge-functions-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Диагностика Edge Functions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Supabase URL</Label>
              <Input value={appEnv.supabaseUrl} readOnly />
            </div>
            <div>
              <Label>Environment</Label>
              <Input value={appEnv.appEnv ?? "development"} readOnly />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={pingUnauthFunction} variant="secondary">Пинг (suno-callback)</Button>
            <select
              className="border rounded px-2 py-1"
              value={provider}
              onChange={(e) => setProvider(e.target.value as "suno" | "replicate")}
            >
              <option value="suno">suno</option>
              <option value="replicate">replicate</option>
            </select>
            <Button onClick={invokeGetBalance}>Проверить баланс (auth)</Button>
            <Button onClick={simulateExternalGet401} variant="destructive">Симулировать GET 401</Button>
            <Button onClick={exportLogs} variant="outline">Экспорт логов</Button>
          </div>

          <div className="mt-4">
            <Label>Логи (последние)</Label>
            <div className="text-sm bg-muted rounded p-3 max-h-[400px] overflow-auto">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">Логи появятся здесь после запросов.</div>
              ) : (
                <pre>{JSON.stringify(logs, null, 2)}</pre>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}