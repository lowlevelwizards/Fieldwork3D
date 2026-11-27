import {spawnSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export const specs={
  "ui-attribution": [
    "src/breach-runtime-loop.ts",
    "src/breach-performance-timeline.ts",
    "tests/performance-p2-9-ui-attribution.test.mjs"
  ],
  "route-recovery": [
    "src/breach-squeeze-route.ts",
    "tests/performance-p2-10-route-recovery.test.mjs"
  ],
  "civilian-sensing": [
    "src/breach-civilian-response.ts",
    "src/breach-simulation-motion-phase.ts",
    "tests/performance-p2-11-civilian-cadence.test.mjs"
  ],
  "movement-authority": [
    "src/breach-movement-authority.ts",
    "src/breach-civilian-transport.ts",
    "src/breach-simulation-motion-phase.ts",
    "tests/performance-p2-12-movement-authority.test.mjs"
  ],
  "traversal": [
    "src/breach-motor-traversal.ts",
    "src/breach-mantle.ts",
    "src/breach-navigation.ts",
    "tests/performance-p2-13-traversal-hotpaths.test.mjs"
  ],
  "ally-context": [
    "src/breach-actor-neighborhood.ts",
    "src/breach-3d.ts",
    "tests/performance-p6-local-ally-broadphase.test.mjs"
  ],
  "frame-indices": [
    "src/breach-combat-cues.ts",
    "src/breach-frame-lookup.ts",
    "src/breach-3d.ts",
    "tests/performance-p6-frame-indices.test.mjs",
    "tests/tactical-integration-18-firefight-b2.test.mjs",
    "scripts/verification/performance-p6-frame-index-bench.mjs"
  ],
  "opaque-compiler": [
    "src/rendering/fieldwork-model-compiler.ts",
    "tests/performance-p6-opaque-toon-compiler.test.mjs"
  ],
  "runtime-listeners": [
    "src/breach-runtime-loop.ts",
    "tests/performance-p6-runtime-listener-lifecycle.test.mjs"
  ]
};
export const infrastructure=[
  ".github/workflows/runtime-performance-critical.yml",
  "scripts/verification/runtime-performance-routing.mjs",
  "tests/ci-runtime-performance-routing.test.mjs",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts"
];
export function selectRuntimePerformance(paths,manual=''){
 if(manual&&manual!=='all'&&!Object.hasOwn(specs,manual))throw Error('Unknown lane: '+manual);
 const changed=new Set(paths);
 const shared=infrastructure.some(p=>changed.has(p));
 return Object.fromEntries(Object.entries(specs).map(([key,owned])=>[key,manual?manual==='all'||manual===key:shared||owned.some(p=>changed.has(p))]));
}
function main(){
 const {BASE_SHA:base,HEAD_SHA:head,GITHUB_OUTPUT:output,MANUAL_LANE:manual}=process.env;
 let paths=[];
 if(!manual){
  if(!/^[a-f0-9]{40}$/i.test(base??'')||!/^[a-f0-9]{40}$/i.test(head??''))throw Error('Missing or invalid PR revision');
  const diff=spawnSync('git',['diff','--name-only','--no-renames','-z',base+'...'+head],{encoding:'utf8'});
  if(diff.status!==0)throw Error('Cannot determine changed files: '+diff.stderr);
  paths=diff.stdout.split('\0').filter(Boolean);
 }
 const selected=selectRuntimePerformance(paths,manual);
 appendFileSync(output,Object.entries(selected).map(([k,v])=>k+'='+v).join('\n')+'\n');
 console.log(JSON.stringify(selected));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main();
