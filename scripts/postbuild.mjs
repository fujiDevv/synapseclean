import fs from 'fs';

const manifestPath = 'dist/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

for (const key of ['background', 'content_scripts', 'web_accessible_resources']) {
  if (!manifest[key]) continue;
}

if (!fs.existsSync('dist/main_world.js')) {
  console.warn('postbuild: dist/main_world.js not found');
}

console.log('SynapseClean build OK:', manifest.version);