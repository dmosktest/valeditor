import { lintDocker, type DockerMode } from "./lint-docker";
import { lintGithubActions } from "./lint-github";
import { lintGitlabCi } from "./lint-gitlab";
import {
  lintJsonYaml,
  type LintFormatMode,
  type LintIssue,
  type LintResult,
} from "./lint-json-yaml";
import { lintKubernetes } from "./lint-k8s";
import { sortIssues } from "./lint-shared";
import { ruleCopy } from "./rule-catalog";
import type { Locale } from "./site-config";

export type LintTab = "json-yaml" | "docker" | "k8s" | "gitlab" | "github";
export type FailOn = "error" | "warning" | "never";

export type EnrichedIssue = LintIssue & {
  title: string;
  why: string;
  fix: string;
};

export type LintApiResult = {
  version: string;
  format: LintResult["format"];
  ok: boolean;
  documentCount: number;
  issues: EnrichedIssue[];
};

export function runLint(
  tab: LintTab,
  text: string,
  opts: {
    jsonMode?: LintFormatMode;
    dockerMode?: DockerMode;
  } = {},
): LintResult {
  let result: LintResult;
  switch (tab) {
    case "json-yaml":
      result = lintJsonYaml(text, opts.jsonMode ?? "auto");
      break;
    case "docker":
      result = lintDocker(text, opts.dockerMode ?? "auto");
      break;
    case "k8s":
      result = lintKubernetes(text);
      break;
    case "gitlab":
      result = lintGitlabCi(text);
      break;
    case "github":
      result = lintGithubActions(text);
      break;
    default:
      result = lintJsonYaml(text, "auto");
  }
  return { ...result, issues: sortIssues(result.issues) };
}

function severityRank(s: LintIssue["severity"]): number {
  if (s === "error") return 3;
  if (s === "warning") return 2;
  return 1;
}

export function passesFailOn(issues: LintIssue[], failOn: FailOn): boolean {
  if (failOn === "never") return true;
  const min = failOn === "warning" ? 2 : 3;
  return !issues.some((i) => severityRank(i.severity) >= min);
}

export function enrichIssues(issues: LintIssue[], locale: Locale): EnrichedIssue[] {
  return issues.map((issue) => {
    const copy = ruleCopy(issue.code, locale);
    return { ...issue, title: copy.title, why: copy.why, fix: copy.fix };
  });
}

export function runLintApi(
  tab: LintTab,
  text: string,
  opts: {
    version: string;
    locale?: Locale;
    failOn?: FailOn;
    jsonMode?: LintFormatMode;
    dockerMode?: DockerMode;
  },
): { status: number; body: LintApiResult } {
  const locale = opts.locale ?? "en";
  const failOn = opts.failOn ?? "error";
  const result = runLint(tab, text, {
    jsonMode: opts.jsonMode,
    dockerMode: opts.dockerMode,
  });
  const issues = enrichIssues(result.issues, locale);
  const ok = passesFailOn(result.issues, failOn);
  return {
    status: ok ? 200 : 422,
    body: {
      version: opts.version,
      format: result.format,
      ok,
      documentCount: result.documentCount,
      issues,
    },
  };
}
