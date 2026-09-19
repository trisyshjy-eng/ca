import "server-only";
import fs from "node:fs";

const CANDIDATE_BROWSER_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function findBrowserExecutable(): string {
  const found = CANDIDATE_BROWSER_PATHS.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      "PDF 생성을 위한 Chromium 계열 브라우저(Edge/Chrome)를 찾을 수 없습니다. 서버에 Edge 또는 Chrome을 설치해 주세요."
    );
  }
  return found;
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: findBrowserExecutable(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBytes = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" },
    });
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
