照片轮播更新规则

1. 照片直接放在 photos 文件夹内，不需要再创建子文件夹。

2. 文件名使用“三位数字_名称”格式：
   000_名称.jpg、001_名称.jpg、002_名称.jpg……
   数字控制展示顺序，可以不连续，但不能重复。

3. 支持 webp、jpg、jpeg、png、svg 格式。

4. 本地预览前，在项目根目录运行：
   node scripts/generate-indexes.mjs

5. 命令会检查照片命名和重复编号，并生成 photos/index.json。
   推送到 GitHub 后，GitHub Actions 也会自动检查并生成线上索引。
