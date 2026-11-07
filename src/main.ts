import "./style.css";
import { EXAMPLES, type TabId } from "./examples";
import { detectLocale, t, type MessageKey } from "./i18n";
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
import { registerServiceWorker } from "./register-sw";
import { findSecretHints } from "./secrets";
import type { Locale } from "./site-config";
import yaml from "js-yaml";

export type { TabId };

type AppState = {
  locale: Locale;
  tab: TabId;
  jsonMode: LintFormatMode;
  dockerMode: DockerMode;
  last: LintResult | null;
};

const state: AppState = {
  locale: "ru",
  tab: "json-yaml",
  jsonMode: "auto",
  dockerMode: "auto",
  last: null,
};

const ISSUE_KEYS: Record<string, MessageKey> = {
  emptyInput: "issueEmptyInput",
  bom: "issueBom",
  jsonSyntax: "issueJsonSyntax",
  yamlSyntax: "issueYamlSyntax",
  jsonDuplicateKey: "issueJsonDuplicateKey",
  yamlDuplicateKey: "issueYamlDuplicateKey",
  yamlMultiDoc: "issueYamlMultiDoc",
  yamlBoolish: "issueYamlBoolish",
  yamlTabIndent: "issueYamlTabIndent",
  yamlLeadingZero: "issueYamlLeadingZero",
  dfMissingFrom: "issueDfMissingFrom",
  dfLatestTag: "issueDfLatestTag",
  dfPreferCopy: "issueDfPreferCopy",
  dfPipeShell: "issueDfPipeShell",
  dfAptClean: "issueDfAptClean",
  dfUseWorkdir: "issueDfUseWorkdir",
  dfSecretEnv: "issueDfSecretEnv",
  dfRootUser: "issueDfRootUser",
  composeNotMapping: "issueComposeNotMapping",
  composeVersionObsolete: "issueComposeVersionObsolete",
  composeNoServices: "issueComposeNoServices",
  composeServiceInvalid: "issueComposeServiceInvalid",
  composeNeedImageOrBuild: "issueComposeNeedImageOrBuild",
  composePrivileged: "issueComposePrivileged",
  composeHostNetwork: "issueComposeHostNetwork",
  composeLatestTag: "issueComposeLatestTag",
  composePortAsString: "issueComposePortAsString",
  k8sMissingApiVersion: "issueK8sMissingApiVersion",
  k8sMissingKind: "issueK8sMissingKind",
  k8sMissingName: "issueK8sMissingName",
  k8sMissingSelector: "issueK8sMissingSelector",
  k8sNoContainers: "issueK8sNoContainers",
  k8sContainerNoImage: "issueK8sContainerNoImage",
  k8sLatestTag: "issueK8sLatestTag",
  k8sNoResources: "issueK8sNoResources",
  k8sPrivileged: "issueK8sPrivileged",
  k8sHostNetwork: "issueK8sHostNetwork",
  k8sEmpty: "issueK8sEmpty",
  k8sNotMapping: "issueK8sNotMapping",
  glNotMapping: "issueGlNotMapping",
  glJobNotMapping: "issueGlJobNotMapping",
  glJobNoScript: "issueGlJobNoScript",
  glOnlyAndRules: "issueGlOnlyAndRules",
  glLatestImage: "issueGlLatestImage",
  glNoJobs: "issueGlNoJobs",
  glEmptyStages: "issueGlEmptyStages",
  ghNotMapping: "issueGhNotMapping",
  ghMissingOn: "issueGhMissingOn",
  ghNoJobs: "issueGhNoJobs",
  ghJobInvalid: "issueGhJobInvalid",
  ghMissingRunsOn: "issueGhMissingRunsOn",
  ghEmptySteps: "issueGhEmptySteps",
  ghStepNoRunOrUses: "issueGhStepNoRunOrUses",
  ghActionUnpinned: "issueGhActionUnpinned",
  ghMissingSteps: "issueGhMissingSteps",
};

const TAB_IDS: TabId[] = ["json-yaml", "docker", "k8s", "gitlab", "github"];

function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}

function setStatus(message: string, isError = false): void {
  const el = byId<HTMLParagraphElement>("status");
  el.textContent = message;
  el.classList.toggle("is-error", isError);
}

function bindLangMenu(): void {
  const langRoot = document.querySelector<HTMLDetailsElement>(".lang");
  if (!langRoot) return;
  document.addEventListener("click", (event) => {
    if (!langRoot.open) return;
    const target = event.target;
    if (target instanceof Node && !langRoot.contains(target)) {
      langRoot.open = false;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && langRoot.open) langRoot.open = false;
  });
}

function currentMode(): string {
  if (state.tab === "json-yaml") return state.jsonMode;
  if (state.tab === "docker") return state.dockerMode;
  return "auto";
}

function syncHash(): void {
  const raw = byId<HTMLTextAreaElement>("text-input").value;
  const mode = currentMode();
  if (!raw.trim() && state.tab === "json-yaml" && mode === "auto") {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    return;
  }
  const payload = `tab=${state.tab}&mode=${mode}&${raw}`;
  const next = `#${encodeURIComponent(payload)}`;
  if (window.location.hash !== next) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${next}`,
    );
  }
}

function readHashInput(): { text: string; tab: TabId; mode: string } {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return { text: "", tab: "json-yaml", mode: "auto" };
  let decoded = hash;
  try {
    decoded = decodeURIComponent(hash);
  } catch {
    decoded = hash;
  }
  const full = decoded.match(/^tab=(json-yaml|docker|k8s|gitlab|github)&mode=([^&]*)&([\s\S]*)$/);
  if (full) {
    return { text: full[3] ?? "", tab: full[1] as TabId, mode: full[2] ?? "auto" };
  }
  const modeMatch = decoded.match(/^mode=(auto|json|yaml)&([\s\S]*)$/);
  if (modeMatch) {
    return { text: modeMatch[2] ?? "", tab: "json-yaml", mode: modeMatch[1] ?? "auto" };
  }
  return { text: decoded, tab: "json-yaml", mode: "auto" };
}

function severityLabel(severity: LintIssue["severity"]): string {
  if (severity === "error") return t(state.locale, "severityError");
  if (severity === "warning") return t(state.locale, "severityWarning");
  return t(state.locale, "severityInfo");
}

function issueMessage(issue: LintIssue): string {
  const key = ISSUE_KEYS[issue.code] ?? "issueJsonSyntax";
  return format(t(state.locale, key), {
    detail: issue.detail ?? "",
    count: issue.detail ?? "",
  });
}

function jumpToIssue(issue: LintIssue): void {
  if (issue.line == null) return;
  const ta = byId<HTMLTextAreaElement>("text-input");
  const lines = ta.value.split(/\n/);
  let start = 0;
  for (let i = 0; i < issue.line - 1 && i < lines.length; i++) {
    start += (lines[i]?.length ?? 0) + 1;
  }
  const lineText = lines[issue.line - 1] ?? "";
  const col = Math.max(1, issue.column ?? 1);
  const from = start + Math.min(col - 1, lineText.length);
  const to = start + lineText.length;
  ta.focus();
  ta.setSelectionRange(from, to);
  const lineHeight = ta.scrollHeight / Math.max(lines.length, 1);
  ta.scrollTop = Math.max(0, (issue.line - 3) * lineHeight);
}

function renderIssue(issue: LintIssue): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `issue issue-${issue.severity}`;
  if (issue.line != null) {
    li.classList.add("issue-clickable");
    li.tabIndex = 0;
    li.title = t(state.locale, "jumpToLine");
    const go = () => jumpToIssue(issue);
    li.addEventListener("click", go);
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        go();
      }
    });
  }

  const head = document.createElement("div");
  head.className = "issue-head";

  const sev = document.createElement("span");
  sev.className = `issue-severity sev-${issue.severity}`;
  sev.textContent = severityLabel(issue.severity);

  const code = document.createElement("span");
  code.className = "issue-code";
  code.textContent = issue.code;

  head.append(sev, code);

  if (issue.line != null) {
    const pos = document.createElement("span");
    pos.className = "issue-pos";
    pos.textContent = format(t(state.locale, "position"), {
      line: issue.line,
      column: issue.column ?? 1,
    });
    head.append(pos);
  }

  const msg = document.createElement("p");
  msg.className = "issue-msg";
  msg.textContent = issueMessage(issue);

  li.append(head, msg);
  return li;
}

function hideResults(): void {
  state.last = null;
  byId("results").hidden = true;
  byId("issues").replaceChildren();
  byId("download").hidden = true;
  byId("format-detected").hidden = true;
}

function showDetected(result: LintResult): void {
  const el = byId("format-detected");
  if (result.format === "unknown") {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = format(t(state.locale, "formatDetected"), {
    format: result.format,
  });
}

function runCurrentLint(text: string): LintResult {
  if (state.tab === "json-yaml") return lintJsonYaml(text, state.jsonMode);
  if (state.tab === "docker") return lintDocker(text, state.dockerMode);
  if (state.tab === "k8s") return lintKubernetes(text);
  if (state.tab === "gitlab") return lintGitlabCi(text);
  return lintGithubActions(text);
}

function runLint(showEmptyError: boolean): void {
  const text = byId<HTMLTextAreaElement>("text-input").value;
  syncHash();
  if (!text.trim()) {
    hideResults();
    if (showEmptyError) setStatus(t(state.locale, "emptyInput"), true);
    return;
  }

  const result = runCurrentLint(text);
  state.last = result;
  showDetected(result);

  const list = byId<HTMLUListElement>("issues");
  list.replaceChildren(...result.issues.map(renderIssue));
  byId("results").hidden = false;
  byId("download").hidden = !result.pretty;

  if (result.ok && result.issues.length === 0) {
    setStatus(t(state.locale, "parseOk"));
  } else {
    setStatus("");
  }
}

function applyFormat(): void {
  const text = byId<HTMLTextAreaElement>("text-input").value;
  if (!text.trim()) {
    setStatus(t(state.locale, "emptyInput"), true);
    return;
  }
  const result = runCurrentLint(text);
  state.last = result;
  showDetected(result);
  if (!result.pretty) {
    const list = byId<HTMLUListElement>("issues");
    list.replaceChildren(...result.issues.map(renderIssue));
    byId("results").hidden = false;
    byId("download").hidden = true;
    setStatus(result.issues[0] ? issueMessage(result.issues[0]) : t(state.locale, "emptyInput"), true);
    return;
  }
  byId<HTMLTextAreaElement>("text-input").value = result.pretty;
  runLint(false);
}

async function copyShare(): Promise<void> {
  const text = byId<HTMLTextAreaElement>("text-input").value;
  const secrets = findSecretHints(text);
  if (secrets.length) {
    const ok = window.confirm(
      format(t(state.locale, "shareSecretWarn"), { detail: secrets.join(", ") }),
    );
    if (!ok) {
      setStatus(t(state.locale, "shareCancelled"), true);
      return;
    }
  }
  syncHash();
  try {
    await navigator.clipboard.writeText(window.location.href);
    setStatus(t(state.locale, "shareCopied"));
  } catch {
    setStatus(t(state.locale, "copyError"), true);
  }
}

function downloadPretty(): void {
  const pretty = state.last?.pretty;
  if (!pretty) return;
  const fmt = state.last?.format ?? "yaml";
  const ext =
    fmt === "json" ? "json" : fmt === "dockerfile" ? "Dockerfile" : "yml";
  const blob = new Blob([pretty], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ext === "Dockerfile" ? "Dockerfile" : `linted.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus(t(state.locale, "downloaded"));
}

function convertJsonYaml(to: "json" | "yaml"): void {
  const text = byId<HTMLTextAreaElement>("text-input").value.trim();
  if (!text) {
    setStatus(t(state.locale, "emptyInput"), true);
    return;
  }
  try {
    let value: unknown;
    if (text.startsWith("{") || text.startsWith("[")) {
      value = JSON.parse(text);
    } else {
      const docs: unknown[] = [];
      yaml.loadAll(text, (doc) => docs.push(doc));
      value = docs.length === 1 ? docs[0] : docs;
    }
    if (to === "json") {
      byId<HTMLTextAreaElement>("text-input").value = `${JSON.stringify(value, null, 2)}\n`;
      state.jsonMode = "json";
    } else {
      const docs = Array.isArray(value) ? value : [value];
      byId<HTMLTextAreaElement>("text-input").value = docs
        .map((doc) => yaml.dump(doc, { lineWidth: 100, noRefs: true, sortKeys: false }))
        .join("---\n");
      state.jsonMode = "yaml";
    }
    syncFormatSelect();
    runLint(false);
    setStatus(t(state.locale, to === "json" ? "convertedJson" : "convertedYaml"));
  } catch (err) {
    setStatus(err instanceof Error ? err.message : t(state.locale, "parseError"), true);
  }
}

function syncFormatSelect(): void {
  const row = byId("format-row");
  const select = byId<HTMLSelectElement>("format-mode");
  const convertRow = byId("convert-row");
  select.replaceChildren();

  if (state.tab === "json-yaml") {
    row.hidden = false;
    convertRow.hidden = false;
    for (const [value, key] of [
      ["auto", "formatAuto"],
      ["json", "formatJson"],
      ["yaml", "formatYaml"],
    ] as const) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.id = `opt-${value}`;
      opt.textContent = t(state.locale, key);
      select.append(opt);
    }
    select.value = state.jsonMode;
  } else if (state.tab === "docker") {
    row.hidden = false;
    convertRow.hidden = true;
    for (const [value, key] of [
      ["auto", "formatAuto"],
      ["dockerfile", "formatDockerfile"],
      ["compose", "formatCompose"],
    ] as const) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.id = `opt-${value}`;
      opt.textContent = t(state.locale, key);
      select.append(opt);
    }
    select.value = state.dockerMode;
  } else {
    row.hidden = true;
    convertRow.hidden = true;
  }
}

function renderExamples(): void {
  const root = byId("examples");
  root.replaceChildren();
  for (const ex of EXAMPLES[state.tab]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-small example-btn";
    btn.textContent = t(state.locale, ex.labelKey as MessageKey);
    btn.addEventListener("click", () => {
      byId<HTMLTextAreaElement>("text-input").value = ex.text;
      runLint(false);
    });
    root.append(btn);
  }
}

function setTab(tab: TabId): void {
  state.tab = tab;
  for (const id of TAB_IDS) {
    const btn = byId(`tab-${id === "json-yaml" ? "json-yaml" : id}`);
    const active = id === tab;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  }
  syncFormatSelect();
  renderExamples();
  byId("tab-soon").hidden = true;
  byId<HTMLTextAreaElement>("text-input").placeholder = t(
    state.locale,
    state.tab === "json-yaml"
      ? "inputPlaceholder"
      : state.tab === "docker"
        ? "inputPlaceholderDocker"
        : state.tab === "k8s"
          ? "inputPlaceholderK8s"
          : state.tab === "gitlab"
            ? "inputPlaceholderGitlab"
            : "inputPlaceholderGithub",
  );
  hideResults();
  setStatus("");
  syncHash();
  if (byId<HTMLTextAreaElement>("text-input").value.trim()) runLint(false);
}

function applyStaticCopy(): void {
  byId("input-label").textContent = t(state.locale, "inputLabel");
  byId("lint").textContent = t(state.locale, "lint");
  byId("format").textContent = t(state.locale, "format");
  byId("clear").textContent = t(state.locale, "clear");
  byId("share").textContent = t(state.locale, "share");
  byId("download").textContent = t(state.locale, "download");
  byId("to-json").textContent = t(state.locale, "toJson");
  byId("to-yaml").textContent = t(state.locale, "toYaml");
  byId("examples-label").textContent = t(state.locale, "examplesLabel");
  byId("issues-title").textContent = t(state.locale, "issuesTitle");
  byId("tab-json-yaml").textContent = t(state.locale, "tabJsonYaml");
  byId("tab-docker").textContent = t(state.locale, "tabDocker");
  byId("tab-k8s").textContent = t(state.locale, "tabK8s");
  byId("tab-gitlab").textContent = t(state.locale, "tabGitlab");
  byId("tab-github").textContent = t(state.locale, "tabGithub");
  byId("format-label").textContent = t(state.locale, "formatModeLabel");
  byId("rl-tip").innerHTML = t(state.locale, "tipHtml");
  syncFormatSelect();
  renderExamples();
  byId("tab-soon").hidden = true;
}

function bindUi(): void {
  const modeSelect = byId<HTMLSelectElement>("format-mode");
  modeSelect.addEventListener("change", () => {
    if (state.tab === "json-yaml") {
      state.jsonMode = modeSelect.value as LintFormatMode;
    } else if (state.tab === "docker") {
      state.dockerMode = modeSelect.value as DockerMode;
    }
    syncHash();
    if (byId<HTMLTextAreaElement>("text-input").value.trim()) runLint(false);
  });

  for (const id of TAB_IDS) {
    const btnId = id === "json-yaml" ? "tab-json-yaml" : `tab-${id}`;
    byId(btnId).addEventListener("click", () => setTab(id));
  }

  byId("lint").addEventListener("click", () => runLint(true));
  byId("format").addEventListener("click", () => applyFormat());
  byId("clear").addEventListener("click", () => {
    byId<HTMLTextAreaElement>("text-input").value = "";
    hideResults();
    setStatus("");
    syncHash();
  });
  byId("share").addEventListener("click", () => {
    void copyShare();
  });
  byId("download").addEventListener("click", () => downloadPretty());
  byId("to-json").addEventListener("click", () => convertJsonYaml("json"));
  byId("to-yaml").addEventListener("click", () => convertJsonYaml("yaml"));

  const input = byId<HTMLTextAreaElement>("text-input");
  input.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runLint(true);
    }
  });
}

function boot(): void {
  state.locale = detectLocale();
  const fromHash = readHashInput();
  state.tab = fromHash.tab;
  if (state.tab === "json-yaml") {
    state.jsonMode = (fromHash.mode as LintFormatMode) || "auto";
  } else if (state.tab === "docker") {
    state.dockerMode = (fromHash.mode as DockerMode) || "auto";
  }
  applyStaticCopy();
  setTab(state.tab);
  bindLangMenu();
  bindUi();
  if (fromHash.text) {
    byId<HTMLTextAreaElement>("text-input").value = fromHash.text;
    runLint(false);
  }
  void registerServiceWorker();
}

boot();
