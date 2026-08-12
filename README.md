# 时间计划工作台

一个纯前端的个人时间记录网页。数据默认保存在当前浏览器的 `localStorage` 中，可以通过侧边栏的数据导出/导入进行备份和迁移。

## 本地预览

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:4173/
```

## 发布成可分享网页

这是一个静态站点，不需要构建步骤。发布时把整个目录作为静态网页目录即可。

### GitHub Pages

1. 新建一个 GitHub 仓库。
2. 上传 `index.html`、`styles.css`、`app.js`、`favicon.svg`、`manifest.webmanifest`。
3. 在仓库 `Settings` -> `Pages` 中选择主分支作为发布来源。
4. GitHub 会生成一个可分享链接。

### Netlify

1. 登录 Netlify。
2. 选择 `Add new site` -> `Deploy manually`。
3. 拖入这个文件夹。
4. Netlify 会生成一个可分享链接。

### Vercel

1. 登录 Vercel。
2. 新建项目并导入这个目录所在仓库。
3. Framework Preset 选择 `Other`。
4. 不需要 Build Command，Output Directory 留空或使用根目录。

