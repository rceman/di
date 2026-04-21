# XML Feature Notes

This file describes how `xlsx -> xml` conversion works for the quarterly report.

## Mapping from XLSX to XML

XLSX labels are read from column `A`, values from column `C`.

- `Reģistrācijas numurs` -> `NmrKods`, `TaxPayerNo`
- `Nosaukums` -> `TaxPayerName`
- `Adrese` -> `AddressForResponse`
- `Taksācijas periods no` -> `DatumsNo`
- `līdz` -> `DatumsLidz`
- `Informācija par iesniedzēju` -> `IesniedzejaVeids` (mapped code)
- `Kvīšu numuru reģistrēšanas` (+ `veids` context) -> `KvisuVeids` (mapped code)
- `Sagatavoja vārds, uzvārds` -> `Izpilditajs`, `Drawer`
- `Sagatavoja E-pasts` -> `Epasts`
- `Sagatavoja Tālrunis` -> `Talrunis`
- `Parakstītāja vārds, uzvārds` -> `Signer`
- `Parakstītāja personas kods` -> `SignerIdentityNo`
- `Parakstītāja prof.` -> `SignerRole`
- `Parakstītāja E-pasts` -> `EmailForResponse`

Optional direct override labels:
- `Precizejums` -> `Precizejums`, `IsCorrectionDocument`
- `Id` -> XML `<Id>`
- `UID` -> XML `<UID>`

If these optional fields are missing:
- `Precizejums` defaults to `false`
- `Id` is generated from `DatumsLidz + last 6 digits of registration number`
- `UID` is generated as a UUID

## Table row mapping

Rows are read from the table section:
- `Izlietots` -> `Grupa = I`
- `Anulēts` -> `Grupa = A`
- Date -> `DatumsReg`
- Series -> `Serija`
- Number from -> `NumursNo`
- Number to -> `NumursLidz`
- Amount -> `Summa` (for `Anulēts`, `Summa xsi:nil="true"`)

## Why the beginning of XML could look wrong

Previous implementation issues:
- Preparer/signer metadata from rows 10-16 was not fully mapped.
- Some fields were fallback-generated (`Id`, `UID`) when not provided in XLSX.
- Timestamp format used UTC `Z`, while examples show local offset.

Current behavior:
- `Izpilditajs`, `Talrunis`, `Epasts`, `Gads`, `Ceturksnis`, `IesniedzejaVeids`, `KvisuVeids`, and `UserCredentials` fields are filled from XLSX mapping.
- Timestamp is emitted with local timezone offset (`+HH:MM` / `-HH:MM`).

## Still fixed by design

The following blocks are still static placeholders unless product requirements change:
- `Declaration Id="DEC"`
- `UserCredentials Id="UC_1"`
- Per-row `DatumsIzrakstisanas xsi:nil="true"`
- Per-row empty `VardsUzvards`, `PersonasKods`, `Hash`
- Per-row `Detalizacija/RD` default values (`Vertiba=0`, `PvnSumma=0`, `Summa=0`, other fields `xsi:nil="true"`)
- XML Signature block is not generated
