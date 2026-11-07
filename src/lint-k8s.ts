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
import { findYamlTraps } from "./yaml-traps";

function checkWorkload(doc: Record<string, unknown>, issues: LintIssue[], nextId: () => number, index: number): void {
  const kind = String(doc.kind ?? "");
  const meta = isRecord(doc.metadata) ? doc.metadata : null;
  const name = meta && typeof meta.name === "string" ? meta.name : `#${index + 1}`;

  if (!doc.apiVersion) {
    issues.push({
      id: nextId(),
      severity: "error",
      code: "k8sMissingApiVersion",
      detail: name,
    });
  }
  if (!doc.kind) {
    issues.push({
      id: nextId(),
      severity: "error",
      code: "k8sMissingKind",
      detail: name,
    });
  }
  if (!meta || typeof meta.name !== "string" || !meta.name.trim()) {
    issues.push({
      id: nextId(),
      severity: "error",
      code: "k8sMissingName",
      detail: kind || name,
    });
  }

  const spec = isRecord(doc.spec) ? doc.spec : null;
  if (["Deployment", "StatefulSet", "DaemonSet", "Job", "CronJob"].includes(kind)) {
    const podSpec =
      kind === "CronJob"
        ? isRecord(spec?.jobTemplate) && isRecord((spec.jobTemplate as Record<string, unknown>).spec)
          ? ((spec.jobTemplate as Record<string, unknown>).spec as Record<string, unknown>)
          : null
        : spec;
    const template =
      podSpec && isRecord(podSpec.template) ? (podSpec.template as Record<string, unknown>) : null;
    const pod =
      template && isRecord(template.spec) ? (template.spec as Record<string, unknown>) : null;

    if (kind === "Deployment" || kind === "StatefulSet") {
      if (!spec || !isRecord(spec.selector)) {
        issues.push({
          id: nextId(),
          severity: "error",
          code: "k8sMissingSelector",
          detail: name,
        });
      }
    }

    const containers = pod && Array.isArray(pod.containers) ? pod.containers : [];
    if (containers.length === 0 && kind !== "CronJob") {
      issues.push({
        id: nextId(),
        severity: "error",
        code: "k8sNoContainers",
        detail: name,
      });
    }
    for (const c of containers) {
      if (!isRecord(c)) continue;
      const cname = typeof c.name === "string" ? c.name : "?";
      if (!c.image || typeof c.image !== "string") {
        issues.push({
          id: nextId(),
          severity: "error",
          code: "k8sContainerNoImage",
          detail: `${name}/${cname}`,
        });
      } else if (/:latest\b/.test(c.image) || !c.image.includes(":")) {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "k8sLatestTag",
          detail: `${name}/${cname}`,
        });
      }
      if (!isRecord(c.resources)) {
        issues.push({
          id: nextId(),
          severity: "info",
          code: "k8sNoResources",
          detail: `${name}/${cname}`,
        });
      } else {
        const res = c.resources as Record<string, unknown>;
        if (!isRecord(res.requests)) {
          issues.push({
            id: nextId(),
            severity: "info",
            code: "k8sNoRequests",
            detail: `${name}/${cname}`,
          });
        }
        if (!isRecord(res.limits)) {
          issues.push({
            id: nextId(),
            severity: "info",
            code: "k8sNoLimits",
            detail: `${name}/${cname}`,
          });
        }
      }
      const sc = isRecord(c.securityContext) ? c.securityContext : null;
      if (sc?.privileged === true) {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "k8sPrivileged",
          detail: `${name}/${cname}`,
        });
      }
      if (sc?.runAsNonRoot !== true) {
        issues.push({
          id: nextId(),
          severity: "info",
          code: "k8sNoRunAsNonRoot",
          detail: `${name}/${cname}`,
        });
      }
      if (sc?.readOnlyRootFilesystem !== true) {
        issues.push({
          id: nextId(),
          severity: "info",
          code: "k8sNoReadOnlyRoot",
          detail: `${name}/${cname}`,
        });
      }
      if (c.imagePullPolicy === "Always") {
        issues.push({
          id: nextId(),
          severity: "info",
          code: "k8sImagePullAlways",
          detail: `${name}/${cname}`,
        });
      }
      if (!c.livenessProbe && !c.readinessProbe && kind === "Deployment") {
        issues.push({
          id: nextId(),
          severity: "info",
          code: "k8sNoProbes",
          detail: `${name}/${cname}`,
        });
      }
    }

    if (pod?.hostNetwork === true) {
      issues.push({
        id: nextId(),
        severity: "warning",
        code: "k8sHostNetwork",
        detail: name,
      });
    }
  }

  if (kind === "Service") {
    const selector = spec && isRecord(spec.selector) ? spec.selector : null;
    if (!selector || Object.keys(selector).length === 0) {
      const svcType = typeof spec?.type === "string" ? spec.type : "ClusterIP";
      if (svcType !== "ExternalName") {
        issues.push({
          id: nextId(),
          severity: "warning",
          code: "k8sServiceNoSelector",
          detail: name,
        });
      }
    }
  }
}

export function lintKubernetes(input: string): LintResult {
  const nextId = makeId();
  const { text, hadBom } = stripBom(input);
  if (!text.trim()) return emptyResult("unknown", nextId);

  const loaded = loadYamlDocs(text);
  if (loaded.error) {
    const isDup = /duplicated mapping key/i.test(loaded.error.reason ?? "");
    return finalize(
      "kubernetes",
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
  if (loaded.docs.length === 0) {
    issues.push({ id: nextId(), severity: "error", code: "k8sEmpty" });
  }
  loaded.docs.forEach((doc, index) => {
    if (doc == null) return;
    if (!isRecord(doc)) {
      issues.push({
        id: nextId(),
        severity: "error",
        code: "k8sNotMapping",
        detail: String(index + 1),
      });
      return;
    }
    checkWorkload(doc, issues, nextId, index);
  });

  if (loaded.docs.length > 1) {
    issues.push({
      id: nextId(),
      severity: "info",
      code: "yamlMultiDoc",
      detail: String(loaded.docs.length),
    });
  }

  for (const trap of findYamlTraps(text, nextId)) {
    issues.push(trap);
  }

  const pretty = dumpYamlDocs(loaded.docs) || text;
  return finalize("kubernetes", withBom(issues, hadBom, nextId), pretty, loaded.docs.length);
}
