import type { ReactNode } from "react";
import type { CSSProperties } from "react";

type TablePreviewProps = {
  headers: string[];
  rows: string[][];
  loading: boolean;
  loadingMessage: string;
  emptyMessage: string;
  getCellClassName?: (rowIndex: number, cellIndex: number) => string;
  getColumnStyle?: (cellIndex: number) => CSSProperties | undefined;
  renderCell?: (
    rowIndex: number,
    cellIndex: number,
    value: string,
    headers: string[],
    row: string[]
  ) => ReactNode;
};

export default function TablePreview({
  headers,
  rows,
  loading,
  loadingMessage,
  emptyMessage,
  getCellClassName,
  getColumnStyle,
  renderCell,
}: TablePreviewProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-background/70 p-6 text-sm text-muted-foreground">
        {loadingMessage}
      </div>
    );
  }

  if (headers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background/60 p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="max-h-[360px] overflow-auto rounded-lg border border-border bg-background/70">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-background">
          <tr>
            {headers.map((header, index) => (
              <th
                key={`preview-header-${index}`}
                className="border-b border-border px-3 py-2 font-semibold text-foreground"
                style={getColumnStyle?.(index)}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-muted-foreground"
              >
                No rows extracted.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={`preview-row-${rowIndex}`} className="odd:bg-muted/40">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`preview-cell-${rowIndex}-${cellIndex}`}
                    className={`border-b border-border px-3 py-2 text-muted-foreground ${getCellClassName?.(rowIndex, cellIndex) ?? ""}`}
                    style={getColumnStyle?.(cellIndex)}
                  >
                    {renderCell
                      ? renderCell(rowIndex, cellIndex, cell, headers, row)
                      : cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
