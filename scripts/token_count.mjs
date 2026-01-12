import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { get_encoding } from "tiktoken";

const [targetPath, encodingName = "o200k_base"] = process.argv.slice(2);

if (!targetPath) {
  console.error("Usage: node scripts/token_count.mjs <file> [encoding]");
  process.exit(1);
}

const resolved = path.resolve(targetPath);
if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

const text = fs.readFileSync(resolved, "utf8");
const encoding = get_encoding(encodingName);
const tokens = encoding.encode(text);
console.log(`${resolved}: ${tokens.length} tokens (${encodingName})`);
encoding.free();
