import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const start=scene.indexOf('  update(s:Session,selected:string,dt:number,');
const end=scene.indexOf('  render(',start);
assert.ok(start>=0,'tactical scene update exists');
const update=scene.slice(start,end<start?undefined:end);

test('frame-fixed operator shadow budget is calculated once for all actors',()=>{
  assert.match(update,/const shadowDetail=operatorShadowDetail\(\s*projectedOperatorHeightPx\(this\.camera,this\.height\),this\.quality\.mode\)/);
  assert.match(update,/const cavityQuality=cavityQualityForDetail\(shadowDetail\)/);
  assert.match(update,/object\.physical\.root\.userData\.fieldworkCavityQuality=cavityQuality/);
  assert.equal((update.match(/projectedOperatorHeightPx\(/g)??[]).length,1);
  assert.match(update,/applyOperatorShadowLod\(\s*object\.physical\.root,shadowDetail\)/);
});

test('cutaway camera vector is a frame-reused value, not per-frame allocation',()=>{
  assert.match(scene,/private readonly frameCameraOffset=new THREE\.Vector3\(\)/);
  assert.match(update,/const fromCamera=this\.frameCameraOffset\s*\.copy\(this\.projectionCamera\.position\)\.sub\(this\.target\)/);
  assert.doesNotMatch(update,/this\.projectionCamera\.position\.clone\(\)\.sub\(this\.target\)/);
});

test('door visibility and halo use the identical computed center',()=>{
  assert.match(update,/const center=doorCenter\(door\)/);
  assert.match(update,/const directlyObserved=!personal&&liveVisibility\(s,center\)/);
  assert.match(update,/knownAt\(s,center\.x,center\.y\)/);
  assert.match(update,/doorKnown\(s\.intel,door\.id\)/);
  assert.doesNotMatch(update,/knownAt\(s,doorCenter\(door\)\.x/);
});

test('ground blood occlusion shares a reset, frame-owned list',()=>{
  assert.match(scene,/private readonly frameVisibleBloodBlockers:Pt\[\]=\[\]/);
  assert.match(update,/const visibleBloodBlockers=this\.frameVisibleBloodBlockers/);
  assert.match(update,/visibleBloodBlockers\.length=0/);
  assert.match(update,/if\(s\.impactMarks\.length\)\{/);
  assert.match(update,/visibleBloodBlockers\.push\(actor\.p\)/);
  assert.match(scene,/this\.frameVisibleBloodBlockers\.length=0;/);
  assert.match(update,/groundBloodFootprintOccluded\([\s\S]*?visibleBloodBlockers/);
});

test('effect pruning clears the same three pools without allocating tuple arrays',()=>{
  assert.match(scene,/private retireInactiveEffectMeshes\(/);
  assert.match(scene,/if\(!activeIds\.has\(id\)\)\{/);
  for(const [cache,set] of [
    ['discarded','activeMag'],['thrown','liveGrenades'],['detonations','liveBursts']])
    assert.ok(update.includes(`this.retireInactiveEffectMeshes(this.${cache},${set});`));
  assert.doesNotMatch(update,/\[this\.discarded,activeMag\]/);
});
