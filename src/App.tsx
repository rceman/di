import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import ExcelJS from "exceljs";

import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";

const RUN_JOB_LABEL = "Run Job: Svitrkods Lieliska DK";

type PreviewData = {
  headers: string[];
  rows: string[][];
  rowCount: number;
  colCount: number;
  sheetName: string;
  fileName: string;
  columnWidths: Array<number | undefined>;
  columnNumFmts: Array<string | undefined>;
  sourceRowCount: number;
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

const getLastFourDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
};

const pickHeaderValue = (cell: ExcelJS.Cell, index: number) => {
  const text = formatCellValue(cell).trim();
  return text.length > 0 ? text : `Column ${index}`;
};

const createCsv = (headers: string[], rows: string[][]) => {
  const escapeValue = (value: string) => {
    const normalized = value ?? "";
    if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }
    return normalized;
  };

  const lines = [
    headers.map(escapeValue).join(","),
    ...rows.map((row) => row.map(escapeValue).join(",")),
  ];

  return `${lines.join("\n")}\n`;
};

const downloadTable = (headers: string[], rows: string[][], name: string) => {
  const csv = createCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

const downloadPreviewXlsx = async (
  headers: string[],
  rows: string[][],
  columnWidths: Array<number | undefined>,
  columnNumFmts: Array<string | undefined>,
  fileName: string,
  unmatchedRows: string[][] | null,
  unmatchedSvitrkods: string[][] | null
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Preview");

  const lastColumnIndex = headers.length - 1;
  const dokumentaSummaIndex = 5;
  const normalizeNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const normalized = trimmed.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };
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

  worksheet.addRow(headers);
  exportRows.forEach((row) => {
    const excelRow = worksheet.addRow(row);
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
  columnWidths.forEach((width, index) => {
    if (typeof width === "number" && width > 0) {
      worksheet.getColumn(index + 1).width = width;
    }
  });
  columnNumFmts.forEach((format, index) => {
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

  const baseName = fileName.replace(/\.xlsx$/i, "");
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

export default function App() {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unmatchedRows, setUnmatchedRows] = useState<string[][] | null>(null);
  const [unmatchedSvitrkods, setUnmatchedSvitrkods] = useState<string[][] | null>(
    null
  );
  const [hasRunJob, setHasRunJob] = useState(false);

  const summary = useMemo(() => {
    if (!preview) {
      return "Upload .xlsx to preview the first worksheet.";
    }

    return `${preview.sheetName} - ${preview.rowCount} rows - ${preview.colCount} columns`;
  }, [preview]);

  const handleRunJob = () => {
    if (!preview) {
      alert("Upload .xlsx first.");
      return;
    }

    const columnCount = preview.headers.length;
    if (columnCount < 3) {
      alert("Need at least 3 columns to run this job.");
      return;
    }

    const veidlapasIndex = columnCount - 3;
    const svitrkodsIndex = columnCount - 2;
    const summaIndex = columnCount - 1;
    const originalRows = preview.rows;
    const sourceRows = originalRows.slice(0, preview.sourceRowCount);
    const baseRows = sourceRows.map((row) => row.slice());
    const usedTargets = new Set<number>();
    const unmatchedSourceRows: string[][] = [];
    const tempPairs = Array.from({ length: sourceRows.length }, () => ({
      svitrkods: "",
      summa: "",
    }));

    sourceRows.forEach((row) => {
      const svitrkods = row[svitrkodsIndex] ?? "";
      const summa = row[summaIndex] ?? "";
      const lastFour = getLastFourDigits(svitrkods);
      if (!lastFour) {
        unmatchedSourceRows.push([svitrkods, summa]);
        return;
      }

      const matches = sourceRows
        .map((targetRow, targetIndex) => ({
          targetIndex,
          veidlapas: targetRow[veidlapasIndex] ?? "",
          dokumentaSumma: targetRow[5] ?? "",
        }))
        .filter(({ veidlapas }) =>
          getLastFourDigits(veidlapas).endsWith(lastFour)
        );

      if (matches.length === 0) {
        unmatchedSourceRows.push([svitrkods, summa]);
        return;
      }

      const hasSumColumn = columnCount > 5;
      const sumMatches = hasSumColumn
        ? matches.filter((match) => match.dokumentaSumma === summa)
        : [];
      const availableSumMatch = sumMatches.find(
        (match) => !usedTargets.has(match.targetIndex)
      );
      const available = matches.find(
        (match) => !usedTargets.has(match.targetIndex)
      );
      const chosen =
        availableSumMatch ?? available ?? sumMatches[0] ?? matches[0];
      usedTargets.add(chosen.targetIndex);
      tempPairs[chosen.targetIndex] = { svitrkods, summa };
    });

    const mergedRows = baseRows.map((row, index) => {
      const next = row.slice();
      next[svitrkodsIndex] = tempPairs[index].svitrkods;
      next[summaIndex] = tempPairs[index].summa;
      return next;
    });

    const unmatchedVeidlapas = mergedRows.filter(
      (row) => !row[svitrkodsIndex] && !row[summaIndex]
    );
    const trimmedRows = mergedRows.filter((row) =>
      row.some((cell) => cell.trim().length > 0)
    );

    const appendedRows = unmatchedSourceRows.map((pair) => {
      const padded = Array.from({ length: columnCount }, () => "");
      padded[svitrkodsIndex] = pair[0] ?? "";
      padded[summaIndex] = pair[1] ?? "";
      return padded;
    });

    setPreview({
      ...preview,
      rows: trimmedRows.concat(appendedRows),
      sourceRowCount: trimmedRows.length,
    });
    setUnmatchedRows(
      unmatchedVeidlapas.map((row) => row.slice(0, Math.max(columnCount - 2, 0)))
    );
    setUnmatchedSvitrkods(unmatchedSourceRows);
    setHasRunJob(true);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      setError(null);
      setUnmatchedRows(null);
      setUnmatchedSvitrkods(null);
      setHasRunJob(false);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setPreview(null);
      setError("Only .xlsx files are supported.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
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

      setPreview({
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
      });
      setUnmatchedRows(null);
      setUnmatchedSvitrkods(null);
      setHasRunJob(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to read workbook.";
      setPreview(null);
      setError(message);
      setUnmatchedRows(null);
      setUnmatchedSvitrkods(null);
      setHasRunJob(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="app-shell"
      className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.18),_transparent_55%),radial-gradient(circle_at_bottom,_hsl(var(--accent)/0.3),_transparent_45%)]"
    >
      <div
        id="app-container"
        className="mx-auto flex w-full max-w-none flex-col gap-6 px-2 py-10 md:px-4"
      >
        <header id="app-header" className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Stage 1 Workbook Intake
          </p>
          <h1 className="text-4xl font-semibold text-foreground md:text-5xl">
            Upload an .xlsx file.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Choose a workbook to load the first worksheet into the table below.
          </p>
        </header>

        <div id="app-content" className="flex flex-col gap-6">
          <Card id="upload-card" className="backdrop-blur-sm">
            <CardHeader id="upload-card-header">
              <CardTitle>Upload</CardTitle>
              <CardDescription>
                Choose a .xlsx file to generate a preview table.
              </CardDescription>
            </CardHeader>
            <CardContent id="upload-card-content" className="flex flex-col gap-4">
              <div
                id="upload-actions"
                className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              >
                <Input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  aria-label="Upload .xlsx"
                  className="md:max-w-xs"
                />
                <Button
                  type="button"
                  onClick={handleRunJob}
                >
                  {RUN_JOB_LABEL}
                </Button>
              </div>
              {error ? (
                <p
                  id="upload-error"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
              {preview ? (
                <div
                  id="upload-summary"
                  className="rounded-lg border border-border bg-muted/40 px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {preview.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">{summary}</p>
                </div>
              ) : null}
            </CardContent>
            <CardFooter
              id="upload-card-footer"
              className="flex flex-col items-start gap-2 text-xs text-muted-foreground"
            >
              <span>Tip: Only the first worksheet is read.</span>
            </CardFooter>
          </Card>

          <Card id="table-card" className="backdrop-blur-sm">
            <CardContent id="table-card-content" className="pt-6">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div id="table-summary" className="text-sm text-muted-foreground">
                  {summary}
                </div>
                {hasRunJob && preview ? (
                  <Button
                    id="table-download"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadPreviewXlsx(
                        preview.headers,
                        preview.rows,
                        preview.columnWidths,
                        preview.columnNumFmts,
                        preview.fileName,
                        unmatchedRows,
                        unmatchedSvitrkods
                      )
                    }
                  >
                    Download table
                  </Button>
                ) : null}
              </div>
              {loading ? (
                <div
                  id="table-loading"
                  className="rounded-lg border border-border bg-background/70 p-6 text-sm text-muted-foreground"
                >
                  Parsing workbook...
                </div>
              ) : preview && preview.headers.length > 0 ? (
                <div
                  id="table-scroll"
                  className="max-h-[360px] overflow-auto rounded-lg border border-border bg-background/70"
                >
                  <table
                    id="preview-table"
                    className="w-full border-collapse text-left text-sm"
                  >
                    <thead
                      id="preview-table-header"
                      className="sticky top-0 bg-background"
                    >
                      <tr>
                        {preview.headers.map((header, index) => (
                          <th
                            key={`header-${index}`}
                            className="border-b border-border px-3 py-2 font-semibold text-foreground"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody id="preview-table-body">
                      {preview.rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={preview.headers.length}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            Worksheet is empty after the header row.
                          </td>
                        </tr>
                      ) : (
                        preview.rows.map((row, rowIndex) => (
                          <tr key={`row-${rowIndex}`} className="odd:bg-muted/40">
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`cell-${rowIndex}-${cellIndex}`}
                                className="border-b border-border px-3 py-2 text-muted-foreground"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  id="table-empty"
                  className="rounded-lg border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground"
                >
                  Upload .xlsx to preview.
                </div>
              )}
            </CardContent>
            <CardFooter id="table-card-footer" className="justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Preview is generated from the first worksheet only.
              </p>
            </CardFooter>
          </Card>

          <Card id="unmatched-card" className="backdrop-blur-sm">
            <CardHeader id="unmatched-card-header">
              <CardTitle>Unmatched Veidlapas</CardTitle>
              <CardDescription>
                Rows without a matched Svitrkods after Run Job.
              </CardDescription>
            </CardHeader>
            <CardContent id="unmatched-card-content" className="pt-0">
              <div className="mb-3 flex justify-end">
                {hasRunJob && preview && unmatchedRows ? (
                  <Button
                    id="unmatched-download"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadTable(
                        preview.headers.slice(0, -2),
                        unmatchedRows,
                        "unmatched-veidlapas.csv"
                      )
                    }
                  >
                    Download table
                  </Button>
                ) : null}
              </div>
              {unmatchedRows && preview && preview.headers.length > 2 ? (
                <div
                  id="unmatched-table-scroll"
                  className="max-h-[320px] overflow-auto rounded-lg border border-border bg-background/70"
                >
                  <table
                    id="unmatched-table"
                    className="w-full border-collapse text-left text-sm"
                  >
                    <thead
                      id="unmatched-table-header"
                      className="sticky top-0 bg-background"
                    >
                      <tr>
                        {preview.headers.slice(0, -2).map((header, index) => (
                          <th
                            key={`unmatched-header-${index}`}
                            className="border-b border-border px-3 py-2 font-semibold text-foreground"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody id="unmatched-table-body">
                      {unmatchedRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.max(preview.headers.length - 2, 1)}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            All rows matched.
                          </td>
                        </tr>
                      ) : (
                        unmatchedRows.map((row, rowIndex) => (
                          <tr key={`unmatched-row-${rowIndex}`} className="odd:bg-muted/40">
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`unmatched-cell-${rowIndex}-${cellIndex}`}
                                className="border-b border-border px-3 py-2 text-muted-foreground"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  id="unmatched-empty"
                  className="rounded-lg border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground"
                >
                  Run Job to see unmatched rows.
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="unmatched-svitrkods-card" className="backdrop-blur-sm">
            <CardHeader id="unmatched-svitrkods-card-header">
              <CardTitle>Unmatched Svitrkods</CardTitle>
              <CardDescription>
                Svitrkods and Summa values without a Veidlapas match.
              </CardDescription>
            </CardHeader>
            <CardContent id="unmatched-svitrkods-card-content" className="pt-0">
              <div className="mb-3 flex justify-end">
                {hasRunJob && preview && unmatchedSvitrkods ? (
                  <Button
                    id="unmatched-svitrkods-download"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadTable(
                        preview.headers.slice(-2),
                        unmatchedSvitrkods,
                        "unmatched-svitrkods.csv"
                      )
                    }
                  >
                    Download table
                  </Button>
                ) : null}
              </div>
              {unmatchedSvitrkods && preview && preview.headers.length > 1 ? (
                <div
                  id="unmatched-svitrkods-table-scroll"
                  className="max-h-[320px] overflow-auto rounded-lg border border-border bg-background/70"
                >
                  <table
                    id="unmatched-svitrkods-table"
                    className="w-full border-collapse text-left text-sm"
                  >
                    <thead
                      id="unmatched-svitrkods-table-header"
                      className="sticky top-0 bg-background"
                    >
                      <tr>
                        {preview.headers.slice(-2).map((header, index) => (
                          <th
                            key={`unmatched-svitrkods-header-${index}`}
                            className="border-b border-border px-3 py-2 font-semibold text-foreground"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody id="unmatched-svitrkods-table-body">
                      {unmatchedSvitrkods.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.max(preview.headers.length, 2)}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            All svitrkods matched.
                          </td>
                        </tr>
                      ) : (
                        unmatchedSvitrkods.map((row, rowIndex) => (
                          <tr
                            key={`unmatched-svitrkods-row-${rowIndex}`}
                            className="odd:bg-muted/40"
                          >
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`unmatched-svitrkods-cell-${rowIndex}-${cellIndex}`}
                                className="border-b border-border px-3 py-2 text-muted-foreground"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  id="unmatched-svitrkods-empty"
                  className="rounded-lg border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground"
                >
                  Run Job to see unmatched svitrkods.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
