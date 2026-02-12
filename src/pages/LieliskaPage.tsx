import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import TablePreview from "../components/TablePreview";
import {
  downloadLieliskaXlsx,
  parseLieliskaWorkbook,
  type ExcelPreviewData,
} from "../lib/excel/lieliska";
import { ensureLieliskaRunSchema, runLieliskaJob } from "../lib/job/lieliska";

const RUN_JOB_LABEL = "Run Job";
const DOWNLOAD_LABEL = "Download Table";

export default function LieliskaPage() {
  const [preview, setPreview] = useState<ExcelPreviewData | null>(null);
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

  const getPreviewCellClass = (rowIndex: number, cellIndex: number) => {
    if (!preview || preview.headers.length < 3) {
      return "";
    }

    const veidlapasIndex = preview.headers.length - 3;
    const svitrkodsIndex = preview.headers.length - 2;
    const summaIndex = preview.headers.length - 1;
    const row = preview.rows[rowIndex] ?? [];
    const veidlapas = (row[veidlapasIndex] ?? "").trim();
    const svitrkods = (row[svitrkodsIndex] ?? "").trim();
    const summa = (row[summaIndex] ?? "").trim();

    const isRedRow = Boolean(veidlapas) && !svitrkods && !summa;
    if (isRedRow && (cellIndex === veidlapasIndex || cellIndex === svitrkodsIndex || cellIndex === summaIndex)) {
      return "bg-red-100 text-red-900 font-semibold";
    }

    const isYellowRow = !veidlapas && (svitrkods.length > 0 || summa.length > 0);
    if (isYellowRow && (cellIndex === svitrkodsIndex || cellIndex === summaIndex)) {
      return "bg-yellow-100 text-yellow-900 font-semibold";
    }

    return "";
  };

  const handleRunJob = () => {
    if (!preview) {
      alert("Upload .xlsx first.");
      return;
    }

    if (preview.headers.length < 3) {
      alert("Need at least 3 columns to run this job.");
      return;
    }

    let result;
    try {
      const normalizedPreview = ensureLieliskaRunSchema(preview);
      result = runLieliskaJob(normalizedPreview);
      setPreview({
        ...normalizedPreview,
        rows: result.rows,
        sourceRowCount: result.sourceRowCount,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Run Job failed for this file.";
      alert(message);
      return;
    }
    setUnmatchedRows(result.unmatchedRows);
    setUnmatchedSvitrkods(result.unmatchedSvitrkods);
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
      const nextPreview = await parseLieliskaWorkbook(file);
      setPreview(nextPreview);
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
    <>
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
            className="flex flex-nowrap items-center justify-between gap-4"
          >
            <Input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              aria-label="Upload .xlsx"
              className="w-3/5 min-w-0"
            />
            <div className="flex w-2/5 items-center gap-6">
              <Button
                type="button"
                className="w-1/2 whitespace-nowrap px-8"
                onClick={handleRunJob}
              >
                {RUN_JOB_LABEL}
              </Button>
              {hasRunJob && preview ? (
                <Button
                  id="upload-download"
                  type="button"
                  variant="outline"
                  className="w-1/2 whitespace-nowrap px-8"
                  onClick={() =>
                    downloadLieliskaXlsx(preview, unmatchedRows, unmatchedSvitrkods)
                  }
                >
                  {DOWNLOAD_LABEL}
                </Button>
              ) : null}
            </div>
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
          </div>
          {loading ? (
            <TablePreview
              headers={[]}
              rows={[]}
              loading={true}
              loadingMessage="Parsing workbook..."
              emptyMessage="Upload .xlsx to preview."
            />
          ) : (
            <TablePreview
              headers={preview?.headers ?? []}
              rows={preview?.rows ?? []}
              loading={false}
              loadingMessage="Parsing workbook..."
              emptyMessage="Upload .xlsx to preview."
              getCellClassName={getPreviewCellClass}
            />
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
          {unmatchedRows && preview && preview.headers.length > 2 ? (
            <div className="max-h-[320px] overflow-auto rounded-lg border border-border bg-background/70">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-background">
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
                <tbody>
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
            <div className="rounded-lg border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
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
          {unmatchedSvitrkods && preview && preview.headers.length > 1 ? (
            <div className="max-h-[320px] overflow-auto rounded-lg border border-border bg-background/70">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-background">
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
                <tbody>
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
            <div className="rounded-lg border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
              Run Job to see unmatched svitrkods.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
