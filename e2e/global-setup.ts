import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export default function globalSetup(): void {
  const manifestPath = path.join(process.cwd(), 'dist', 'manifest.json');
  const packagePath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as { version?: string };
  let needsBuild = !fs.existsSync(manifestPath);

  if (!needsBuild) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { version?: string };
    needsBuild = manifest.version !== pkg.version;
  }

  if (needsBuild) {
    execSync('bun run build', { stdio: 'inherit', cwd: process.cwd() });
  }
}