import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listRulesForLocale } from "../src/rule-catalog.ts";
import { runLintApi, type FailOn, type LintTab } from "../src/run-lint.ts";
import type { Locale } from "../src/site-config.ts";
import type { DockerMode } from "../src/lint-docker.ts";
import type { LintFormatMode } from "../src/lint-json-yaml.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
function readVersion(): string {
  for (const name of ["service.package.json", "package.json"]) {
    try {
      const pkg = JSON.parse(
        readFileSync(join(__dirname, "..", name), "utf8"),
      ) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      /* try next */
    }
  }
  return "0.0.0";
}
const VERSION = readVersion();
const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const MAX_BODY = 512 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;

type RateBucket = { count: number; reset: number };
const rates = new Map<string, RateBucket>();

const TABS = new Set<LintTab>(["json-yaml", "docker", "k8s", "gitlab", "github"]);

function clientIp(req: http.IncomingMessage): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0]!.trim();
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  return req.socket.remoteAddress || "unknown";
}

function allowRate(ip: string): boolean {
  const now = Date.now();
  const bucket = rates.get(ip);
  if (!bucket || now > bucket.reset) {
    rates.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX) return false;
  bucket.count += 1;
  return true;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req: http.IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && /^[a-z]{2,3}$/.test(v);
}

const server = http.createServer(async (req, res) => {
  const ip = clientIp(req);
  if (!allowRate(ip)) {
    sendJson(res, 429, { error: "rate_limited" });
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "GET" && (path === "/health" || path === "/api/v1/health")) {
    sendJson(res, 200, { ok: true, version: VERSION });
    return;
  }

  if (req.method === "GET" && (path === "/rules" || path === "/api/v1/rules")) {
    const locale = isLocale(url.searchParams.get("locale"))
      ? (url.searchParams.get("locale") as Locale)
      : "en";
    const rules = listRulesForLocale(locale).map((r) => ({
      code: r.code,
      tab: r.tab,
      severity: r.severity,
      title: r.copy.title,
      why: r.copy.why,
      fix: r.copy.fix,
    }));
    sendJson(res, 200, { version: VERSION, locale, rules });
    return;
  }

  if (req.method === "POST" && (path === "/lint" || path === "/api/v1/lint")) {
    const started = Date.now();
    let raw: Buffer;
    try {
      raw = await readBody(req, MAX_BODY);
    } catch {
      sendJson(res, 413, { error: "body_too_large", maxBytes: MAX_BODY });
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return;
    }

    const tab = parsed.tab;
    if (typeof tab !== "string" || !TABS.has(tab as LintTab)) {
      sendJson(res, 400, { error: "invalid_tab", allowed: [...TABS] });
      return;
    }
    if (typeof parsed.text !== "string") {
      sendJson(res, 400, { error: "text_required" });
      return;
    }

    const locale = isLocale(parsed.locale) ? parsed.locale : "en";
    const failOn = (["error", "warning", "never"].includes(String(parsed.fail_on))
      ? parsed.fail_on
      : "error") as FailOn;
    const jsonMode = (["auto", "json", "yaml"].includes(String(parsed.mode))
      ? parsed.mode
      : "auto") as LintFormatMode;
    const dockerMode = (["auto", "dockerfile", "compose"].includes(String(parsed.mode))
      ? parsed.mode
      : "auto") as DockerMode;

    const { status, body } = runLintApi(tab as LintTab, parsed.text, {
      version: VERSION,
      locale,
      failOn,
      jsonMode: tab === "json-yaml" ? jsonMode : undefined,
      dockerMode: tab === "docker" ? dockerMode : undefined,
    });

    // Meta only — never log body text
    console.info(
      JSON.stringify({
        event: "lint",
        tab,
        bytes: Buffer.byteLength(parsed.text, "utf8"),
        issues: body.issues.length,
        ok: body.ok,
        ms: Date.now() - started,
        ip,
      }),
    );

    sendJson(res, status, body);
    return;
  }

  sendJson(res, 404, { error: "not_found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.info(JSON.stringify({ event: "listen", port: PORT, version: VERSION }));
});
