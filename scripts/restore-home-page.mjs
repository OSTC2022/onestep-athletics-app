import fs from "fs"
import path from "path"

const root = path.resolve(import.meta.dirname, "..")

function extractFromMap(map, found) {
  if (map.sources && map.sourcesContent) {
    for (let i = 0; i < map.sources.length; i++) {
      const src = map.sources[i]
      if (!src.includes("home-page.tsx")) continue
      const content = map.sourcesContent[i]
      if (!content || !content.includes('lime: "#559961"')) continue
      const prev = found.get("home-page")
      if (!prev || content.length > prev.length) found.set("home-page", content)
    }
  }
  if (Array.isArray(map.sections)) {
    for (const section of map.sections) {
      if (section.map) extractFromMap(section.map, found)
    }
  }
}

const found = new Map()
const chunkDirs = [
  path.join(root, ".next/dev/static/chunks"),
  path.join(root, ".next/dev/server/chunks/ssr"),
]

for (const chunkDir of chunkDirs) {
  if (!fs.existsSync(chunkDir)) continue
  for (const file of fs.readdirSync(chunkDir).filter((f) => f.endsWith(".map"))) {
    try {
      extractFromMap(JSON.parse(fs.readFileSync(path.join(chunkDir, file), "utf8")), found)
    } catch {
      // skip
    }
  }
}

const content = found.get("home-page")
if (!content) {
  console.error("Could not find home-page with C.lime palette")
  process.exit(1)
}

const out = path.join(root, "components/home-page.tsx")
fs.writeFileSync(out, content)
console.log("restored home-page.tsx", content.length, "chars")
