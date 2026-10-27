演出资料更新规则

1. 栏目文件夹
   now-playing    = 正在演出
   previous-shows = 过往演出

2. 每场演出文件夹使用“三位数字_演员名”格式：
   000_演员0、001_演员1、002_演员2……
   数字必须是 000—999 之间的三位数，不足三位补 0。
   编号用于控制网页展示顺序，可以不连续，但同一个栏目中不能重复。

3. 每个编号文件夹必须包含：
   actor.txt       演员
   title.txt       演出名称
   description.txt 详细介绍（允许换行和多段）
   thumbnail.*     列表缩略图
   detail.*        详情窗口图片

4. 两张图片分别命名为 thumbnail 和 detail，支持以下格式：
   webp、jpg、jpeg、png、svg
   每种图片只能保留一个格式，推荐统一使用：
   thumbnail.webp  700 × 990 px，最大 500 KB
   detail.webp     1400 × 1980 px，最大 1 MB
   网页列表只读取 thumbnail，点击海报后才读取 detail。

5. 添加演出
   复制一个现有文件夹，按“三位数字_演员名”重命名，再替换其中五个资料文件。

6. 删除或调整顺序
   删除文件夹即可删除演出。修改下划线前的三位数字即可调整顺序。

7. 本地预览前，在项目根目录运行：
   node scripts/generate-indexes.mjs
   命令会检查命名、缺失文件、空白文字、重复图片和图片体积，并生成索引。
   随后刷新网页即可看到更新，不需要修改 index.html、styles.css 或 script.js。

8. 推送到 GitHub 后，GitHub Actions 会自动执行同一套检查并生成线上索引。
   资料不符合规则时会停止部署，并在 Actions 日志中指出具体文件。
   网页必须通过网站服务器访问，不能直接双击 index.html 以 file:// 方式预览。
