import { readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const photosRoot = join(projectRoot, "photos");
const supportedExtensions = new Set([".webp", ".jpg", ".jpeg", ".png", ".svg"]);
const filePattern = /^(\d{3})_(.+)\.(webp|jpe?g|png|svg)$/iu;
const entries = await readdir(photosRoot, { withFileTypes: true });

const photos = entries
  .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
  .map((entry) => {
    const match = entry.name.match(filePattern);

    if (!match) {
      throw new Error(`照片“photos/${entry.name}”命名不正确，应使用“000_名称.jpg”格式。`);
    }

    return {
      file: entry.name,
      order: Number(match[1]),
    };
  })
  .sort((a, b) => a.order - b.order || a.file.localeCompare(b.file, "zh-CN"));

const repeatedOrder = photos.find(
  (photo, position) => position > 0 && photo.order === photos[position - 1].order,
);

if (repeatedOrder) {
  throw new Error(`photos 中存在重复编号 ${String(repeatedOrder.order).padStart(3, "0")}。`);
}

const outputPath = join(photosRoot, "index.json");
await writeFile(outputPath, `${JSON.stringify(photos.map((photo) => photo.file), null, 2)}\n`, "utf8");
console.log(`已生成 ${outputPath}`);
