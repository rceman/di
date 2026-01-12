import ExcelJS from "exceljs";

export type ExcelPreviewData = {
  headers: string[];
  rows: string[][];
  rowCount: number;
  colCount: number;
  sheetName: string;
  fileName: string;
  columnWidths: Array<number | undefined>;
  columnNumFmts: Array<string | undefined>;
  sourceRowCount: number;
  originalBuffer: ArrayBuffer;
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
  const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseLieliskaWorkbook = async (
  file: File
): Promise<ExcelPreviewData> => {
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
    rows,
    rowCount,
    colCount,
    sheetName: worksheet.name,
    fileName: file.name,
    columnWidths: worksheet.columns.map((column) => column.width),
    columnNumFmts: worksheet.columns.map((column) =>
      column.numFmt ? String(column.numFmt) : undefined
    ),
    sourceRowCount: rows.length,
    originalBuffer: arrayBuffer.slice(0),
  };
};

export const downloadLieliskaXlsx = async (
  preview: ExcelPreviewData,
  unmatchedRows: string[][] | null,
  unmatchedSvitrkods: string[][] | null
) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(preview.originalBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheets found for export.");
  }

  const { headers, rows } = preview;
  const lastColumnIndex = headers.length - 1;
  const dokumentaSummaIndex = 5;
  const veidlapasSet = new Set<string>();
  (unmatchedRows ?? []).forEach((row) => {
    const value = row[row.length - 1];
    if (value) {
      veidlapasSet.add(value);
    }
  });

  const exportRows = rows.map((row) => {
    const next = row.slice();
    if (veidlapasSet.has(next[headers.length - 3] ?? "")) {
      next[headers.length - 2] = "";
      next[headers.length - 1] = "";
      return next;
    }
    const indices = [dokumentaSummaIndex, lastColumnIndex];
    indices.forEach((index) => {
      if (index < 0 || index >= next.length) {
        return;
      }
      const value = next[index] ?? "";
      const parsed = normalizeNumber(value);
      if (parsed !== null) {
        next[index] = String(parsed);
      }
    });
    return next;
  });

  const rowsToWrite = [headers, ...exportRows];
  worksheet.spliceRows(1, worksheet.rowCount, ...rowsToWrite);
  exportRows.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(rowIndex + 2);
    const indices = [dokumentaSummaIndex, lastColumnIndex];
    indices.forEach((index) => {
      if (index < 0 || index >= headers.length) {
        return;
      }
      const value = row[index];
      const parsed = normalizeNumber(value);
      if (parsed !== null) {
        excelRow.getCell(index + 1).value = parsed;
      }
    });
  });

  preview.columnWidths.forEach((width, index) => {
    if (typeof width === "number" && width > 0) {
      worksheet.getColumn(index + 1).width = width;
    }
  });
  preview.columnNumFmts.forEach((format, index) => {
    if (format) {
      worksheet.getColumn(index + 1).numFmt = format;
    }
  });

  const columnCount = headers.length;
  if (columnCount >= 3) {
    const veidlapasIndex = columnCount - 3;
    const svitrkodsIndex = columnCount - 2;
    const summaIndex = columnCount - 1;
    const veidlapasFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFD6D6" },
    } as const;
    const svitrkodsFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFF1B8" },
    } as const;

    const svitrkodsSet = new Set<string>();
    (unmatchedSvitrkods ?? []).forEach((row) => {
      const svitrkods = row[0] ?? "";
      const summa = row[1] ?? "";
      svitrkodsSet.add(`${svitrkods}|${summa}`);
    });

    exportRows.forEach((row, rowIndex) => {
      const veidlapasValue = row[veidlapasIndex] ?? "";
      if (veidlapasSet.has(veidlapasValue)) {
        worksheet.getRow(rowIndex + 2).getCell(veidlapasIndex + 1).fill =
          veidlapasFill;
      }

      const svitrkodsValue = row[svitrkodsIndex] ?? "";
      const summaValue = row[summaIndex] ?? "";
      if (svitrkodsSet.has(`${svitrkodsValue}|${summaValue}`)) {
        const excelRow = worksheet.getRow(rowIndex + 2);
        excelRow.getCell(svitrkodsIndex + 1).fill = svitrkodsFill;
        excelRow.getCell(summaIndex + 1).fill = svitrkodsFill;
      }
    });
  }

  const baseName = preview.fileName.replace(/\.xlsx$/i, "");
  const dateStamp = new Date().toISOString().slice(0, 10);
  const downloadName = `${baseName}-sorted-${dateStamp}.xlsx`;

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
