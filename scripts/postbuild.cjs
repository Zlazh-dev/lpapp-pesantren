/**
 * postbuild.cjs
 * Cross-platform script: copy .next/static and public/ into .next/standalone/
 * Required for Next.js standalone output mode to serve static assets correctly.
 */
const { cpSync, existsSync, mkdirSync } = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function copyDir(src, dest) {
    if (!existsSync(src)) {
        console.warn(`[postbuild] Skipping ${src} (not found)`)
        return
    }
    mkdirSync(path.dirname(dest), { recursive: true })
    cpSync(src, dest, { recursive: true })
    console.log(`[postbuild] Copied ${src} → ${dest}`)
}

copyDir(
    path.join(root, '.next', 'static'),
    path.join(root, '.next', 'standalone', '.next', 'static')
)
copyDir(
    path.join(root, 'public'),
    path.join(root, '.next', 'standalone', 'public')
)
