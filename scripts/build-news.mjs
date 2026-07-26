import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Asciidoctor from "@asciidoctor/core"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const postsDir = path.join(root, "news", "posts")
const outDir = path.join(root, "news")

const asciidoctor = Asciidoctor()

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function layout({ title, description, active, body, rootPrefix = "../" }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="icon" href="${rootPrefix}assets/logo-mark.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&family=IBM+Plex+Sans:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="${rootPrefix}assets/site.css" />
  </head>
  <body>
    <nav class="topnav" aria-label="Site">
      <a class="brand" href="${rootPrefix}index.html">
        <img src="${rootPrefix}assets/logo-mark.svg" width="32" height="32" alt="" />
        OpenShellOrg
      </a>
      <div class="links">
        <a href="${rootPrefix}news/"${active === "news" ? ' aria-current="page"' : ""}>News</a>
        <a href="https://openshellorg.github.io/open-shell-org/">Docs</a>
        <a href="https://openshellorg.github.io/open-shell-org/open-shell-org/philosophy.html">Philosophy</a>
        <a href="https://github.com/openshellorg">GitHub</a>
      </div>
    </nav>
    ${body}
  </body>
</html>
`
}

function parsePost(filePath, source) {
  const doc = asciidoctor.load(source, {
    safe: "safe",
    attributes: {
      showtitle: false,
      "sectanchors": true,
    },
  })
  const base = path.basename(filePath, ".adoc")
  const dateMatch = base.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  const date = doc.getAttribute("revdate") || (dateMatch ? dateMatch[1] : "")
  const slug = dateMatch ? dateMatch[2] : base
  const title = doc.getTitle() || slug
  const summary = doc.getAttribute("description") || doc.getAttribute("summary") || ""
  const html = doc.convert()
  return { date, slug, title, summary, html, filePath }
}

function formatDate(iso) {
  if (!iso) return ""
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const files = (await readdir(postsDir))
    .filter((f) => f.endsWith(".adoc"))
    .sort()
    .reverse()

  const posts = []
  for (const file of files) {
    const filePath = path.join(postsDir, file)
    const source = await readFile(filePath, "utf8")
    posts.push(parsePost(filePath, source))
  }

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.slug).localeCompare(String(a.slug)))

  for (const post of posts) {
    const body = `
    <main class="page article">
      <a class="back" href="./">← News</a>
      <header>
        <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
        <h1>${escapeHtml(post.title)}</h1>
        ${post.summary ? `<p class="summary">${escapeHtml(post.summary)}</p>` : ""}
      </header>
      <div class="body">
        ${post.html}
      </div>
    </main>`
    const page = layout({
      title: `${post.title} · OpenShellOrg`,
      description: post.summary || post.title,
      active: "news",
      body,
      rootPrefix: "../",
    })
    await writeFile(path.join(outDir, `${post.slug}.html`), page, "utf8")
  }

  const feedItems = posts
    .map(
      (post) => `
        <li>
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
          <a class="title" href="./${escapeHtml(post.slug)}.html">${escapeHtml(post.title)}</a>
          ${post.summary ? `<p>${escapeHtml(post.summary)}</p>` : ""}
        </li>`,
    )
    .join("\n")

  const indexBody = `
    <main class="page">
      <h1>News</h1>
      <p class="lede">
        Notes on OpenShellOrg — standards, tooling, and how the organization is taking shape.
      </p>
      <ol class="feed">
        ${feedItems}
      </ol>
    </main>`

  await writeFile(
    path.join(outDir, "index.html"),
    layout({
      title: "News · OpenShellOrg",
      description: "OpenShellOrg news and blog posts.",
      active: "news",
      body: indexBody,
      rootPrefix: "../",
    }),
    "utf8",
  )

  // RSS
  const rssItems = posts
    .map((post) => {
      const link = `https://openshellorg.github.io/news/${post.slug}.html`
      return `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeHtml(post.summary || post.title)}</description>
    </item>`
    })
    .join("\n")

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenShellOrg News</title>
    <link>https://openshellorg.github.io/news/</link>
    <description>Standards, tooling, and the evolution of OpenShellOrg.</description>
${rssItems}
  </channel>
</rss>
`
  await writeFile(path.join(outDir, "feed.xml"), rss, "utf8")

  console.log(`Built ${posts.length} news post(s) → news/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
