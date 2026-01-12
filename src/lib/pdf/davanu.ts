import ExcelJS from "exceljs";
import * as pdfjsLib from "pdfjs-dist";

import { configurePdfWorker } from "./worker";
import {
  CFG,
  applyDavanuColumnRules,
  extractTableFromLines,
  getDavanuMoneyColumns,
  groupIntoLines,
  normalizeMoneyText,
  normStr,
  toTopY,
} from "./davanu_parser";

export type PdfPreview = {
  headers: string[];
  rows: string[][];
  pageCount: number;
};

type PdfTextItem = { str: string; transform: number[] };

const isTextItem = (item: unknown): item is PdfTextItem =>
  typeof (item as { str?: unknown }).str === "string" &&
  Array.isArray((item as { transform?: unknown }).transform);

export const extractDavanuPdfTable = async (
  buffer: ArrayBuffer
): Promise<PdfPreview> => {
  configurePdfWorker();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = doc.numPages;

  let previous: { header: string[]; anchors: number[] } | null = null;
  const allRows: string[][] = [];
  let headers: string[] = [];
  let extractedAny = false;

  for (let p = 1; p <= totalPages; p++) {
    try {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1.0 });
      const tc = await page.getTextContent();
      const items = tc.items
        .map((it) => {
          if (!isTextItem(it)) return null;
          const str = normStr(it.str);
          if (!str) return null;
          const tr = it.transform as number[];
          return { str, x: tr[4], yTop: toTopY(viewport.height, tr[5]) };
        })
        .filter(Boolean) as { str: string; x: number; yTop: number }[];

      const lines = groupIntoLines(items, CFG.rowEps);
      const table = extractTableFromLines(lines, previous);
      if (!headers.length) headers = table.header;
      allRows.push(...table.rows);
      previous = { header: table.header, anchors: table.anchors };
      extractedAny = true;
    } catch (err) {
      console.warn("[Davanu] page skipped:", p, err);
    }
  }

  if (!extractedAny) {
    throw new Error("Header line not found (could be scanned PDF or different layout).");
  }

  return {
    headers,
    rows: applyDavanuColumnRules(allRows, headers),
    pageCount: totalPages,
  };
};

export const downloadDavanuXlsx = async (
  preview: PdfPreview,
  fileName: string | null
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Davanu serviss");
  const moneyCols = getDavanuMoneyColumns(preview.headers.length);

  worksheet.addRow(preview.headers);
  preview.rows.forEach((row) => {
    const excelRow = worksheet.addRow(row);
    moneyCols.forEach((index) => {
      const parsed = normalizeMoneyText(row[index] ?? "");
      if (parsed !== null) {
        const cell = excelRow.getCell(index + 1);
        cell.value = parsed;
        cell.numFmt = "0.00";
      }
    });
  });

  const widths = preview.headers.map((header, index) => {
    const maxLen = Math.max(
      String(header ?? "").length,
      ...preview.rows.map((row) => String(row[index] ?? "").length)
    );
    return Math.min(Math.max(maxLen + 2, 10), 60);
  });
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const baseName = fileName?.replace(/\.pdf$/i, "") ?? "davanu-serviss";
  anchor.download = `${baseName}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
