import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const failures = []
const expectedProgressiveImages = new Map([
  ["news/playtime-at-the-shell-boundary.html", [
    "../assets/diagrams/playtime-layers.svg",
    "../assets/diagrams/playtime-sibling-home.svg",
  ]],
  ["news/partnering-with-devcentr.html", [
    "../assets/diagrams/toolchain-architecture.svg",
    "../assets/diagrams/sibling-ownership.svg",
  ]],
])

for (const [page, sources] of expectedProgressiveImages) {
  const html = readFileSync(path.join(root, page), "utf8")
  if (/<object\b/i.test(html)) failures.push(`${page}: contains an object embed`)
  for (const source of sources) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    if (!new RegExp(`<div class="imageblock diagram-svg">[\\s\\S]*?<img src="${escaped}"`, "i").test(html)) {
      failures.push(`${page}: ${source} is not a progressive image fallback`)
    }
    if (/^(?:https?:)?\/\//i.test(source)) failures.push(`${page}: ${source} is not same-origin`)
    const host = source.replace(/\.svg$/, ".host.svg")
    if (!existsSync(path.resolve(root, path.dirname(page), host))) {
      failures.push(`${page}: missing host companion for ${source}`)
    }
  }
}

const runtime = readFileSync(path.join(root, "assets", "themed-svg.js"), "utf8")
if (!runtime.includes("@dev-centr/themed-svg@0.1.1/browser/themed-svg-element.js")) {
  failures.push("assets/themed-svg.js: runtime is not pinned to 0.1.1")
}
if (!runtime.includes('selector: ".diagram-svg img"')) {
  failures.push("assets/themed-svg.js: runtime does not target progressive image fallbacks")
}

const css = readFileSync(path.join(root, "assets", "site.css"), "utf8")
for (const token of [
  "--themed-svg-diagram-color-canvas",
  "--themed-svg-diagram-color-surface-primary",
  "--themed-svg-diagram-color-text-primary",
  "--themed-svg-diagram-color-border-primary",
  "--themed-svg-diagram-color-edge",
  "--themed-svg-diagram-color-accent-primary",
  "--themed-svg-diagram-color-status-warning",
]) {
  if (!css.includes(token)) failures.push(`assets/site.css: missing manual theme token ${token}`)
}
if (!css.includes('html[data-theme="dark"]')) failures.push("assets/site.css: missing manual dark theme")

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}
console.log("Validated four progressive fallbacks, same-origin host pairs, runtime 0.1.1, and manual themes.")
