const fs = require('fs')
const path = require('path')

const base = 'd:/code-project/lpapp'
const files = [
    'src/app/(desktop)/santri/new/page.tsx',
    'src/app/(desktop)/santri/page.tsx',
    'src/app/(desktop)/santri/[id]/page.tsx',
    'src/app/(desktop)/dashboard/page.tsx',
    'src/app/(desktop)/billing/page.tsx',
    'src/app/(desktop)/kamar/page.tsx',
    'src/app/(desktop)/kelas/page.tsx',
    'src/app/(desktop)/users/page.tsx',
    'src/app/(mobile)/m-scan/page.tsx',
    'src/app/(mobile)/m-santri/page.tsx',
    'src/app/(mobile)/m-santri/[id]/page.tsx',
    'src/app/(mobile)/m-dashboard/page.tsx',
    'src/app/(mobile)/m-billing/page.tsx',
]

files.forEach(f => {
    const p = path.join(base, f)
    let c = fs.readFileSync(p, 'utf8')
    if (!c.includes('export const dynamic')) {
        c = c.replace("'use client'", "'use client'\n\nexport const dynamic = 'force-dynamic'")
        fs.writeFileSync(p, c)
        console.log('Added:', f)
    } else {
        console.log('Skip:', f)
    }
})
