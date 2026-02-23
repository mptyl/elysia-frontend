#!/usr/bin/env node
/**
 * Patches the `export const dynamic` value in auth route handlers.
 *
 * Usage:
 *   node scripts/set-route-dynamic.js force-static   # before static export build
 *   node scripts/set-route-dynamic.js force-dynamic   # revert to server mode default
 *
 * Next.js requires a string literal for `export const dynamic` — no variables,
 * ternaries, or computed values. Since static export needs "force-static" and
 * server mode needs "force-dynamic", this script patches the source before build.
 */
const fs = require("fs");
const path = require("path");

const mode = process.argv[2];
if (!["force-static", "force-dynamic"].includes(mode)) {
    console.error("Usage: set-route-dynamic.js <force-static|force-dynamic>");
    process.exit(1);
}

const ROUTE_FILES = [
    "app/api/auth/authorize/route.ts",
    "app/api/auth/session/route.ts",
    "app/api/auth/signout/route.ts",
    "app/api/auth/sync-profile/route.ts",
];

const PATTERN = /export const dynamic = "(force-static|force-dynamic)"/;

for (const file of ROUTE_FILES) {
    const fullPath = path.join(__dirname, "..", file);
    if (!fs.existsSync(fullPath)) {
        console.warn(`  skip (not found): ${file}`);
        continue;
    }
    let content = fs.readFileSync(fullPath, "utf-8");
    if (!PATTERN.test(content)) {
        console.warn(`  skip (no match): ${file}`);
        continue;
    }
    content = content.replace(PATTERN, `export const dynamic = "${mode}"`);
    fs.writeFileSync(fullPath, content);
    console.log(`  patched: ${file} -> ${mode}`);
}
