# Stand:by 网站维护说明

这是一个以手机端为主的单页网站。页面按照 Slogan、Show、Photos、Comedian、Business 的顺序向下展示，不包含子页面。

日常更新演出或照片时，只需要按照本文规则修改资料文件，然后重新生成索引，不需要修改 HTML、CSS 或 JavaScript。

## 目录结构

```text
StandbyWeb/
├── .github/workflows/        GitHub Pages 自动部署配置
├── fonts/                    网站字体和字体授权文件
├── photos/                   Photos 轮播照片
├── scripts/                  资料检查与索引生成脚本
├── shows/                    Show 演出资料
│   ├── now-playing/          正在演出的项目
│   └── previous-shows/       过往演出项目
├── slogan/                   Slogan 背景图及图片来源说明
├── index.html                页面结构和文字入口
├── script.js                 Show、Photos、弹窗和导航交互
├── styles.css                页面样式及手机端适配
└── README.md                 本说明文件
```

## 根目录文件

### `index.html`

定义菜单栏和所有页面栏目。除修改固定标题、菜单名称或增加新栏目外，不需要日常编辑。

### `styles.css`

负责字体、颜色、间距、海报尺寸、照片轮播、详情弹窗和响应式布局。不要在资料文件夹内添加额外 CSS。

### `script.js`

读取 `shows/index.json` 和 `photos/index.json`，生成演出卡片、详情弹窗及照片轮播。日常更新内容时不需要修改。

### `.gitignore`

忽略 macOS 自动产生的 `.DS_Store` 文件，避免无关系统文件被上传。

## `shows/`：演出资料

### 栏目文件夹

- `shows/now-playing/`：对应 **Now Playing / 正在演出**。
- `shows/previous-shows/`：对应 **Previous Shows / 过往演出**。
- `shows/index.json`：网页读取的演出索引，由脚本自动生成，不要手动编辑。
- `shows/README.txt`：Show 文件夹内的简版维护提示。

### 单场演出文件夹命名

格式必须为：

```text
三位数字_演员名
```

例如：

```text
000_演员A
001_演员B、演员C
100_演员D
```

规则：

1. 编号必须为 `000`—`999`，不足三位时在前面补 `0`。
2. 网页按照下划线前的数字从小到大展示。
3. 编号可以不连续，但同一个栏目内不能重复。
4. 下划线后的文字用于识别和管理文件夹，建议填写演员名；网页实际显示的演员名以 `actor.txt` 为准。
5. 文件夹名称不要使用 `/`、`\`、冒号或纯空白内容。

### 每场演出必须包含的文件

```text
000_演员名/
├── actor.txt
├── title.txt
├── description.txt
└── photo.jpg
```

- `actor.txt`：演员名称，可以填写一位或多位演员。
- `title.txt`：演出名称。
- `description.txt`：详细介绍，允许换行和多个段落。
- `photo.*`：演出海报，文件名必须为 `photo`。

文字文件使用 UTF-8 编码，并且不能是空文件。每个演出文件夹只能保留一张 `photo.*`。

海报支持：

```text
photo.webp
photo.jpg
photo.jpeg
photo.png
photo.svg
```

文件名区分大小写，请使用小写文件名，不要使用 `Photo.JPG` 等形式。

### Show 海报尺寸要求

- 推荐比例：`1 : 1.414`，即竖版 A 系列海报比例。
- 推荐尺寸：`1400 × 1980 px`。
- 最低建议尺寸：`1000 × 1414 px`。
- 推荐格式：优先使用 WebP，其次使用压缩后的 JPG。
- 建议单张文件不超过 `500 KB`，最高尽量不要超过 `1 MB`。
- 图片会完整显示，不会裁剪；比例不同会出现留白。
- 不要直接上传相机原图、印刷源文件或 10 MB 以上的海报。

以上尺寸和体积是性能建议，生成脚本不会自动压缩图片。

### 添加一场演出

1. 在对应栏目中复制一个现有演出文件夹。
2. 按照“三位数字_演员名”重新命名。
3. 替换三个 TXT 文件和一张 `photo.*`。
4. 确认同一栏目内没有重复编号。
5. 在项目根目录重新生成索引：

```bash
node scripts/generate-indexes.mjs
```

### 删除或调整演出

- 删除：直接删除整场演出的文件夹。
- 调整顺序：修改文件夹下划线前的三位数字。
- 移动栏目：将整个演出文件夹移动到另一个栏目中，并检查编号是否重复。

完成后必须重新生成索引。

## `photos/`：照片轮播

- 照片直接放在 `photos/` 内，不需要创建子文件夹。
- `photos/index.json` 由脚本自动生成，不要手动编辑。
- `photos/README.txt` 是 Photos 文件夹内的简版维护提示。

### 照片命名

格式必须为：

```text
三位数字_照片名称.扩展名
```

例如：

```text
000_上海专场.jpg
001_北京返场.webp
100_后台合影.png
```

规则：

1. 编号控制网页展示顺序，范围为 `000`—`999`。
2. 编号可以不连续，但不能重复。
3. 下划线后的照片名称会用作图片的辅助说明，应该简短且有意义。
4. 支持 `webp`、`jpg`、`jpeg`、`png`、`svg`。
5. 不要把 README、压缩包或其他文件改成图片扩展名。

### Photos 图片尺寸要求

- 推荐比例：`3 : 2` 横图。
- 推荐尺寸：`1800 × 1200 px`。
- 最低建议尺寸：`1200 × 800 px`。
- 推荐格式：优先使用 WebP，其次使用压缩后的 JPG。
- 建议单张文件不超过 `800 KB`。
- 竖图和其他比例也可以使用，网页会完整显示，但四周可能出现留白。
- 所有轮播图片尽量使用一致的比例和尺寸，以减少切换时的视觉跳动。

照片轮播每张停留约 3 秒，也可以通过左右按钮或手机滑动操作。

## `slogan/`：顶部背景图

- `slogan/slogan.jpg`：顶部 Slogan 区域的背景图。
- `slogan/README.txt`：记录图片作者、来源和授权信息。

背景图文件名目前固定为：

```text
slogan.jpg
```

替换图片时请保持相同文件名，否则需要同时修改 `styles.css`。

推荐要求：

- 推荐比例：`16 : 9` 横图。
- 推荐尺寸：`1920 × 1080 px`。
- 最低建议宽度：`1600 px`。
- 建议文件不超过 `800 KB`。
- 重要人物或主体尽量位于画面中央，因为背景会使用 `cover`，手机端左右区域可能被裁剪。
- 必须确认图片拥有合法使用权，并在 `slogan/README.txt` 中记录作者、来源链接和授权方式。

## `fonts/`：字体

- `jost-latin-variable.woff2`：网站使用的英文字体文件。
- `OFL.txt`：字体授权文件。

不要删除授权文件。替换字体前需要确认网页授权，并同步修改 `styles.css` 中的 `@font-face`。

当前字体不包含完整中文字形，中文会使用设备系统的后备字体。

## `scripts/`：索引生成脚本

- `generate-shows-index.mjs`：扫描 Show 文件夹，校验命名、编号、TXT 和海报，并生成 `shows/index.json`。
- `generate-photos-index.mjs`：扫描 Photos 文件夹，校验文件名和编号，并生成 `photos/index.json`。
- `generate-indexes.mjs`：依次运行以上两个脚本，是日常维护时推荐使用的统一命令。

统一执行：

```bash
node scripts/generate-indexes.mjs
```

如果资料不符合规则，脚本会停止并指出具体文件。修复后重新运行即可。

## `.github/workflows/`：自动部署

`deploy-pages.yml` 会在代码推送到 `main` 分支后：

1. 检出网站文件。
2. 运行索引生成和资料校验。
3. 创建 GitHub Pages 部署文件。
4. 发布网站。

GitHub 仓库需要在 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。

资料不符合命名或存储规则时，部署会失败，旧版网站不会被错误内容覆盖。

## 完整更新流程

### 更新演出或 Photos

```bash
# 1. 按规则添加、替换、移动或删除资料

# 2. 重新生成并检查索引
node scripts/generate-indexes.mjs

# 3. 本地预览
python3 -m http.server 8000
```

然后浏览：

```text
http://localhost:8000/
```

确认页面无误后，将资料文件、生成的索引和代码一起提交并推送到 GitHub。

### 只替换 Slogan

使用新的图片覆盖 `slogan/slogan.jpg`，同时更新 `slogan/README.txt` 中的来源和授权信息。Slogan 不需要重新生成索引。

## 提交前检查清单

- 文件夹和照片是否都使用三位数字编号。
- 同一栏目内是否存在重复编号。
- Show 的三个 TXT 是否完整、非空并使用 UTF-8。
- 每场 Show 是否只有一张 `photo.*`。
- 图片方向、比例和尺寸是否符合建议。
- 图片是否已经压缩到合理体积。
- `slogan/README.txt` 是否记录了图片来源和授权。
- 是否运行过 `node scripts/generate-indexes.mjs`。
- 是否同时提交了自动生成的 `shows/index.json` 和 `photos/index.json`。
- 本地手机尺寸预览是否正常。

不要直接双击 `index.html` 以 `file://` 方式预览，因为浏览器会阻止网页读取 JSON。请使用本地 HTTP 服务器。
