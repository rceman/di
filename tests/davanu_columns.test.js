import { describe, expect, it } from "vitest";

import {
  getDavanuPdfCodeIndex,
  getDavanuPdfDateIndex,
  getDavanuPdfSumIndex,
} from "../src/lib/job/davanu_columns.ts";

describe("davanu PDF column detection", () => {
  it("finds code/date/sum by header names in normal layout", () => {
    const headers = [
      "Nr.",
      "Rezervacijas kods",
      "Pakalpojuma nosaukums",
      "Sistema atzimets",
      "Starpnieka komisija, €",
      "Starpnieka komisija, %",
      "Pardosanas cena",
    ];

    expect(getDavanuPdfCodeIndex(headers)).toBe(1);
    expect(getDavanuPdfDateIndex(headers)).toBe(3);
    expect(getDavanuPdfSumIndex(headers)).toBe(6);
  });

  it("finds columns with wrapped/extended header text", () => {
    const headers = [
      "Nr.",
      "Rezervacijas",
      "Kods",
      "Pakalpojuma nosaukums",
      "Sistēmā Starpnieka atzīmēts",
      "Pardošanas",
      "cena",
    ];

    expect(getDavanuPdfCodeIndex(headers)).toBe(1);
    expect(getDavanuPdfDateIndex(headers)).toBe(4);
    expect(getDavanuPdfSumIndex(headers)).toBe(6);
  });
});
