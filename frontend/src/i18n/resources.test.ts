import { describe, expect, it } from "vitest"

import { resources } from "./resources"

function translationKeys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof child === "object" && child !== null
      ? translationKeys(child, path)
      : [path]
  })
}

const sourceModules = import.meta.glob("../**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>

describe("translation resources", () => {
  it("keeps en-US and pt-BR catalogs in sync", () => {
    const englishKeys = translationKeys(resources["en-US"].translation).sort()
    const portugueseKeys = translationKeys(resources["pt-BR"].translation).sort()

    expect(portugueseKeys).toEqual(englishKeys)
  })

  it("does not contain empty translations", () => {
    for (const locale of Object.values(resources)) {
      for (const value of Object.values(locale.translation)) {
        expect(JSON.stringify(value)).not.toContain('""')
      }
    }
  })

  it("contains every static translation key used by the interface", () => {
    const availableKeys = new Set(translationKeys(resources["en-US"].translation))
    const referencedKeys = Object.entries(sourceModules)
      .filter(([path]) => !path.endsWith("resources.test.ts"))
      .flatMap(([, source]) => Array.from(source.matchAll(/\bt\("([^"]+)"/g), (match) => match[1]))

    const missingKeys = referencedKeys.filter((key) => (
      !availableKeys.has(key)
      && !availableKeys.has(`${key}_one`)
      && !availableKeys.has(`${key}_other`)
    ))

    expect(missingKeys).toEqual([])
  })
})
