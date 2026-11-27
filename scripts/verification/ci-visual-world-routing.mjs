import {spawnSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export const specs={
  "vfx-v11-production": [
    "src/breach-3d.ts",
    "src/rendering/breach-vfx-preview-config.ts",
    "scripts/verification/vfx-v11-production-browser.mjs",
    "tests/vfx-v10-preview-config.test.mjs",
    ".github/workflows/vfx-v11-production.yml"
  ],
  "vfx-v12-surface-ownership": [
    "src/breach-impact-surface.ts",
    "src/breach-ballistic-resolution.ts",
    "src/breach-shot-resolution.ts",
    "src/breach-firing-pipeline.ts",
    "src/breach-shot-environment.ts",
    "src/breach-3d.ts",
    "tests/vfx-v12-surface-ownership.test.mjs",
    "scripts/verification/vfx-v12-surface-browser.mjs",
    ".github/workflows/vfx-v12-surface-ownership.yml"
  ],
  "vfx-v13-blood": [
    "src/breach-blood-evidence.ts",
    "src/breach-impact-evidence-buffer.ts",
    "src/breach-simulation-medical-door-phase.ts",
    "src/breach-3d.ts",
    "src/rendering/breach-blood-burst.ts",
    "src/rendering/breach-stain-atlas.ts",
    "tests/vfx-v13-blood-evidence.test.mjs",
    "scripts/verification/vfx-v13-blood-browser.mjs",
    ".github/workflows/vfx-v13-blood.yml"
  ],
  "vfx-v14-material": [
    "src/rendering/breach-material-impact-atom.ts",
    "src/breach-effects.ts",
    "src/breach-combat-cues.ts",
    "src/breach-3d.ts",
    "tests/vfx-v5-material-impact.test.mjs",
    ".github/workflows/vfx-v14-material.yml"
  ],
  "vfx-v15-atmosphere": [
    "src/breach-atmosphere-evidence.ts",
    "src/rendering/breach-dust-puffs.ts",
    "src/rendering/window-shatter-presentation.ts",
    "src/rendering/breach-vfx-preview-config.ts",
    "tests/vfx-v15-atmosphere.test.mjs",
    ".github/workflows/vfx-v15-atmosphere.yml"
  ],
  "vfx-v16-fracture": [
    "src/breach-fracture-record.ts",
    "src/breach-reactive-cover.ts",
    "src/rendering/breach-fracture-debris.ts",
    "src/breach-3d.ts",
    "tests/vfx-v16-fracture-debris.test.mjs",
    ".github/workflows/vfx-v16-fracture.yml"
  ],
  "vfx-v21-visual-cohesion": [
    "src/breach-**",
    "src/rendering/breach-**",
    "tests/vfx-v21-visual-cohesion.test.mjs",
    ".github/workflows/vfx-v21-visual-cohesion.yml"
  ],
  "v19-visual-disclosure": [
    "src/breach-2d-actor-renderer.ts",
    "src/breach-2d-world-renderer.ts",
    "src/rendering/breach-evidence-owner.ts",
    "src/rendering/breach-shot-disclosure.ts",
    "src/breach-replay-effect-evidence.ts",
    "src/breach-replay.ts",
    "src/breach-replay-visibility.ts",
    "src/breach-3d.ts",
    "src/rendering/breach-presentation-sight-memo.ts",
    "src/rendering/breach-3d-disclosure-presenter.ts",
    "tests/v19-visual-disclosure.test.mjs",
    "scripts/verification/v19-disclosure-browser.mjs",
    "docs/vfx-v19-unified-disclosure-scope.md",
    ".github/workflows/v19-visual-disclosure.yml"
  ],
  "veh-vehicle": [
    "src/worldgen/vehicle-*.ts",
    "src/breach-reactive-cover.ts",
    "src/breach-core.ts",
    "src/breach-cover-height.ts",
    "scripts/verification/veh-lab-browser.mjs",
    "src/vehicle-lab-main.ts",
    "vehicle-lab.html",
    "scripts/audit-veh-parking.mjs",
    "src/breach-site.ts",
    "src/breach-archetypes.ts",
    "src/breach-windows.ts",
    "src/worldgen/exterior-sites.ts",
    "src/worldgen/parking-stalls.ts",
    "src/worldgen/property-surfaces.ts",
    "src/worldgen/public-street-layout.ts",
    "src/worldgen/world-scale.ts",
    "src/worldgen/asset-catalog.ts",
    "src/worldgen/asset-library.ts",
    "src/worldgen/fixture-visuals.ts",
    "src/worldgen/asset-character-visuals.ts",
    "src/worldgen/asset-review.ts",
    "src/asset-lab-main.ts",
    "src/rendering/breach-site-scene-builder.ts",
    "src/breach-3d.ts",
    "src/breach-materials.ts",
    "src/worldgen/pixel-surface-selection.ts",
    "tests/veh-*.test.mjs",
    ".github/workflows/veh-vehicle.yml"
  ],
  "asset-art-smoke": [
    "src/worldgen/asset-character-visuals.ts",
    "src/worldgen/fixture-visuals.ts",
    "src/worldgen/foliage-card-visuals.ts",
    "src/worldgen/exterior-sites.ts",
    "src/worldgen/public-street-layout.ts",
    "src/rendering/curb-ramp-wedge.ts",
    "src/worldgen/parking-stalls.ts",
    "src/worldgen/service-yard-layout.ts",
    "src/worldgen/service-clear-route.ts",
    "src/worldgen/landscape-bed-surfaces.ts",
    "src/worldgen/service-boundary-marks.ts",
    "src/rendering/property-surface-elevation.ts",
    "tests/exterior-composition-g-20261108.test.mjs",
    "src/worldgen/rear-service-program.ts",
    "tests/exterior-landscape-service-f-20261108.test.mjs",
    "src/worldgen/service-facade-program.ts",
    "src/worldgen/asset-catalog.ts",
    "src/worldgen/world-scale.ts",
    "tests/exterior-amenities-service-20261108.test.mjs",
    "tests/exterior-curb-service-20261108.test.mjs",
    "src/worldgen/property-surfaces.ts",
    "src/worldgen/outdoor-fixture-policy.ts",
    "tests/public-street-layout-20261108.test.mjs",
    "tests/outdoor-service-seating-20261108.test.mjs",
    "src/worldgen/landscape-edge-program.ts",
    "tests/exterior-realism-stage1-20261108.test.mjs",
    "src/breach-3d.ts",
    "src/worldgen/road-service-fixtures.ts",
    "tests/replay-prop-stability-20261108.test.mjs",
    "tests/map-29-architecture-hardware.test.mjs",
    "src/worldgen/detailed-fixture-visuals.ts",
    "src/worldgen/asset-review.ts",
    "tests/map-22-asset-audit.test.mjs",
    "tests/map-30-asset-condition.test.mjs",
    "tests/map-32-full-asset-render-smoke.test.mjs",
    "src/asset-lab-main.ts",
    "tests/map-21-asset-character-pass.test.mjs",
    ".github/workflows/asset-art-smoke.yml"
  ]
};
const infrastructure=/^(?:package(?:-lock)?\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+|\.github\/workflows\/ci-visual-world-acceptance\.yml|scripts\/verification\/ci-visual-world-routing\.mjs|tests\/ci-visual-world-routing\.test\.mjs)$/;
// GitHub positive path patterns here use only literal characters, * and **.
export function matchesGlob(path,glob){
 let source='^';
 for(let i=0;i<glob.length;i++){
  const c=glob[i];
  if(c==='*'){
   if(glob[i+1]==='*'){source+='.*';i++;}
   else source+='[^/]*';
  }else source+=c.replace(/[.*+?^${}()|[\]\\]/g,'\\export function selectVisualWorld(paths){');
 }
 return new RegExp(source+'
 const files=[...new Set(paths)];
 const shared=files.some(path=>infrastructure.test(path));
 return Object.fromEntries(Object.entries(specs).map(([key,globs])=>[
  key,shared||files.some(path=>globs.some(glob=>matchesGlob(path,glob)))
 ]));
}
function main(){
 const {BASE_SHA:base,HEAD_SHA:head,GITHUB_OUTPUT:output}=process.env;
 let selection=Object.fromEntries(Object.keys(specs).map(key=>[key,true]));
 if(base&&head){
  if(!/^[a-f0-9]{40}$/i.test(base)||!/^[a-f0-9]{40}$/i.test(head))throw Error('Invalid PR revision');
  const diff=spawnSync('git',['diff','--name-only','--no-renames','-z',base+'...'+head],{encoding:'utf8'});
  if(diff.status!==0)throw Error('Cannot classify visual ownership: '+diff.stderr);
  selection=selectVisualWorld(diff.stdout.split('\0').filter(Boolean));
 }
 console.log(JSON.stringify(selection));
 appendFileSync(output,Object.entries(selection).map(([key,value])=>key+'='+value).join('\n')+'\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main();
).test(path);
}
export function selectVisualWorld(paths){
 const files=[...new Set(paths)];
 const shared=files.some(path=>infrastructure.test(path));
 return Object.fromEntries(Object.entries(specs).map(([key,globs])=>[
  key,shared||files.some(path=>globs.some(glob=>matchesGlob(path,glob)))
 ]));
}
function main(){
 const {BASE_SHA:base,HEAD_SHA:head,GITHUB_OUTPUT:output}=process.env;
 let selection=Object.fromEntries(Object.keys(specs).map(key=>[key,true]));
 if(base&&head){
  if(!/^[a-f0-9]{40}$/i.test(base)||!/^[a-f0-9]{40}$/i.test(head))throw Error('Invalid PR revision');
  const diff=spawnSync('git',['diff','--name-only','--no-renames','-z',base+'...'+head],{encoding:'utf8'});
  if(diff.status!==0)throw Error('Cannot classify visual ownership: '+diff.stderr);
  selection=selectVisualWorld(diff.stdout.split('\0').filter(Boolean));
 }
 console.log(JSON.stringify(selection));
 appendFileSync(output,Object.entries(selection).map(([key,value])=>key+'='+value).join('\n')+'\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main();
