export type QuarterlyXmlRow = {
  groupCode: "I" | "A";
  registrationDate: string;
  series: string;
  numberFrom: string;
  numberTo: string;
  amount: string | null;
};

export type QuarterlyXmlData = {
  isCorrection: boolean;
  declarationId: string;
  declarationUid: string;
  registrationNumber: string;
  companyName: string;
  address: string;
  periodFrom: string;
  periodTo: string;
  year: string;
  quarter: string;
  submitterType: string;
  receiptType: string;
  preparer: string;
  phone: string;
  email: string;
  signer: string;
  signerIdentityNo: string;
  signerRole: string;
  signerEmail: string;
  rows: QuarterlyXmlRow[];
};

export type QuarterlyXmlPreview = {
  fileName: string;
  headers: string[];
  rows: string[][];
  xmlData: QuarterlyXmlData;
  warnings: string[];
};
