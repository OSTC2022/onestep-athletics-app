import fs from "fs"
import path from "path"

const root = path.resolve(import.meta.dirname, "..")
const chunkDirs = [
  path.join(root, ".next/dev/static/chunks"),
  path.join(root, ".next/dev/server/chunks/ssr"),
]

const targets = new Set([
  "components/home-weather.tsx",
  "components/workout-record-form.tsx",
  "components/cross-exercise-list.tsx",
  "components/ui/dialog.tsx",
  "components/app-shell.tsx",
  "lib/weather.ts",
  "lib/weekly-schedule.ts",
  "lib/daily-checkin.ts",
  "lib/form-styles.ts",
  "lib/workout-categories.ts",
  "lib/pace.ts",
  "lib/cross-exercises.ts",
  "components/home-page.tsx",
  "components/training-page.tsx",
])

function extractFromMap(map, found) {
  if (map.sources && map.sourcesContent) {
    for (let i = 0; i < map.sources.length; i++) {
      const src = map.sources[i].replace(/\\/g, "/")
      const match = src.match(/(?:components|lib)\/[^"]+\.tsx?/)
      if (!match) continue
      const key = match[0]
      if (!targets.has(key)) continue
      const content = map.sourcesContent[i]
      if (!content) continue
      const prev = found.get(key)
      if (!prev || content.length > prev.length) found.set(key, content)
    }
  }
  if (Array.isArray(map.sections)) {
    for (const section of map.sections) {
      if (section.map) extractFromMap(section.map, found)
    }
  }
}

const found = new Map()

for (const chunkDir of chunkDirs) {
  if (!fs.existsSync(chunkDir)) continue
  for (const file of fs.readdirSync(chunkDir).filter((f) => f.endsWith(".map"))) {
    try {
      const map = JSON.parse(fs.readFileSync(path.join(chunkDir, file), "utf8"))
      extractFromMap(map, found)
    } catch {
      // skip
    }
  }
}

for (const [key, content] of found) {
  const out = path.join(root, ...key.split("/"))
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, content)
  console.log("restored", key, `(${content.length} chars)`)
}

console.log("missing", [...targets].filter((t) => !found.has(t)))
