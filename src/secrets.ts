/** Lightweight secret heuristics — browser-only, no network. */
const PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bAKIA[0-9A-Z]{16}\b/g, label: "AWS access key" },
  { re: /\bghp_[A-Za-z0-9]{20,}\b/g, label: "GitHub token" },
  { re: /\bglpat-[A-Za-z0-9\-_]{20,}\b/g, label: "GitLab token" },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, label: "Slack token" },
  {
    re: /\b(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/g,
    label: "private key",
  },
  {
    re: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']?[^\s"']{12,}/gi,
    label: "credential assignment",
  },
];

export function findSecretHints(text: string): string[] {
  const found = new Set<string>();
  for (const { re, label } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) found.add(label);
  }
  return [...found];
}
