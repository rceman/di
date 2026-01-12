import ExcelJS from "exceljs";
import type { PdfPreview } from "../pdf/davanu";

export type DavanuExcelPreview = {
  headers: string[];
  rows: string[][];
  rowCount: number;
  colCount: number;
  sheetName: string;
  fileName: string;
  columnWidths: Array<number | undefined>;
  columnNumFmts: Array<string | undefined>;
  originalBuffer: ArrayBuffer;
  dateSumMatchRows?: number[];
};

const formatDateByNumFmt = (date: Date, numFmt: string) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const separator = numFmt.includes("/") ? "/" : ".";
  const hasTrailingDot = numFmt.trim().endsWith(".");
  const base = `${day}${separator}${month}${separator}${year}`;
  return hasTrailingDot ? `${base}.` : base;
};

const formatCellValue = (cell: ExcelJS.Cell) => {
  const value = cell.value;
  if (value instanceof Date) {
    const numFmt = String(cell.numFmt ?? "");
    if (/(d|m|y)/i.test(numFmt)) {
      return formatDateByNumFmt(value, numFmt);
    }
  }
  return cell.text ?? "";
};

const pickHeaderValue = (cell: ExcelJS.Cell, index: number) => {
  const text = formatCellValue(cell).trim();
  return text.length > 0 ? text : `Column ${index}`;
};

const normalizeNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDavanuNumber = (value: string) => {
  const parsed = normalizeNumber(value);
  if (parsed === null) return value;
  return parsed.toFixed(2).replace(".", ",");
};

const applyDavanuNumberColumnPreview = (rows: string[][], index: number) =>
  rows.map((row) => {
    if (index < 0 || index >= row.length) return row;
    const next = row.slice();
    next[index] = formatDavanuNumber(next[index] ?? "");
    return next;
  });

const applyDavanuNumberColumnExport = (
  worksheet: ExcelJS.Worksheet,
  rows: string[][],
  index: number
) => {
  if (index < 0) return;
  rows.forEach((row, rowIndex) => {
    if (index >= row.length) return;
    const parsed = normalizeNumber(row[index] ?? "");
    if (parsed === null) return;
    const cell = worksheet.getRow(rowIndex + 2).getCell(index + 1);
    cell.value = parsed;
    cell.numFmt = "0.00";
  });
  worksheet.getColumn(index + 1).numFmt = "0.00";
};

export const parseDavanuExcel = async (
  file: File
): Promise<DavanuExcelPreview> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheets found in this file.");
  }

  const rowCount = worksheet.actualRowCount ?? 0;
  const colCount = worksheet.actualColumnCount ?? 0;
  const maxCols = colCount || 0;
  const maxRows = rowCount || 0;

  const headerRow = worksheet.getRow(1);
  const headers = Array.from({ length: maxCols }, (_, index) =>
    pickHeaderValue(headerRow.getCell(index + 1), index + 1)
  );

  const rows = Array.from({ length: Math.max(maxRows - 1, 0) }, (_, rowIndex) => {
    const row = worksheet.getRow(rowIndex + 2);
    return Array.from({ length: maxCols }, (_, colIndex) =>
      formatCellValue(row.getCell(colIndex + 1))
    );
  });

  return {
    headers,
    rows: applyDavanuNumberColumnPreview(rows, 5),
    rowCount,
    colCount,
    sheetName: worksheet.name,
    fileName: file.name,
    columnWidths: worksheet.columns.map((column) => column.width),
    columnNumFmts: worksheet.columns.map((column) =>
      column.numFmt ? String(column.numFmt) : undefined
    ),
    originalBuffer: arrayBuffer.slice(0),
  };
};

const applyPdfRowsToSheet = (worksheet: ExcelJS.Worksheet, pdf: PdfPreview) => {
  const moneyCols = pdf.headers.length >= 3
    ? [pdf.headers.length - 3, pdf.headers.length - 1]
    : [];

  worksheet.addRow(pdf.headers);
  pdf.rows.forEach((row) => {
    const excelRow = worksheet.addRow(row);
    moneyCols.forEach((index) => {
      const parsed = normalizeNumber(row[index] ?? "");
      if (parsed !== null) {
        const cell = excelRow.getCell(index + 1);
        cell.value = parsed;
        cell.numFmt = "0.00";
      }
    });
  });

  const widths = pdf.headers.map((header, index) => {
    const maxLen = Math.max(
      String(header ?? "").length,
      ...pdf.rows.map((row) => String(row[index] ?? "").length)
    );
    return Math.min(Math.max(maxLen + 2, 10), 60);
  });
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });
};

export const downloadDavanuCombinedXlsx = async (
  excel: DavanuExcelPreview,
  pdf: PdfPreview,
  downloadName: string
) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excel.originalBuffer);

  const firstSheet = workbook.worksheets[0];
  if (!firstSheet) {
    throw new Error("No worksheets found for export.");
  }

  const rowsToWrite = [excel.headers, ...excel.rows];
  firstSheet.spliceRows(1, firstSheet.rowCount, ...rowsToWrite);
  firstSheet.name = "Horizon";

  excel.columnWidths.forEach((width, index) => {
    if (typeof width === "number" && width > 0) {
      firstSheet.getColumn(index + 1).width = width;
    }
  });
  excel.columnNumFmts.forEach((format, index) => {
    if (format) {
      firstSheet.getColumn(index + 1).numFmt = format;
    }
  });
  applyDavanuNumberColumnExport(firstSheet, excel.rows, 5);
  applyDavanuNumberColumnExport(
    firstSheet,
    excel.rows,
    Math.max(excel.headers.length - 1, 0)
  );

  const columnCount = excel.headers.length;
  if (columnCount >= 3) {
    const veidlapasIndex = columnCount - 3;
    const svitrkodsIndex = columnCount - 2;
    const summaIndex = columnCount - 1;
    const redFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFD6D6" },
    } as const;
    const yellowFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF1B8" },
    } as const;
    const blueFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD6ECFF" },
    } as const;
    const dateSumMatches = new Set(excel.dateSumMatchRows ?? []);

    excel.rows.forEach((row, rowIndex) => {
      const veidlapasValue = row[veidlapasIndex] ?? "";
      const svitrkodsValue = row[svitrkodsIndex] ?? "";
      const excelRow = firstSheet.getRow(rowIndex + 2);
      if (dateSumMatches.has(rowIndex)) {
        excelRow.getCell(veidlapasIndex + 1).fill = blueFill;
        excelRow.getCell(svitrkodsIndex + 1).fill = blueFill;
        excelRow.getCell(summaIndex + 1).fill = blueFill;
        return;
      }
      if (!veidlapasValue) {
        excelRow.getCell(svitrkodsIndex + 1).fill = yellowFill;
        excelRow.getCell(summaIndex + 1).fill = yellowFill;
        return;
      }
      if (!svitrkodsValue) {
        excelRow.getCell(veidlapasIndex + 1).fill = redFill;
        excelRow.getCell(svitrkodsIndex + 1).fill = redFill;
        excelRow.getCell(summaIndex + 1).fill = redFill;
      }
    });
  }

  let pdfSheet = workbook.worksheets[1];
  if (!pdfSheet) {
    pdfSheet = workbook.addWorksheet("Davanu PDF");
  } else {
    pdfSheet.spliceRows(1, pdfSheet.rowCount);
    pdfSheet.name = "Davanu PDF";
  }
  applyPdfRowsToSheet(pdfSheet, pdf);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
