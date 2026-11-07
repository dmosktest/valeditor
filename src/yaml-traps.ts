import type { LintIssue } from "./lint-json-yaml";

/** Unquoted YAML 1.1 values that become booleans (Norway problem etc.). */
const BOOLISH =
  /^(?:y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF)$/;

export function findYamlTraps(text: string, nextId: () => number): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNo = i + 1;
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    if (/\t/.test(line)) {
      issues.push({
        id: nextId(),
        severity: "warning",
        code: "yamlTabIndent",
        line: lineNo,
        column: line.indexOf("\t") + 1,
      });
    }

    // key: value  (plain scalar, not quoted)
    const m = line.match(/^(\s*[^:#\s][^:#]*?):\s+([^"'`|>[{].*?)\s*$/);
    if (!m) continue;
    const value = (m[2] ?? "").trim();
    if (!value || value.startsWith("&") || value.startsWith("*")) continue;

    if (BOOLISH.test(value)) {
      issues.push({
        id: nextId(),
        severity: "warning",
        code: "yamlBoolish",
        line: lineNo,
        column: (m[1]?.length ?? 0) + 2,
        detail: value,
      });
    }

    // leading-zero numbers that YAML may parse oddly
    if (/^0\d+$/.test(value)) {
      issues.push({
        id: nextId(),
        severity: "info",
        code: "yamlLeadingZero",
        line: lineNo,
        detail: value,
      });
    }
  }

  return issues;
}
