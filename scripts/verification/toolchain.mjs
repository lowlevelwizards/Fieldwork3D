import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const required = readFileSync(new URL('../../.node-version', import.meta.url), 'utf8').trim();
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const npm = execFileSync('npm', ['--version'], {encoding:'utf8'}).trim();
if (process.versions.node !== required || npm !== pkg.packageManager.split('@')[1]) {
  throw Error(`Use Node ${required} and ${pkg.packageManager}; found ${process.version} and npm ${npm}`);
}
console.log(`Toolchain: Node ${process.versions.node}, npm ${npm}`);
