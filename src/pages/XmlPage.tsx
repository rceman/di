import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import TablePreview from "../components/TablePreview";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  downloadQuarterlyXml,
  parseQuarterlyXmlWorkbook,
  type QuarterlyXmlPreview,
} from "../lib/xml/quarterly";

export default function XmlPage() {
  const [preview, setPreview] = useState<QuarterlyXmlPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!preview) {
      return "Upload an .xlsx report file to prepare XML.";
    }
    return `${preview.xmlData.companyName || "Unknown company"} | ${preview.rows.length} valid rows`;
  }, [preview]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setPreview(null);

    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Only .xlsx files are supported.");
      return;
    }

    setLoading(true);
    try {
      const next = await parseQuarterlyXmlWorkbook(file);
      setPreview(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse Excel file.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Upload XLSX</CardTitle>
          <CardDescription>
            Convert the quarterly report workbook into XML.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-nowrap items-center justify-between gap-4">
            <Input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              aria-label="Upload quarterly report .xlsx"
              className="w-3/5 min-w-0"
            />
            <Button
              type="button"
              className="w-2/5 whitespace-nowrap px-8"
              disabled={!preview || loading}
              onClick={() => {
                if (preview) {
                  downloadQuarterlyXml(preview);
                }
              }}
            >
              Download XML
            </Button>
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {preview?.fileName ?? "No file selected"}
            </p>
            <p className="text-xs text-muted-foreground">{summary}</p>
          </div>
          {preview?.warnings.length ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {preview.warnings.map((warning, index) => (
                <p key={`xml-warning-${index}`}>{warning}</p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Rows that will be exported into XML.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <TablePreview
            headers={preview?.headers ?? []}
            rows={preview?.rows ?? []}
            loading={loading}
            loadingMessage="Parsing workbook..."
            emptyMessage="Upload .xlsx to preview rows."
          />
        </CardContent>
      </Card>
    </>
  );
}
