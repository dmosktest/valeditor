# valeditor

Browser DevOps config linter plus an HTTP API for CI: JSON/YAML, Dockerfile/Compose, Kubernetes, GitLab CI, and GitHub Actions.

**License:** MIT  
**Live:** https://valeditor.dmosk.net/

## Features (v1.2.0)

- Config editor with line numbers; findings and status show line/column
- Findings sorted error → warning → info (then by line)
- Handbook link highlights the matching rule entry
- Heuristic tabs with deeper best-practice checks and more examples
- Findings include title / why / fix; error handbook at `/errors/` (linked at the bottom)
- DevOps PDF with GitLab / GitHub Actions / Jenkins API samples; Markdown brief for AI
- `POST /api/v1/lint` for pipelines (`fail_on` → HTTP 422); request bodies are not logged
- Not a full Hadolint / actionlint / kubeconform replacement

## CI example

```bash
curl -sS -f -X POST https://valeditor.dmosk.net/api/v1/lint \
  -H 'content-type: application/json' \
  -d "{\"tab\":\"k8s\",\"text\":$(jq -Rs . < deploy.yaml),\"fail_on\":\"warning\",\"locale\":\"en\"}"
```

## Develop

```bash
npm install
npm run dev
npm run build
```

Docker/Compose and stand config live in the private `mksrv` monorepo.
