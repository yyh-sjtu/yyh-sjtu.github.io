# 添加博客文章

网站的博客不需要安装依赖或执行构建命令。

## 1. 创建文章

复制 `contents/blog/_template.md`，并用英文小写字母、数字和连字符命名，例如：

```text
contents/blog/my-first-paper-note.md
```

然后直接用 Markdown 编写文章内容。

## 2. 添加到博客清单

编辑 `contents/blogs.yml`，在 `posts` 下添加：

```yaml
  - slug: my-first-paper-note
    title: My First Paper Note
    date: "2026-08-10"
    summary: A short description displayed on the blog card.
    tags:
      - Research
      - Paper
```

`slug` 必须与 Markdown 文件名一致。文章会按照日期从新到旧自动排序。

## 3. 本地预览

在网站根目录运行：

```bash
python3 -m http.server 8000
```

然后访问 `http://localhost:8000`。不要直接双击 `index.html`，因为浏览器会阻止页面读取 Markdown 文件。

## 4. 发布

```bash
git add contents/blogs.yml contents/blog/
git commit -m "Add a new blog post"
git push
```
