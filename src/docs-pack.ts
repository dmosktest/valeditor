import {
  curlExample,
  githubActionsExample,
  gitlabCiExample,
  jenkinsExample,
} from "./ci-snippets";
import { RULE_CATALOG } from "./rule-catalog";
import type { Locale } from "./site-config";

export function buildRulesMarkdown(locale: Locale, version: string): string {
  const ru = locale === "ru";
  const lines: string[] = [
    ru ? `# Справочник правил valeditor ${version}` : `# valeditor rules handbook ${version}`,
    "",
    ru
      ? "Эвристики браузера и API. Не полный заменитель Hadolint / actionlint / kubeconform."
      : "Browser and API heuristics. Not a full Hadolint / actionlint / kubeconform replacement.",
    "",
  ];
  for (const rule of RULE_CATALOG) {
    const c = ru ? rule.ru : rule.en;
    lines.push(`## \`${rule.code}\` (${rule.severity}, ${rule.tab})`);
    lines.push("");
    lines.push(`**${c.title}**`);
    lines.push("");
    lines.push(ru ? `Почему: ${c.why}` : `Why: ${c.why}`);
    lines.push("");
    lines.push(ru ? `Что сделать: ${c.fix}` : `Fix: ${c.fix}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function buildAiBriefMarkdown(locale: Locale, version: string): string {
  const ru = locale === "ru";
  const lines: string[] = [
    `# valeditor AI brief ${version}`,
    "",
    ru
      ? "Краткий каталог правил для промптов и ИИ-агентов. Для инженеров с примерами GitLab/GitHub/Jenkins берите PDF для DevOps на сайте."
      : "Compact rule catalog for prompts and AI agents. Engineers who need GitLab/GitHub/Jenkins samples should download the DevOps PDF from the site.",
    "",
    ru ? "## CI через API (кратко)" : "## CI via API (short)",
    "",
    "```bash",
    curlExample(),
    "```",
    "",
    ru
      ? "Тело запроса не логируется. Не присылайте секреты. Для жёсткого гейта дополнительно: Hadolint, actionlint, kubeconform/kube-linter, yamllint."
      : "Request bodies are not logged. Do not send secrets. For a hard gate also use Hadolint, actionlint, kubeconform/kube-linter, yamllint.",
    "",
    "## GitLab CI",
    "",
    "```yaml",
    gitlabCiExample().trimEnd(),
    "```",
    "",
    "## GitHub Actions",
    "",
    "```yaml",
    githubActionsExample().trimEnd(),
    "```",
    "",
    "## Jenkins",
    "",
    "```groovy",
    jenkinsExample().trimEnd(),
    "```",
    "",
    ru ? "## Правила" : "## Rules",
    "",
  ];
  for (const rule of RULE_CATALOG) {
    const c = ru ? rule.ru : rule.en;
    lines.push(`- \`${rule.code}\` [${rule.severity}/${rule.tab}] ${c.title} — ${c.fix}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
