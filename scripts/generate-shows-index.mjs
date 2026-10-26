import { readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const showsRoot = join(projectRoot, "shows");
const categories = ["now-playing", "previous-shows"];
const folderPattern = /^(\d{3})_(.+)$/u;
const imageFileNames = ["photo.webp", "photo.jpg", "photo.jpeg", "photo.png", "photo.svg"];
const index = {};

for (const category of categories) {
  const entries = await readdir(join(showsRoot, category), { withFileTypes: true });
  const folders = [];

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const contents = await readdir(join(showsRoot, category, entry.name));
    if (contents.length === 0) continue;

    const match = entry.name.match(folderPattern);

    if (!match) {
      throw new Error(
        `文件夹“shows/${category}/${entry.name}”命名不正确，应使用“000_演员名”格式。`,
      );
    }

    const photo = imageFileNames.find((fileName) => contents.includes(fileName));
    if (!photo) throw new Error(`shows/${category}/${entry.name} 中缺少 photo 图片。`);

    folders.push({
      name: entry.name,
      order: Number(match[1]),
      photo,
    });
  }

  folders.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN"));

  const repeatedOrder = folders.find(
    (folder, position) => position > 0 && folder.order === folders[position - 1].order,
  );

  if (repeatedOrder) {
    throw new Error(`shows/${category} 中存在重复编号 ${String(repeatedOrder.order).padStart(3, "0")}。`);
  }

  index[category] = folders.map((folder) => ({
    folder: folder.name,
    photo: folder.photo,
  }));
}

const outputPath = join(showsRoot, "index.json");
await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(`已生成 ${outputPath}`);
