const { existsSync } = require('node:fs');
const { execFileSync } = require('node:child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const hasVite = existsSync('node_modules/.bin/vite') || existsSync('node_modules/.bin/vite.cmd');

if (!hasVite) {
  console.log('ATLAS Web: instalando dependencias ausentes...');
  try {
    if (existsSync('package-lock.json')) {
      execFileSync(npmCmd, ['ci'], { stdio: 'inherit' });
    } else {
      execFileSync(npmCmd, ['install'], { stdio: 'inherit' });
    }
  } catch (error) {
    if (existsSync('package-lock.json')) {
      execFileSync(npmCmd, ['install'], { stdio: 'inherit' });
    } else {
      throw error;
    }
  }
}
