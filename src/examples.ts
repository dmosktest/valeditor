export type TabId = "json-yaml" | "docker" | "k8s" | "gitlab" | "github";

export const EXAMPLES: Record<TabId, { id: string; labelKey: string; text: string }[]> = {
  "json-yaml": [
    {
      id: "json-ok",
      labelKey: "exampleJsonOk",
      text: `{
  "service": "api",
  "replicas": 2,
  "ports": [8080]
}
`,
    },
    {
      id: "yaml-norway",
      labelKey: "exampleYamlNorway",
      text: `country:
  code: no
  name: Norway
flags:
  debug: yes
  feature: on
`,
    },
  ],
  docker: [
    {
      id: "dockerfile",
      labelKey: "exampleDockerfile",
      text: `FROM node:latest
ADD app /app
WORKDIR /app
RUN apt-get update && apt-get install -y curl
RUN curl https://example.com/install.sh | bash
ENV DB_PASSWORD=supersecret
CMD ["node", "index.js"]
`,
    },
    {
      id: "compose",
      labelKey: "exampleCompose",
      text: `version: "3.8"
services:
  web:
    image: nginx:latest
    privileged: true
    network_mode: host
    ports:
      - 80
`,
    },
  ],
  k8s: [
    {
      id: "deploy",
      labelKey: "exampleK8s",
      text: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: myapp:latest
`,
    },
  ],
  gitlab: [
    {
      id: "gitlab",
      labelKey: "exampleGitlab",
      text: `stages:
  - build
  - test

build:
  stage: build
  image: node:latest
  script:
    - npm ci
    - npm run build

test:
  stage: test
  script:
    - npm test
  only:
    - main
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
`,
    },
  ],
  github: [
    {
      id: "github",
      labelKey: "exampleGithub",
      text: `name: CI
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
`,
    },
  ],
};
