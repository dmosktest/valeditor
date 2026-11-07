import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import {
  curlExample,
  githubActionsExample,
  gitlabCiExample,
  jenkinsExample,
  API_BASE,
} from "./ci-snippets";
import { RULE_CATALOG } from "./rule-catalog";
import type { Locale } from "./site-config";

type PdfMakeApi = {
  addVirtualFileSystem: (vfs: unknown) => void;
  setFonts: (fonts: Record<string, Record<string, string>>) => void;
  createPdf: (doc: TDocumentDefinitions) => { download: (name?: string) => Promise<void> };
};

let pdfMakeReady: Promise<PdfMakeApi> | null = null;

async function loadPdfMake(): Promise<PdfMakeApi> {
  if (!pdfMakeReady) {
    pdfMakeReady = (async () => {
      const mod = await import("pdfmake/build/pdfmake");
      const vfsMod = await import("pdfmake/build/vfs_fonts");
      const pdfMake = (mod.default ?? mod) as PdfMakeApi;
      const vfs = (vfsMod as { default?: unknown }).default ?? vfsMod;
      pdfMake.addVirtualFileSystem(vfs);
      pdfMake.setFonts({
        Roboto: {
          normal: "Roboto-Regular.ttf",
          bold: "Roboto-Medium.ttf",
          italics: "Roboto-Italic.ttf",
          bolditalics: "Roboto-MediumItalic.ttf",
        },
      });
      return pdfMake;
    })();
  }
  return pdfMakeReady;
}

function codeBlock(text: string): Content {
  return {
    text,
    fontSize: 8,
    font: "Roboto",
    margin: [0, 4, 0, 10] as [number, number, number, number],
    color: "#222222",
  };
}

function buildDoc(locale: Locale, version: string): TDocumentDefinitions {
  const ru = locale === "ru";
  const content: Content[] = [
    { text: ru ? `valeditor — документация API для DevOps (${version})` : `valeditor — API docs for DevOps (${version})`, style: "h1" },
    {
      text: ru
        ? "Этот PDF для инженеров: как встроить онлайн-эвристики valeditor в пайплайн. Не полный заменитель Hadolint/actionlint/kubeconform — для жёсткого гейта дополняйте CLI. Тело запроса API не логируется; не присылайте секреты."
        : "This PDF is for engineers: how to wire valeditor heuristics into a pipeline. Not a full Hadolint/actionlint/kubeconform replacement — pair with classic CLIs for hard gates. Request bodies are not logged; do not send secrets.",
      margin: [0, 0, 0, 10],
    },
    { text: ru ? "Эндпоинты" : "Endpoints", style: "h2" },
    {
      ul: [
        `GET ${API_BASE}/api/v1/health`,
        `GET ${API_BASE}/api/v1/rules?locale=en`,
        `POST ${API_BASE}/api/v1/lint  — body: tab, text, fail_on (error|warning|never), locale, mode`,
      ],
      margin: [0, 0, 0, 8],
    },
    {
      text: ru
        ? "HTTP 200 если ok по fail_on, иначе 422 (удобно для curl -f)."
        : "HTTP 200 when ok under fail_on, otherwise 422 (handy with curl -f).",
      margin: [0, 0, 0, 10],
    },
    { text: ru ? "Быстрый curl" : "Quick curl", style: "h2" },
    codeBlock(curlExample()),
    { text: "GitLab CI", style: "h2" },
    codeBlock(gitlabCiExample()),
    { text: "GitHub Actions", style: "h2" },
    codeBlock(githubActionsExample()),
    { text: "Jenkins (Declarative)", style: "h2" },
    codeBlock(jenkinsExample()),
    { text: ru ? "Коды замечаний (кратко)" : "Finding codes (short)", style: "h2" },
  ];

  for (const rule of RULE_CATALOG) {
    const c = ru ? rule.ru : rule.en;
    content.push({
      text: `${rule.code} [${rule.severity}/${rule.tab}] — ${c.title}. ${c.fix}`,
      fontSize: 8,
      margin: [0, 0, 0, 3],
    });
  }

  return {
    content,
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] },
      h2: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] },
    },
    defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.25 },
    pageMargins: [40, 40, 40, 40],
  };
}

export async function downloadDevopsPdf(locale: Locale, version: string): Promise<void> {
  const pdfMake = await loadPdfMake();
  const lang = locale === "ru" ? "ru" : "en";
  await pdfMake.createPdf(buildDoc(locale === "ru" ? "ru" : "en", version)).download(
    `valeditor-api-devops.${lang}.pdf`,
  );
}
