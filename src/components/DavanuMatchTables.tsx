import TablePreview from "./TablePreview";
import type { TableSlice } from "../lib/job/davanu_view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

type DavanuMatchTablesProps = {
  unmatchedVeidlapas: TableSlice;
  unmatchedRezervacijas: TableSlice;
  approxRezervacijas: TableSlice;
};

export default function DavanuMatchTables({
  unmatchedVeidlapas,
  unmatchedRezervacijas,
  approxRezervacijas,
}: DavanuMatchTablesProps) {
  const renderApproxCell = (
    _rowIndex: number,
    cellIndex: number,
    value: string,
    _headers: string[],
    row: string[]
  ) => {
    const codeIndex = 3;
    const veidlapasIndex = 2;
    if (cellIndex !== codeIndex) return value;
    const veidlapas = row[veidlapasIndex] ?? "";
    const code = value ?? "";
    if (!veidlapas || !code || veidlapas.length !== code.length) return value;
    let diffCount = 0;
    let diffIndex = -1;
    for (let i = 0; i < code.length; i++) {
      if (code[i] !== veidlapas[i]) {
        diffCount += 1;
        diffIndex = i;
        if (diffCount > 1) return value;
      }
    }
    if (diffCount !== 1 || diffIndex < 0) return value;
    return (
      <>
        {code.slice(0, diffIndex)}
        <span className="rounded-sm bg-green-200 px-0 font-semibold text-foreground">
          {code[diffIndex]}
        </span>
        {code.slice(diffIndex + 1)}
      </>
    );
  };

  return (
    <>
      <Card id="davanu-unmatched-veidlapas-card" className="backdrop-blur-sm">
        <CardHeader id="davanu-unmatched-veidlapas-header">
          <CardTitle>Unmatched Veidlapas Nr.</CardTitle>
          <CardDescription>Rows without a matched Rezervācijas kods.</CardDescription>
        </CardHeader>
        <CardContent id="davanu-unmatched-veidlapas-content" className="pt-0">
          <TablePreview
            headers={unmatchedVeidlapas.headers}
            rows={unmatchedVeidlapas.rows}
            loading={false}
            loadingMessage=""
            emptyMessage="Run Job to see unmatched Veidlapas."
          />
        </CardContent>
      </Card>

      <Card id="davanu-unmatched-rezervacijas-card" className="backdrop-blur-sm">
        <CardHeader id="davanu-unmatched-rezervacijas-header">
          <CardTitle>Unmatched Rezervācijas kods</CardTitle>
          <CardDescription>Rows without a Veidlapas match.</CardDescription>
        </CardHeader>
        <CardContent id="davanu-unmatched-rezervacijas-content" className="pt-0">
          <TablePreview
            headers={unmatchedRezervacijas.headers}
            rows={unmatchedRezervacijas.rows}
            loading={false}
            loadingMessage=""
            emptyMessage="Run Job to see unmatched Rezervācijas kods."
          />
        </CardContent>
      </Card>

      <Card id="davanu-approx-rezervacijas-card" className="backdrop-blur-sm">
        <CardHeader id="davanu-approx-rezervacijas-header">
          <CardTitle>Approx. Rezervācijas kods</CardTitle>
          <CardDescription>
            Found by date + amount after all filtering.
          </CardDescription>
        </CardHeader>
        <CardContent id="davanu-approx-rezervacijas-content" className="pt-0">
          <TablePreview
            headers={approxRezervacijas.headers}
            rows={approxRezervacijas.rows}
            loading={false}
            loadingMessage=""
            emptyMessage="Run Job to see approximate matches."
            renderCell={renderApproxCell}
          />
        </CardContent>
      </Card>
    </>
  );
}
