/**
 * postbuild.cjs
 * Cross-platform script: copy .next/static and public/ into .next/standalone/
 * Required for Next.js standalone output mode to serve static assets correctly.
 */
const { cpSync, existsSync, mkdirSync, readdirSync } = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function copyDir(src, dest, skipDirs = []) {
    if (!existsSync(src)) {
        console.warn(`[postbuild] Skipping ${src} (not found)`)
        return
    }
    mkdirSync(dest, { recursive: true })

    if (skipDirs.length === 0) {
        cpSync(src, dest, { recursive: true })
        console.log(`[postbuild] Copied ${src} → ${dest}`)
        return
    }

    // Copy entries individually, skipping specified subdirectories
    for (const entry of readdirSync(src, { withFileTypes: true })) {
        if (entry.isDirectory() && skipDirs.includes(entry.name)) {
            console.log(`[postbuild] Skipped ${path.join(src, entry.name)} (persistent folder — managed by UPLOAD_DIR)`)
            continue
        }
        cpSync(path.join(src, entry.name), path.join(dest, entry.name), { recursive: true })
    }
    console.log(`[postbuild] Copied ${src} → ${dest} (skipped: ${skipDirs.join(', ')})`)
}

copyDir(
    path.join(root, '.next', 'static'),
    path.join(root, '.next', 'standalone', '.next', 'static')
)
copyDir(
    path.join(root, 'public'),
    path.join(root, '.next', 'standalone', 'public'),
    // Skip uploads/ — in production this is an external dir set via UPLOAD_DIR env var.
    // Files here must survive rebuilds and must not be overwritten by postbuild.
    ['uploads']
)
