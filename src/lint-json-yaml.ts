import yaml from "js-yaml";
import { findYamlTraps } from "./yaml-traps";

export type LintFormatMode = "auto" | "json" | "yaml";
export type DetectedFormat =
  | "json"
  | "yaml"
  | "dockerfile"
  | "compose"
  | "kubernetes"
  | "gitlab-ci"
  | "github-actions"
  | "unknown";
export type IssueSeverity = "error" | "warning" | "info";

export type LintIssue = {
  id: number;
  severity: IssueSeverity;
  code: string;
  line?: number;
  column?: number;
  detail?: string;
};

export type LintResult = {
  format: DetectedFormat;
  ok: boolean;
  issues: LintIssue[];
  pretty: string;
  documentCount: number;
};

function offsetToPos(text: string, offset: number): { line: number; column: number } {
  const safe = Math.max(0, Math.min(offset, text.length));
  let line = 1;
  let column = 1;
  for (let i = 0; i < safe; i++) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function positionFromJsonError(text: string, err: SyntaxError): { line?: number; column?: number } {
  const msg = err.message;
  const posMatch = msg.match(/position\s+(\d+)/i);
  if (posMatch) return offsetToPos(text, Number(posMatch[1]));
  const lineCol = msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineCol) return { line: Number(lineCol[1]), column: Number(lineCol[2]) };
  return {};
}

function stripBom(text: string): { text: string; hadBom: boolean } {
  if (text.charCodeAt(0) === 0xfeff) return { text: text.slice(1), hadBom: true };
  return { text, hadBom: false };
}

function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

function findDuplicateJsonKeys(text: string): LintIssue[] {
  const issues: LintIssue[] = [];
  let id = 0;
  const stack: Array<Map<string, number>> = [];
  let i = 0;
  const n = text.length;

  const skipWs = () => {
    while (i < n && /[\s\n\r\t]/.test(text[i]!)) i += 1;
  };

  const readString = (): string | null => {
    if (text[i] !== '"') return null;
    i += 1;
    let out = "";
    while (i < n) {
      const ch = text[i]!;
      if (ch === '"') {
        i += 1;
        return out;
      }
      if (ch === "\\") {
        i += 1;
        if (i >= n) return null;
        out += text[i]!;
        i += 1;
        continue;
      }
      out += ch;
      i += 1;
    }
    return null;
  };

  const skipValue = (): boolean => {
    skipWs();
    if (i >= n) return false;
    const ch = text[i]!;
    if (ch === '"') return readString() !== null;
    if (ch === "{") return skipObject();
    if (ch === "[") return skipArray();
    if (/[-0-9]/.test(ch)) {
      while (i < n && /[-+0-9.eE]/.test(text[i]!)) i += 1;
      return true;
    }
    if (text.startsWith("true", i)) {
      i += 4;
      return true;
    }
    if (text.startsWith("false", i)) {
      i += 5;
      return true;
    }
    if (text.startsWith("null", i)) {
      i += 4;
      return true;
    }
    return false;
  };

  const skipObject = (): boolean => {
    if (text[i] !== "{") return false;
    i += 1;
    const keys = new Map<string, number>();
    stack.push(keys);
    skipWs();
    if (text[i] === "}") {
      i += 1;
      stack.pop();
      return true;
    }
    while (i < n) {
      skipWs();
      const keyStart = i;
      const key = readString();
      if (key === null) {
        stack.pop();
        return false;
      }
      if (keys.has(key)) {
        const pos = offsetToPos(text, keyStart);
        id += 1;
        issues.push({
          id,
          severity: "warning",
          code: "jsonDuplicateKey",
          line: pos.line,
          column: pos.column,
          detail: key,
        });
      } else {
        keys.set(key, keyStart);
      }
      skipWs();
      if (text[i] !== ":") {
        stack.pop();
        return false;
      }
      i += 1;
      if (!skipValue()) {
        stack.pop();
        return false;
      }
      skipWs();
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      if (text[i] === "}") {
        i += 1;
        stack.pop();
        return true;
      }
      stack.pop();
      return false;
    }
    stack.pop();
    return false;
  };

  const skipArray = (): boolean => {
    if (text[i] !== "[") return false;
    i += 1;
    skipWs();
    if (text[i] === "]") {
      i += 1;
      return true;
    }
    while (i < n) {
      if (!skipValue()) return false;
      skipWs();
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      if (text[i] === "]") {
        i += 1;
        return true;
      }
      return false;
    }
    return false;
  };

  skipWs();
  if (text[i] === "{") skipObject();
  else if (text[i] === "[") skipArray();
  return issues;
}

function findDuplicateYamlKeys(text: string): LintIssue[] {
  const issues: LintIssue[] = [];
  let id = 0;
  const lines = text.split(/\r?\n/);
  const stack: Array<{ indent: number; keys: Map<string, number> }> = [
    { indent: -1, keys: new Map() },
  ];

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li]!;
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const indent = raw.match(/^\s*/)?.[0].length ?? 0;
    const body = raw.trimStart();
    if (body.startsWith("-")) continue;
    const keyMatch = body.match(/^([^:#\s][^:#]*?)\s*:/);
    if (!keyMatch) continue;
    const key = keyMatch[1]!.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }
    const frame = stack[stack.length - 1]!;
    if (frame.keys.has(key)) {
      id += 1;
      issues.push({
        id,
        severity: "warning",
        code: "yamlDuplicateKey",
        line: li + 1,
        column: indent + 1,
        detail: key,
      });
    } else {
      frame.keys.set(key, li + 1);
    }
    stack.push({ indent, keys: new Map() });
  }
  return issues;
}

function lintJson(raw: string, nextId: () => number): LintResult {
  const issues: LintIssue[] = [];
  let pretty = "";
  try {
    const value = JSON.parse(raw) as unknown;
    pretty = `${JSON.stringify(value, null, 2)}\n`;
    for (const dup of findDuplicateJsonKeys(raw)) {
      issues.push({ ...dup, id: nextId() });
    }
  } catch (err) {
    const pos = err instanceof SyntaxError ? positionFromJsonError(raw, err) : {};
    issues.push({
      id: nextId(),
      severity: "error",
      code: "jsonSyntax",
      line: pos.line,
      column: pos.column,
      detail: err instanceof Error ? err.message : String(err),
    });
    return { format: "json", ok: false, issues, pretty: "", documentCount: 0 };
  }
  return {
    format: "json",
    ok: issues.every((i) => i.severity !== "error"),
    issues,
    pretty,
    documentCount: 1,
  };
}

function lintYaml(raw: string, nextId: () => number): LintResult {
  const issues: LintIssue[] = [];
  const docs: unknown[] = [];
  try {
    yaml.loadAll(
      raw,
      (doc) => {
        docs.push(doc);
      },
      { schema: yaml.DEFAULT_SCHEMA },
    );
  } catch (err) {
    const mark =
      err && typeof err === "object" && "mark" in err
        ? (err as { mark?: { line?: number; column?: number } }).mark
        : undefined;
    const reason =
      err && typeof err === "object" && "reason" in err
        ? String((err as { reason?: string }).reason ?? "")
        : "";
    const isDup = /duplicated mapping key/i.test(reason);
    issues.push({
      id: nextId(),
      severity: "error",
      code: isDup ? "yamlDuplicateKey" : "yamlSyntax",
      line: mark?.line !== undefined ? mark.line + 1 : undefined,
      column: mark?.column !== undefined ? mark.column + 1 : undefined,
      detail: err instanceof Error ? err.message : String(err),
    });
    return { format: "yaml", ok: false, issues, pretty: "", documentCount: 0 };
  }

  for (const dup of findDuplicateYamlKeys(raw)) {
    issues.push({ ...dup, id: nextId() });
  }

  for (const trap of findYamlTraps(raw, nextId)) {
    issues.push(trap);
  }

  if (docs.length > 1) {
    issues.push({
      id: nextId(),
      severity: "info",
      code: "yamlMultiDoc",
      detail: String(docs.length),
    });
  }

  let pretty = "";
  try {
    pretty = docs
      .map((doc) =>
        yaml.dump(doc, {
          lineWidth: 100,
          noRefs: true,
          sortKeys: false,
        }),
      )
      .join("---\n");
    if (pretty && !pretty.endsWith("\n")) pretty += "\n";
  } catch {
    pretty = raw;
  }

  return {
    format: "yaml",
    ok: issues.every((i) => i.severity !== "error"),
    issues,
    pretty,
    documentCount: docs.length,
  };
}

export function lintJsonYaml(input: string, mode: LintFormatMode): LintResult {
  let id = 0;
  const nextId = () => {
    id += 1;
    return id;
  };

  const { text, hadBom } = stripBom(input);
  if (!text.trim()) {
    return {
      format: "unknown",
      ok: false,
      issues: [{ id: nextId(), severity: "error", code: "emptyInput" }],
      pretty: "",
      documentCount: 0,
    };
  }

  const prefix: LintIssue[] = [];
  if (hadBom) {
    prefix.push({ id: nextId(), severity: "warning", code: "bom" });
  }

  let result: LintResult;
  if (mode === "json") {
    result = lintJson(text, nextId);
  } else if (mode === "yaml") {
    result = lintYaml(text, nextId);
  } else if (looksLikeJson(text)) {
    result = lintJson(text, nextId);
    if (!result.ok) {
      const yamlTry = lintYaml(text, nextId);
      if (yamlTry.ok) result = yamlTry;
    }
  } else {
    result = lintYaml(text, nextId);
    if (!result.ok && looksLikeJson(text)) {
      result = lintJson(text, nextId);
    }
  }

  return {
    ...result,
    issues: [...prefix, ...result.issues],
    ok: [...prefix, ...result.issues].every((i) => i.severity !== "error"),
  };
}

export function detectFormatLabel(mode: LintFormatMode, result: LintResult): DetectedFormat {
  if (mode === "json") return "json";
  if (mode === "yaml") return "yaml";
  return result.format;
}
