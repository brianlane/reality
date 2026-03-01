import fs from "fs";
import path from "path";

const limitKb = Number(process.env.BUNDLE_SIZE_LIMIT_KB ?? "1750");
const chunksDir = path.join(process.cwd(), ".next", "static", "chunks");

if (!fs.existsSync(chunksDir)) {
  console.error("Bundle chunks not found. Run `npm run build` first.");
  process.exit(1);
}

const entries = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.name.endsWith(".js") || entry.name.endsWith(".js.map")) {
      continue;
    }
    const { size } = fs.statSync(fullPath);
    entries.push({ path: fullPath, size });
  }
};

walk(chunksDir);

const totalBytes = entries.reduce((sum, { size }) => sum + size, 0);
const totalKb = Math.ceil(totalBytes / 1024);

entries.sort((a, b) => b.size - a.size);
const top = entries.slice(0, 5);

console.log(`Total JS chunks size: ${totalKb} KB`);
top.forEach(({ path: filePath, size }) => {
  const rel = path.relative(process.cwd(), filePath);
  const kb = Math.ceil(size / 1024);
  console.log(`- ${rel}: ${kb} KB`);
});

if (totalKb > limitKb) {
  console.error(
    `Bundle size ${totalKb} KB exceeds limit ${limitKb} KB. ` +
      "Set BUNDLE_SIZE_LIMIT_KB to adjust.",
  );
  process.exit(1);
}
