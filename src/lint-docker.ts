import {
  dumpYamlDocs,
  emptyResult,
  finalize,
  isRecord,
  lineOfMatch,
  loadYamlDocs,
  makeId,
  stripBom,
  withBom,
  type LintIssue,
  type LintResult,
} from "./lint-shared";
import { findYamlTraps } from "./yaml-traps";

export type DockerMode = "auto" | "dockerfile" | "compose";

function looksLikeCompose(text: string): boolean {
  return /^\s*(services|version|networks|volumes|configs|secrets)\s*:/m.test(text);
}

function looksLikeDockerfile(text: string): boolean {
  return /^\s*(FROM|ARG|ENV|RUN|COPY|ADD|WORKDIR|CMD|ENTRYPOINT|EXPOSE|USER|LABEL)\b/im.test(
    text,
  );
}

function lintDockerfile(raw: string, nextId: () => number): LintResult {
  const issues: LintIssue[] = [];
  const lines = raw.split(/\r?\n/);
  let hasFrom = false;
  let lastUser: string | null = null;
  let aptWithoutClean = false;
  let hasHealthcheck = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const rawLine = lines[i]!;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const instr = trimmed.match(/^([A-Za-z]+)\b/);
    const name = instr?.[1]?.toUpperCase() ?? "";

    if (name === "FROM") {
      hasFrom = true;
      const imageTok = trimmed.replace(/^FROM\s+/i, "").split(/\s+/)[0] ?? "";
      const image = imageTok.replace(/^--platform=\S+\s+/i, "").split(/\s+/)[0] ?? imageTok;
      if (/:latest\b/i.test(image) || (!image.includes(":") && !image.startsWith("scratch"))) {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "dfLatestTag",
          line: lineNo,
        });
      }
    }

    if (name === "ADD") {
      const args = trimmed.slice(3).trim();
      if (!/^https?:\/\//i.test(args.split(/\s+/)[0] ?? "")) {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "dfPreferCopy",
          line: lineNo,
        });
      }
    }

    if (name === "RUN") {
      const body = trimmed.slice(3);
      if (/curl\s+.*\|\s*(?:ba)?sh/i.test(body) || /wget\s+.*\|\s*(?:ba)?sh/i.test(body)) {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "dfPipeShell",
          line: lineNo,
        });
      }
      if (/\bapt-get\s+install\b/i.test(body) && !/rm\s+-rf\s+\/var\/lib\/apt\/lists/i.test(body)) {
        aptWithoutClean = true;
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "dfAptClean",
          line: lineNo,
        });
      }
      if (/\bcd\s+\S+/i.test(body) && !/&&/.test(body)) {
        issues.push({
          id: nextId(),
          severity: "info",
          code: "dfUseWorkdir",
          line: lineNo,
        });
      }
    }

    if (name === "USER") {
      lastUser = trimmed.slice(4).trim();
    }

    if (name === "HEALTHCHECK") {
      hasHealthcheck = true;
    }

    if (name === "ENV" || name === "ARG") {
      if (/(PASSWORD|SECRET|TOKEN|API[_-]?KEY)\s*=/i.test(trimmed)) {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "dfSecretEnv",
          line: lineNo,
          detail: trimmed.slice(0, 40),
        });
      }
    }
  }

  if (!hasFrom) {
    issues.push({ id: nextId(), severity: "error", code: "dfMissingFrom" });
  }
  if (lastUser == null || lastUser === "root" || lastUser === "0") {
    issues.push({
      id: nextId(),
      severity: "info",
      code: "dfRootUser",
    });
  }
  if (!hasHealthcheck && hasFrom) {
    issues.push({
      id: nextId(),
      severity: "info",
      code: "dfNoHealthcheck",
    });
  }
  void aptWithoutClean;

  const pretty = raw.endsWith("\n") ? raw : `${raw}\n`;
  return finalize("dockerfile", issues, pretty, 1);
}

function lintCompose(raw: string, nextId: () => number): LintResult {
  const loaded = loadYamlDocs(raw);
  if (loaded.error) {
    const isDup = /duplicated mapping key/i.test(loaded.error.reason ?? "");
    return finalize(
      "compose",
      [
        {
          id: nextId(),
          severity: "error",
          code: isDup ? "yamlDuplicateKey" : "yamlSyntax",
          line: loaded.error.line,
          column: loaded.error.column,
          detail: loaded.error.message,
        },
      ],
      "",
      0,
    );
  }

  const issues: LintIssue[] = [];
  const root = loaded.docs[0];
  if (!isRecord(root)) {
    issues.push({ id: nextId(), severity: "error", code: "composeNotMapping" });
    return finalize("compose", issues, "", 0);
  }

  if ("version" in root) {
    issues.push({
      id: nextId(),
      severity: "info",
      code: "composeVersionObsolete",
      line: lineOfMatch(raw, /^\s*version\s*:/m),
    });
  }

  const services = root.services;
  if (!isRecord(services) || Object.keys(services).length === 0) {
    issues.push({ id: nextId(), severity: "error", code: "composeNoServices" });
  } else {
    for (const [name, svc] of Object.entries(services)) {
      if (!isRecord(svc)) {
        issues.push({
          id: nextId(),
          severity: "error",
          code: "composeServiceInvalid",
          detail: name,
        });
        continue;
      }
      if (!("image" in svc) && !("build" in svc) && !("extends" in svc)) {
        issues.push({
          id: nextId(),
          severity: "error",
          code: "composeNeedImageOrBuild",
          detail: name,
          line: lineOfMatch(raw, new RegExp(`^\\s*${name}\\s*:`, "m")),
        });
      }
      if (svc.privileged === true) {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "composePrivileged",
          detail: name,
        });
      }
      if (svc.network_mode === "host") {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "composeHostNetwork",
          detail: name,
        });
      }
      if (typeof svc.image === "string" && /:latest\b/.test(svc.image)) {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "composeLatestTag",
          detail: name,
        });
      }
      if (Array.isArray(svc.ports)) {
        for (const p of svc.ports) {
          if (typeof p === "number") {
            issues.push({
              id: nextId(),
              severity: "info",
              code: "composePortAsString",
              detail: name,
            });
            break;
          }
        }
      }
      if (!("healthcheck" in svc)) {
        issues.push({
          id: nextId(),
          severity: "info",
          code: "composeNoHealthcheck",
          detail: name,
        });
      }
      if (!("restart" in svc)) {
        issues.push({
          id: nextId(),
          severity: "info",
          code: "composeNoRestart",
          detail: name,
        });
      }
      const volumes = svc.volumes;
      if (Array.isArray(volumes)) {
        for (const vol of volumes) {
          const s = typeof vol === "string" ? vol : isRecord(vol) ? String(vol.source ?? vol.type ?? "") : "";
          if (/docker\.sock/i.test(s)) {
            issues.push({
              id: nextId(),
              severity: "warning",
              code: "composeDockerSock",
              detail: name,
            });
            break;
          }
        }
      }
      const env = svc.environment;
      const envEntries: string[] = [];
      if (Array.isArray(env)) {
        for (const item of env) {
          if (typeof item === "string") envEntries.push(item);
        }
      } else if (isRecord(env)) {
        for (const [k, v] of Object.entries(env)) {
          envEntries.push(`${k}=${String(v ?? "")}`);
        }
      }
      for (const entry of envEntries) {
        if (/(PASSWORD|SECRET|TOKEN|API[_-]?KEY)\s*=/i.test(entry)) {
          issues.push({
            id: nextId(),
            severity: "warning",
            code: "composeSecretEnv",
            detail: name,
          });
          break;
        }
      }
    }
  }

  for (const trap of findYamlTraps(raw, nextId)) {
    issues.push(trap);
  }

  const pretty = dumpYamlDocs(loaded.docs) || raw;
  return finalize("compose", issues, pretty, loaded.docs.length);
}

export function lintDocker(input: string, mode: DockerMode): LintResult {
  const nextId = makeId();
  const { text, hadBom } = stripBom(input);
  if (!text.trim()) return emptyResult("unknown", nextId);

  let result: LintResult;
  if (mode === "dockerfile") {
    result = lintDockerfile(text, nextId);
  } else if (mode === "compose") {
    result = lintCompose(text, nextId);
  } else if (looksLikeCompose(text) && !looksLikeDockerfile(text)) {
    result = lintCompose(text, nextId);
  } else if (looksLikeDockerfile(text) && !looksLikeCompose(text)) {
    result = lintDockerfile(text, nextId);
  } else if (looksLikeCompose(text)) {
    result = lintCompose(text, nextId);
  } else {
    result = lintDockerfile(text, nextId);
  }

  const issues = withBom(result.issues, hadBom, nextId);
  return finalize(result.format, issues, result.pretty, result.documentCount);
}
