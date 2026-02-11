import { describe, expect, it } from "vitest";

import { findDavanuHeaderLineIndex } from "../src/lib/pdf/davanu_header.ts";

describe("davanu parser header detection", () => {
  it("does not detect header in the real first-page intro text", () => {
    const lines = [
      { items: [{ str: "SASKAŅOŠANAS AKTS", x: 10 }] },
      { items: [{ str: "2026-01-31", x: 10 }] },
      { items: [{ str: "Sērija SA Nr. 84151/2026/01", x: 10 }] },
      {
        items: [
          {
            str: "Mēs, Dāvanu Serviss SIA (turpmāk – \"Starpnieks\"), kuru pārstāv zemāk parakstījusies persona un GIVEN LATVIA SIA (turpmāk –",
            x: 10,
          },
        ],
      },
      {
        items: [
          {
            str: ",,Pakalpojumu sniedzējs”), kuru pārstāv 749_Given_2022, (turpmāk kopā sauktas – ,,Puses”) esam vienojušies un noslēguši šo saskaņošanas",
            x: 10,
          },
        ],
      },
      { items: [{ str: "aktu, ar kuru apliecinām, ka:", x: 10 }] },
      {
        items: [
          { str: "1. Pakalpojumu sniedzējs ir sniedzis pakalpojumus:", x: 10 },
        ],
      },
    ];

    expect(findDavanuHeaderLineIndex(lines)).toBe(-1);
  });

  it("does not treat first-page intro text as table header", () => {
    const lines = [
      { items: [{ str: "SASKANOSANAS AKTS", x: 10 }] },
      { items: [{ str: "2026-01-31", x: 10 }] },
      { items: [{ str: "1. Pakalpojumu sniedzejs ir sniedzis pakalpojumus:", x: 10 }] },
      { items: [{ str: "2. Sis akts ir sastadits divos eksemplaros...", x: 10 }] },
    ];

    expect(findDavanuHeaderLineIndex(lines)).toBe(-1);
  });

  it("detects table header when Rezervacijas kods is present", () => {
    const lines = [
      {
        items: [
          { str: "Nr.", x: 10 },
          { str: "Rezervacijas", x: 80 },
          { str: "kods", x: 140 },
          { str: "Pakalpojuma nosaukums", x: 220 },
          { str: "Sistema atzimets", x: 420 },
          { str: "Starpnieka komisija, €", x: 540 },
          { str: "Starpnieka komisija, %", x: 650 },
          { str: "Pardosanas cena", x: 760 },
        ],
      },
      {
        items: [
          { str: "1", x: 10 },
          { str: "ABC123", x: 80 },
          { str: "Davanu karte", x: 220 },
          { str: "2026-01-05 11:53", x: 420 },
          { str: "9 €", x: 540 },
          { str: "20 %", x: 650 },
          { str: "45 €", x: 760 },
        ],
      },
    ];

    const result = findDavanuHeaderLineIndex(lines);
    expect(result).toBe(0);
  });
});
