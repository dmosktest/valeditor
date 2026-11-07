/** Shared CI connection examples for PDF / AI brief. */

export const API_BASE = "https://valeditor.dmosk.net";

export function curlExample(): string {
  return `curl -sS -f -X POST ${API_BASE}/api/v1/lint \\
  -H 'content-type: application/json' \\
  -d "{\\"tab\\":\\"k8s\\",\\"text\\":$(jq -Rs . < deploy.yaml),\\"fail_on\\":\\"warning\\",\\"locale\\":\\"en\\"}"`;
}

export function gitlabCiExample(): string {
  return `lint-config:
  stage: test
  image: curlimages/curl:8.5.0
  script:
    - apk add --no-cache jq
    - |
      curl -sS -f -X POST ${API_BASE}/api/v1/lint \\
        -H 'content-type: application/json' \\
        -d "{\\"tab\\":\\"gitlab\\",\\"text\\":$(jq -Rs . < .gitlab-ci.yml),\\"fail_on\\":\\"warning\\",\\"locale\\":\\"en\\"}"
`;
}

export function githubActionsExample(): string {
  return `name: valeditor lint
on:
  pull_request:
  push:
    branches: [main]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint Kubernetes manifests
        run: |
          sudo apt-get update && sudo apt-get install -y jq
          curl -sS -f -X POST ${API_BASE}/api/v1/lint \\
            -H 'content-type: application/json' \\
            -d "{\\"tab\\":\\"k8s\\",\\"text\\":$(jq -Rs . < deploy.yaml),\\"fail_on\\":\\"warning\\",\\"locale\\":\\"en\\"}"
`;
}

export function jenkinsExample(): string {
  return `pipeline {
  agent any
  stages {
    stage('valeditor lint') {
      steps {
        sh '''
          curl -sS -f -X POST ${API_BASE}/api/v1/lint \\
            -H 'content-type: application/json' \\
            -d "{\\"tab\\":\\"docker\\",\\"mode\\":\\"compose\\",\\"text\\":$(jq -Rs . < docker-compose.yml),\\"fail_on\\":\\"error\\",\\"locale\\":\\"en\\"}"
        '''
      }
    }
  }
}
`;
}
