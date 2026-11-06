// Code de sortie 0 = une (re)construction est nécessaire, 1 = la version construite est à jour.
import fs from 'node:fs'
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
const built = fs.existsSync('.next/BUILD_ID') && fs.existsSync('.next/af-version.txt') ? fs.readFileSync('.next/af-version.txt', 'utf8').trim() : ''
process.exit(built === version ? 1 : 0)
