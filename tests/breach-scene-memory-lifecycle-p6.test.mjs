import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const siteSwap=scene.slice(scene.indexOf('  applySite(site:Site|null){'),
  scene.indexOf('  /** Only site-static boxes',scene.indexOf('  applySite(site:Site|null){')));

test('Director door cutaway clones are disposed with their site',()=>{
  assert.match(scene,/const clone=this\.siteMaterials\.track\(original\.clone\(\)\)/);
  assert.doesNotMatch(scene,/this\.mats\.push\(clone\)/);
  assert.match(siteSwap,/this\.siteMaterials\.reset\(\)/);
});

test('site teardown retires hostile rigs but retains preloaded friendlies',()=>{
  assert.match(siteSwap,/if\(actor\.side==='blue'\)continue/);
  assert.match(siteSwap,/actor\.physical\.dispose\(\)/);
  assert.match(siteSwap,/this\.scene\.remove\(actor\.root,actor\.status,actor\.beam,/);
  assert.match(siteSwap,/this\.actors\.delete\(id\)/);
  assert.match(scene,/this\.actors\.set\(a\.id,\{side:a\.side,/);
});

test('site teardown removes civilian roots without disposing shared geometry',()=>{
  assert.match(siteSwap,/for\(const rig of this\.civilianRigs\.values\(\)\)this\.scene\.remove\(rig\.root\)/);
  assert.match(siteSwap,/this\.civilianRigs\.clear\(\)/);
  assert.match(siteSwap,/if\(this\.rescueFigure\)this\.rescueFigure\.visible=false/);
  assert.doesNotMatch(siteSwap,/rig\.root\.traverse\(/);
});

test('opt-in diagnostics report retained actor and civilian rigs',()=>{
  assert.match(scene,/actorRigCount:this\.actors\.size/);
  assert.match(scene,/civilianRigCount:this\.civilianRigs\.size/);
  assert.match(main,/stats\?\.actorRigCount/);
  assert.match(main,/stats\?\.civilianRigCount/);
  assert.match(scene,/geometryCount:memory\.geometries,textureCount:memory\.textures/);
  assert.match(main,/stats\?\.geometryCount/);
  assert.match(main,/stats\?\.textureCount/);
});

test('site swaps discard obsolete weapon-light blockers and pose caches',()=>{
  assert.match(siteSwap,/this\.beamBlockerTick=-1;this\.beamBlockerSite=-1/);
  assert.match(siteSwap,/this\.beamBlockerRevision=-1;this\.beamBlockers=\[\]/);
  assert.match(siteSwap,/actor\.beam\.visible=false;actor\.beamLast=null/);
});
