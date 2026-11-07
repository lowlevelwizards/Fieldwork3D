import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import config from '../../vite.config.ts';
const root=fileURLToPath(new URL('../../',import.meta.url)),dist=path.join(root,'dist');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestFile='verification-artifact.json';
const walk=dir=>readdirSync(path.join(dist,dir),{withFileTypes:true}).flatMap(e=>
  e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const build=JSON.parse(readFileSync(path.join(dist,'fieldwork-build.json'),'utf8'));
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(!build.id || process.env.GITHUB_SHA && !build.id.startsWith(process.env.GITHUB_SHA.slice(0,12)+'-'))
  throw Error('Release stamp does not identify this workflow commit');
for(const input of Object.values(config.build.rollupOptions.input)) {
  const html=readFileSync(path.join(dist,path.basename(input)),'utf8');
  if(!html.includes(`name="fieldwork-build" content="${build.id}"`)) throw Error(`Missing release stamp: ${input}`);
  if(/<script[^>]+src=["'][^"']*src\/[^"']*\.ts/.test(html)) throw Error(`Uncompiled entrypoint: ${input}`);
  for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const resource=match[1].split(/[?#]/)[0];
    if(!resource || /^(https?:|data:|#|\/\/)/.test(resource)) continue;
    if(resource.includes('assets/') && !statSync(path.resolve(dist,resource)).isFile()) throw Error(`Missing asset: ${resource}`);
  }
}
const files=Object.fromEntries(walk('').filter(f=>f!==manifestFile).sort().map(f=>[f,digest(readFileSync(path.join(dist,f)))]));
const metadata={schema:1,commit,buildId:build.id,node:process.versions.node,lockHash:digest(readFileSync(path.join(root,'package-lock.json'))),files};
if(process.argv.includes('--write')) writeFileSync(path.join(dist,manifestFile),JSON.stringify(metadata,null,2)+'\n');
if(process.argv.includes('--verify')) {
  const saved=JSON.parse(readFileSync(path.join(dist,manifestFile),'utf8'));
  if(JSON.stringify(saved)!==JSON.stringify(metadata)) throw Error('Artifact changed after verification or belongs to a different commit/toolchain');
}
console.log(`Verified ${Object.keys(files).length} production files; build ${build.id}; source ${commit}`);
