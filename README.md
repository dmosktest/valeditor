# valeditor

Browser-only DevOps config linter: JSON/YAML, Dockerfile, Compose, Kubernetes, GitLab CI, and GitHub Actions. Your text never leaves the tab.

**License:** MIT

## Features (v1.0.0)

- Tabs for JSON/YAML, Dockerfile/Compose, Kubernetes, GitLab CI, GitHub Actions
- YAML traps (Norway / yes|no|on, tabs), click-to-line, one-click examples, JSON ⇄ YAML
- Share via URL `#` fragment with a secret-hint warning before copy
- Heuristic findings — not a drop-in replacement for Hadolint, actionlint, or kubeconform

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build
```

Production deploy and Docker live in the private `mksrv` monorepo — this mirror is application source only.
