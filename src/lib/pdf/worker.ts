import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min?url";

let configured = false;

export const configurePdfWorker = () => {
  if (configured) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  configured = true;
};
