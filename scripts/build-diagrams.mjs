/**
 * Prerender Mermaid `.mmd` → web-ready SVG via mmdc + @openshellorg/mermaid-svg-css-vars.
 *
 * Authoritative sources live in openshellorg/shell-architecture
 * (docs/modules/ROOT/partials/diagrams/). This script resolves that tree from:
 *   1. DIAGRAM_SRC env
 *   2. ../shell-architecture/... (local sibling checkout)
 *   3. _diagram-src/... (CI checkout path)
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { prepareMermaidSvgForWeb } from "@openshellorg/mermaid-svg-css-vars"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const outDir = path.join(root, "assets", "diagrams")
const themePath = path.join(root, "diagrams", "theme.json")
const configPath = path.join(root, "diagrams", "mermaid-config.json")

const SITE_DIAGRAMS = ["toolchain-architecture", "sibling-ownership"]

function resolveDiagramSrc() {
  const candidates = [
    process.env.DIAGRAM_SRC,
    path.resolve(root, "..", "shell-architecture", "docs", "modules", "ROOT", "partials", "diagrams"),
    path.resolve(root, "_diagram-src", "docs", "modules", "ROOT", "partials", "diagrams"),
  ].filter(Boolean)
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  throw new Error(
    `Diagram source not found. Set DIAGRAM_SRC or checkout openshellorg/shell-architecture next to this repo.\nTried:\n${candidates.join("\n")}`,
  )
}

function runMmdc(input, output) {
  const mmdc = path.join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "mmdc.cmd" : "mmdc",
  )
  const args = [
    "-i",
    input,
    "-o",
    output,
    "-c",
    configPath,
    "-b",
    "transparent",
    "-q",
  ]
  execFileSync(mmdc, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" })
}

const diagramSrc = resolveDiagramSrc()
const themeVariables = JSON.parse(readFileSync(themePath, "utf8"))
mkdirSync(outDir, { recursive: true })
mkdirSync(path.join(root, "diagrams", ".cache"), { recursive: true })

const available = new Set(
  readdirSync(diagramSrc)
    .filter((f) => f.endsWith(".mmd"))
    .map((f) => f.replace(/\.mmd$/i, "")),
)

for (const name of SITE_DIAGRAMS) {
  if (!available.has(name)) {
    throw new Error(`Missing ${name}.mmd in ${diagramSrc}`)
  }
  const input = path.join(diagramSrc, `${name}.mmd`)
  const rawOut = path.join(root, "diagrams", ".cache", `${name}.raw.svg`)
  const finalOut = path.join(outDir, `${name}.svg`)

  console.log(`mmdc ${name}.mmd`)
  runMmdc(input, rawOut)

  const raw = readFileSync(rawOut, "utf8")
  const ready = prepareMermaidSvgForWeb(raw, {
    themeVariables,
    cssVariables: true,
    webCompatibility: true,
    prefix: "--mermaid-",
  })
  writeFileSync(finalOut, ready, "utf8")
  console.log(`wrote ${path.relative(root, finalOut)}`)
}
