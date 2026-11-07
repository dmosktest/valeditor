import yaml from "js-yaml";
import type { IssueSeverity, LintIssue, LintResult } from "./lint-json-yaml";

export type { IssueSeverity, LintIssue, LintResult };

export function stripBom(text: string): { text: string; hadBom: boolean } {
  if (text.charCodeAt(0) === 0xfeff) return { text: text.slice(1), hadBom: true };
  return { text, hadBom: false };
}

export function makeId(): () => number {
  let id = 0;
  return () => {
    id += 1;
    return id;
  };
}

export function emptyResult(
  format: LintResult["format"],
  nextId: () => number,
): LintResult {
  return {
    format,
    ok: false,
    issues: [{ id: nextId(), severity: "error", code: "emptyInput" }],
    pretty: "",
    documentCount: 0,
  };
}

export function withBom(
  issues: LintIssue[],
  hadBom: boolean,
  nextId: () => number,
): LintIssue[] {
  if (!hadBom) return issues;
  return [{ id: nextId(), severity: "warning", code: "bom" }, ...issues];
}

export function finalize(
  format: LintResult["format"],
  issues: LintIssue[],
  pretty: string,
  documentCount: number,
): LintResult {
  return {
    format,
    ok: issues.every((i) => i.severity !== "error"),
    issues,
    pretty,
    documentCount,
  };
}

export function loadYamlDocs(raw: string): {
  docs: unknown[];
  error?: { line?: number; column?: number; message: string; reason?: string };
} {
  const docs: unknown[] = [];
  try {
    yaml.loadAll(raw, (doc) => {
      docs.push(doc);
    });
    return { docs };
  } catch (err) {
    const mark =
      err && typeof err === "object" && "mark" in err
        ? (err as { mark?: { line?: number; column?: number } }).mark
        : undefined;
    const reason =
      err && typeof err === "object" && "reason" in err
        ? String((err as { reason?: string }).reason ?? "")
        : undefined;
    return {
      docs: [],
      error: {
        line: mark?.line !== undefined ? mark.line + 1 : undefined,
        column: mark?.column !== undefined ? mark.column + 1 : undefined,
        message: err instanceof Error ? err.message : String(err),
        reason,
      },
    };
  }
}

export function dumpYamlDocs(docs: unknown[]): string {
  try {
    let pretty = docs
      .map((doc) =>
        yaml.dump(doc, {
          lineWidth: 100,
          noRefs: true,
          sortKeys: false,
        }),
      )
      .join("---\n");
    if (pretty && !pretty.endsWith("\n")) pretty += "\n";
    return pretty;
  } catch {
    return "";
  }
}

export function lineOfMatch(text: string, re: RegExp): number | undefined {
  const m = re.exec(text);
  if (!m || m.index == null) return undefined;
  return text.slice(0, m.index).split(/\r?\n/).length;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}
