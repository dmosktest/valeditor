import {
  dumpYamlDocs,
  emptyResult,
  finalize,
  isRecord,
  loadYamlDocs,
  makeId,
  stripBom,
  withBom,
  type LintIssue,
  type LintResult,
} from "./lint-shared";

const RESERVED = new Set([
  "image",
  "services",
  "stages",
  "types",
  "before_script",
  "after_script",
  "variables",
  "cache",
  "include",
  "default",
  "workflow",
  "pages",
]);

export function lintGitlabCi(input: string): LintResult {
  const nextId = makeId();
  const { text, hadBom } = stripBom(input);
  if (!text.trim()) return emptyResult("unknown", nextId);

  const loaded = loadYamlDocs(text);
  if (loaded.error) {
    const isDup = /duplicated mapping key/i.test(loaded.error.reason ?? "");
    return finalize(
      "gitlab-ci",
      withBom(
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
        hadBom,
        nextId,
      ),
      "",
      0,
    );
  }

  const issues: LintIssue[] = [];
  const root = loaded.docs[0];
  if (!isRecord(root)) {
    issues.push({ id: nextId(), severity: "error", code: "glNotMapping" });
    return finalize("gitlab-ci", withBom(issues, hadBom, nextId), "", 0);
  }

  let jobCount = 0;
  for (const [key, value] of Object.entries(root)) {
    if (key.startsWith(".")) continue;
    if (RESERVED.has(key)) continue;
    if (!isRecord(value)) {
      issues.push({
        id: nextId(),
        severity: "warning",
        code: "glJobNotMapping",
        detail: key,
      });
      continue;
    }
    jobCount += 1;
    const hasScript =
      Array.isArray(value.script) ||
      typeof value.script === "string" ||
      Array.isArray(value.trigger) ||
      isRecord(value.trigger);
    if (!hasScript && !value.extends) {
      issues.push({
        id: nextId(),
        severity: "error",
        code: "glJobNoScript",
        detail: key,
      });
    }
    if (value.only && value.rules) {
      issues.push({
        id: nextId(),
        severity: "warning",
        code: "glOnlyAndRules",
        detail: key,
      });
    }
    if (typeof value.image === "string" && /:latest\b/.test(value.image)) {
      issues.push({
        id: nextId(),
        severity: "warning",
        code: "glLatestImage",
        detail: key,
      });
    }
  }

  if (jobCount === 0 && !("include" in root)) {
    issues.push({ id: nextId(), severity: "error", code: "glNoJobs" });
  }

  if (Array.isArray(root.stages) && root.stages.length === 0) {
    issues.push({ id: nextId(), severity: "warning", code: "glEmptyStages" });
  }

  const pretty = dumpYamlDocs(loaded.docs) || text;
  return finalize("gitlab-ci", withBom(issues, hadBom, nextId), pretty, loaded.docs.length);
}
