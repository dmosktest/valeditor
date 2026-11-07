import { listRulesForLocale } from "./rule-catalog";
import type { Locale } from "./site-config";
import { isRtlLocale } from "./site-config";

export function renderErrorsHtml(locale: Locale): string {
  const ru = locale === "ru";
  const rules = listRulesForLocale(locale === "ru" ? "ru" : "en");
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const title = ru ? "Справочник ошибок valeditor" : "valeditor error handbook";
  const lead = ru
    ? "Почему инструмент ругается и что поставить вместо. Те же коды отдаёт API."
    : "Why the linter complains and what to put instead. Same codes as the API.";
  const items = rules
    .map((r) => {
      const c = r.copy;
      return `<article class="rule" id="${r.code}">
  <h2><code>${r.code}</code> <span class="sev">${r.severity}</span> <span class="tab">${r.tab}</span></h2>
  <p class="rule-title">${escapeHtml(c.title)}</p>
  <p><strong>${ru ? "Почему" : "Why"}:</strong> ${escapeHtml(c.why)}</p>
  <p><strong>${ru ? "Что сделать" : "Fix"}:</strong> ${escapeHtml(c.fix)}</p>
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${escapeHtml(lead)}" />
  <link rel="stylesheet" href="/assets/errors.css" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <script src="/assets/errors.js" defer></script>
</head>
<body>
  <main class="wrap">
    <p class="brand"><a href="https://dmosk.net/">dmosk</a> / <a href="/${locale}/">valeditor</a> / errors</p>
    <h1>${title}</h1>
    <p class="lead">${escapeHtml(lead)}</p>
    <p><a href="/${locale}/">${ru ? "← К редактору" : "← Back to editor"}</a></p>
    <div class="rules">${items}</div>
  </main>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
