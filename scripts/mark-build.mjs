import fs from 'node:fs'
fs.writeFileSync('.next/af-version.txt', JSON.parse(fs.readFileSync('package.json', 'utf8')).version)
