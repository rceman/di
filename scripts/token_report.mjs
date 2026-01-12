import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { get_encoding } from "tiktoken";

const [targetDir = "src", encodingName = "o200k_base"] = process.argv.slice(2);
const resolvedDir = path.resolve(targetDir);

if (!fs.existsSync(resolvedDir)) {
  console.error(`Directory not found: ${resolvedDir}`);
  process.exit(1);
}

const encoding = get_encoding(encodingName);

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
};

const isWorkFile = (filePath) =>
  [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(
    path.extname(filePath)
  );

const files = walk(resolvedDir).filter(isWorkFile);
const rows = files.map((filePath) => {
  const text = fs.readFileSync(filePath, "utf8");
  const tokens = encoding.encode(text).length;
  return {
    filePath: path.relative(process.cwd(), filePath),
    tokens,
  };
});

rows.sort((a, b) => b.tokens - a.tokens);
rows.forEach((row) => {
  console.log(`${row.tokens}\t${row.filePath}`);
});

encoding.free();
