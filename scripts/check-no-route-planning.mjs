#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.relative(root, new URL(import.meta.url).pathname);
const skippedDirectories = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
  "out"
]);
const allowedFiles = new Set(["CONTRIBUTING.md", scriptPath]);
const forbiddenTerms = [
  "route_optim",
  "routePlanning",
  "visit_route",
  "navigate_to_visit",
  "leaflet-routing-machine"
];

function isAllowed(relativePath) {
  return relativePath.startsWith("docs/") || allowedFiles.has(relativePath);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath);

    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) {
        files.push(...(await walk(absolutePath)));
      }
      continue;
    }

    if (entry.isFile() && !isAllowed(relativePath)) {
      files.push(relativePath);
    }
  }

  return files;
}

const violations = [];
const files = await walk(root);

for (const file of files) {
  const content = await readFile(path.join(root, file), "utf8");

  for (const term of forbiddenTerms) {
    if (content.includes(term)) {
      violations.push(`${file}: ${term}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Forbidden route-planning implementation terms found:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}
