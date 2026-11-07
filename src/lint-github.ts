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

export function lintGithubActions(input: string): LintResult {
  const nextId = makeId();
  const { text, hadBom } = stripBom(input);
  if (!text.trim()) return emptyResult("unknown", nextId);

  const loaded = loadYamlDocs(text);
  if (loaded.error) {
    const isDup = /duplicated mapping key/i.test(loaded.error.reason ?? "");
    return finalize(
      "github-actions",
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
    issues.push({ id: nextId(), severity: "error", code: "ghNotMapping" });
    return finalize("github-actions", withBom(issues, hadBom, nextId), "", 0);
  }

  // YAML 1.1: bare `on:` becomes boolean key `true` under js-yaml
  const hasOn = Reflect.ownKeys(root).some((k) => k === "on" || (k as unknown) === true);
  if (!hasOn) {
    issues.push({ id: nextId(), severity: "error", code: "ghMissingOn" });
  }

  const jobs = root.jobs;
  if (!isRecord(jobs) || Object.keys(jobs).length === 0) {
    issues.push({ id: nextId(), severity: "error", code: "ghNoJobs" });
  } else {
    for (const [jobName, job] of Object.entries(jobs)) {
      if (!isRecord(job)) {
        issues.push({
          id: nextId(),
          severity: "error",
          code: "ghJobInvalid",
          detail: jobName,
        });
        continue;
      }
      if (!job["runs-on"] && !job.uses) {
        issues.push({
          id: nextId(),
          severity: "error",
          code: "ghMissingRunsOn",
          detail: jobName,
        });
      }
      const steps = job.steps;
      if (Array.isArray(steps)) {
        if (steps.length === 0) {
          issues.push({
            id: nextId(),
            severity: "warning",
            code: "ghEmptySteps",
            detail: jobName,
          });
        }
        steps.forEach((step, idx) => {
          if (!isRecord(step)) return;
          const hasRun = typeof step.run === "string";
          const hasUses = typeof step.uses === "string";
          if (!hasRun && !hasUses) {
            issues.push({
              id: nextId(),
              severity: "error",
              code: "ghStepNoRunOrUses",
              detail: `${jobName}#${idx + 1}`,
            });
          }
          if (hasUses && typeof step.uses === "string") {
            if (!/@/.test(step.uses) && !step.uses.startsWith("./")) {
              issues.push({
                id: nextId(),
                severity: "warning",
                code: "ghActionUnpinned",
                detail: step.uses,
              });
            }
          }
        });
      } else if (!job.uses) {
        issues.push({
          id: nextId(),
          severity: "error",
          code: "ghMissingSteps",
          detail: jobName,
        });
      }
    }
  }

  const pretty = dumpYamlDocs(loaded.docs) || text;
  return finalize("github-actions", withBom(issues, hadBom, nextId), pretty, loaded.docs.length);
}
