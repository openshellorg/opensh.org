/**
 * Synchronize committed Themed SVG artifacts from authoritative shell-architecture.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const outDir = path.join(root, "assets", "diagrams")
const illustrationsDir = path.join(root, "assets", "illustrations")
const check = process.argv.includes("--check")
const diagrams = [
  "declaration-without-dispatch",
  "honest-entrypoint-dispatch",
  "sibling-ownership",
  "toolchain-architecture",
  "playtime-argv",
  "playtime-overlays",
  "playtime-venn",
  "playtime-bootstrap",
  "playtime-growth-ratchet",
  "playtime-facets-not-lattice",
  "playtime-bind-flow",
  "playtime-layers",
]
const preservedFixedIllustrations = diagrams.filter((name) => name.startsWith("playtime-"))

function resolveDiagramSrc() {
  const candidates = [
    process.env.DIAGRAM_SRC,
    path.resolve(root, "..", "shell-architecture", "docs", "modules", "ROOT", "images"),
    path.resolve(root, "_diagram-src", "docs", "modules", "ROOT", "images"),
  ].filter(Boolean)
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  throw new Error(
    `Diagram source not found. Set DIAGRAM_SRC or checkout openshellorg/shell-architecture next to this repo.\nTried:\n${candidates.join("\n")}`,
  )
}

const diagramSrc = resolveDiagramSrc()
mkdirSync(outDir, { recursive: true })
mkdirSync(illustrationsDir, { recursive: true })
let stale = false
function syncFile(source, target) {
  if (!existsSync(source)) throw new Error(`Missing canonical artifact ${source}`)
  if (check) {
    if (!existsSync(target) || readFileSync(source, "utf8") !== readFileSync(target, "utf8")) {
      console.error(`stale ${path.relative(root, target)}`)
      stale = true
    }
  } else {
    copyFileSync(source, target)
    console.log(`copied ${path.relative(root, target)}`)
  }
}

for (const name of diagrams) {
  for (const suffix of [".svg", ".host.svg"]) {
    syncFile(path.join(diagramSrc, `${name}${suffix}`), path.join(outDir, `${name}${suffix}`))
  }
}
for (const name of preservedFixedIllustrations) {
  syncFile(path.join(diagramSrc, `${name}.fixed.svg`), path.join(illustrationsDir, `${name}.svg`))
}
if (stale) process.exitCode = 3
