import { open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = join(projectRoot, "content");
const numberedPattern = /^(\d{2,3})_(.+)$/u;
const imageExtensions = [".webp", ".jpg", ".jpeg", ".png", ".svg"];
const maxImageBytes = 1024 * 1024;

// 每种版面需要的文字（txt）与图片。true 表示必填。
const schemas = {
  hero: {
    section: { text: { title: true, subtitle: false, cta: false }, images: { logo: true, background: false } },
  },
  figures: {
    items: { text: { label: true, value: true }, images: {} },
  },
  ip: {
    items: { text: { title: true }, images: { image: true } },
  },
  scenes: {
    gallery: true,
  },
  shows: {
    items: {
      text: { artist: true, title: true, description: false },
      images: { poster: true, detail: false },
    },
  },
  artists: {
    items: { text: { name: true, role: false, focus: false }, images: { photo: true } },
  },
  resources: {
    items: { text: { title: true, note: false }, images: { image: false, logo: false } },
  },
};
const defaultSectionText = { title: true, subtitle: false, note: false };

const toWebPath = (...segments) => ["content", ...segments].join("/");
const isImage = (name) => imageExtensions.includes(extname(name).toLowerCase());

async function readImageSize(filePath) {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(64 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const data = buffer.subarray(0, bytesRead);

    if (data.toString("ascii", 1, 4) === "PNG") {
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    }
    if (data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
      const chunk = data.toString("ascii", 12, 16);
      if (chunk === "VP8X") {
        return { width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3) };
      }
      if (chunk === "VP8L") {
        const bits = data.readUInt32LE(21);
        return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
      }
      if (chunk === "VP8 ") {
        return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
      }
    }
    if (data[0] === 0xff && data[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < data.length) {
        if (data[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = data[offset + 1];
        const length = data.readUInt16BE(offset + 2);
        const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
        if (isFrame) {
          return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5) };
        }
        offset += 2 + length;
      }
    }
    return null;
  } finally {
    await handle.close();
  }
}

async function describeImage(folderPath, fileName, label, webSegments) {
  const filePath = join(folderPath, fileName);
  const { size } = await stat(filePath);
  if (size > maxImageBytes) {
    throw new Error(`${label}/${fileName} 体积为 ${(size / 1024 / 1024).toFixed(2)} MB，单张图片不得超过 1 MB。`);
  }
  const dimensions = await readImageSize(filePath);
  return { src: toWebPath(...webSegments, fileName), ...(dimensions ?? {}) };
}

async function readFields(folderPath, label, webSegments, spec) {
  const files = (await readdir(folderPath, { withFileTypes: true })).filter((entry) => entry.isFile());
  const names = files.map((entry) => entry.name);
  const result = {};

  for (const [field, required] of Object.entries(spec.text)) {
    const fileName = `${field}.txt`;
    if (!names.includes(fileName)) {
      if (required) throw new Error(`${label} 中缺少 ${fileName}。`);
      continue;
    }
    const value = (await readFile(join(folderPath, fileName), "utf8")).replace(/^\uFEFF/u, "").trim();
    if (!value && required) throw new Error(`${label}/${fileName} 不能为空。`);
    if (value) result[field] = value;
  }

  for (const [field, required] of Object.entries(spec.images)) {
    const candidates = names.filter(
      (name) => isImage(name) && name.slice(0, -extname(name).length) === field,
    );
    if (candidates.length > 1) {
      throw new Error(`${label} 中存在多张 ${field} 图片：${candidates.join("、")}。`);
    }
    if (candidates.length === 0) {
      if (required) throw new Error(`${label} 中缺少 ${field} 图片（例如 ${field}.webp）。`);
      continue;
    }
    result[field] = await describeImage(folderPath, candidates[0], label, webSegments);
  }

  return result;
}

function sortNumbered(entries, label) {
  const numbered = entries.map((name) => {
    const match = name.match(numberedPattern);
    if (!match || !match[2].trim()) {
      throw new Error(`“${label}/${name}”命名不正确，应使用“000_名称”格式。`);
    }
    return { name, order: Number(match[1]), label: match[2] };
  });
  numbered.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN"));
  const repeated = numbered.find((item, i) => i > 0 && item.order === numbered[i - 1].order);
  if (repeated) throw new Error(`${label} 中存在重复编号 ${repeated.name.split("_")[0]}。`);
  return numbered;
}

async function readGallery(folderPath, label, folderName) {
  const files = (await readdir(folderPath, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && isImage(entry.name))
    .map((entry) => entry.name);

  return Promise.all(
    sortNumbered(files, label).map(async (file) => ({
      ...(await describeImage(folderPath, file.name, label, [folderName])),
      alt: file.label.slice(0, -extname(file.label).length),
    })),
  );
}

async function readSection(folderName) {
  const match = folderName.match(numberedPattern);
  const type = match?.[2];
  const schema = schemas[type];
  const label = `content/${folderName}`;
  if (!schema) {
    throw new Error(`${label} 的类型“${type}”无法识别，可用类型：${Object.keys(schemas).join("、")}。`);
  }

  const folderPath = join(contentRoot, folderName);
  const sectionSpec = schema.section ?? { text: defaultSectionText, images: { background: false } };
  const section = {
    id: type,
    type,
    ...(await readFields(folderPath, label, [folderName], sectionSpec)),
  };

  if (schema.gallery) {
    section.items = await readGallery(folderPath, label, folderName);
  }

  if (schema.items) {
    const folders = (await readdir(folderPath, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    section.items = await Promise.all(
      sortNumbered(folders, label).map((item) =>
        readFields(join(folderPath, item.name), `${label}/${item.name}`, [folderName, item.name], schema.items),
      ),
    );
  }

  if (section.items && section.items.length === 0) {
    throw new Error(`${label} 中至少需要一项内容。`);
  }

  return section;
}

const sectionFolders = (await readdir(contentRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const sections = [];
for (const folder of sortNumbered(sectionFolders, "content")) {
  sections.push(await readSection(folder.name));
}

const repeatedType = sections.find((section, i) => sections.findIndex((s) => s.type === section.type) !== i);
if (repeatedType) throw new Error(`content 中存在两个 ${repeatedType.type} 版面。`);

const outputPath = join(contentRoot, "index.json");
await writeFile(outputPath, `${JSON.stringify({ sections }, null, 2)}\n`, "utf8");
console.log(`已生成 ${outputPath}（${sections.length} 个版面）`);
