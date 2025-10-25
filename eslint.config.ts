import json from "@eslint/json"
import { defineConfig } from "eslint/config"

export default defineConfig([
  {
    files: ["**/*.json"],
    ignores: ["package-lock.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
])
