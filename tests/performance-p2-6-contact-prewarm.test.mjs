import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {shouldPrewarmContactRig}
 from '../src/rendering/breach-contact-rig-prewarm.ts';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';

const baseline={phase:'planning',started:false,side:'red',
 visible:false,hasRig:false,historical:false};

test('P2.6 only unopened, unrevealed enemy presentation can prewarm',()=>{
 assert.equal(shouldPrewarmContactRig(baseline),true);
 for(const change of [
  {started:true},{phase:'running'},{side:'blue'},{visible:true},
  {hasRig:true},{historical:true},{phase:'complete'}
 ])assert.equal(shouldPrewarmContactRig({...baseline,...change}),false,
  'live combat, player actors and historical replay never expose hidden truth');
});
test('P2.6 hidden enemy initial pose fills appearance before live contact',()=>{
 const a=createOperatorRig('p26-guard','red',true);
 const b=createOperatorRig('p26-guard-reference','red',true);
 const pose={x:100,z:120,heading:0,velocity:0,seconds:0,
  stride:0,posture:'stand',injury:0,weapon:'carbine',
  down:false,surrender:false,aiming:false,firing:false,
  reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
  deterministic:true,poseDiagnostics:false};
 try{
  a.root.visible=false;
  poseOperator(a,pose,0);
  const key=a.root.userData.fieldworkLightingAppearanceKey;
  assert.ok(key!==undefined,'unseen actor receives wardrobe/lightmap pose');
  assert.equal(a.root.visible,false,'posing never discloses actor');
  assert.equal(a.weaponBody.children.length>0,
   'equipped weapon geometry is ready before visual contact');
  // First disclosure must reuse prepared silhouette and wardrobe output.
  const weaponPart=a.weaponBody.children[0];
  a.root.visible=true;
  poseOperator(a,{...pose,seconds:.016},1/60);
  assert.equal(a.weaponBody.children[0],weaponPart,
   'first contact does not regenerate firearm geometry');
  assert.equal(a.root.userData.fieldworkLightingAppearanceKey,key);
  poseOperator(b,pose,0);
  assert.deepEqual(
   a.weaponBody.children.map(x=>x.name),
   b.weaponBody.children.map(x=>x.name),
   'hidden prewarm and normal visible rig have same authored firearm parts');
 }finally{a.dispose();b.dispose();}
});
test('P2.6 the scene keeps cold prewarming restricted to initial planning',()=>{
 const scene=readFileSync(
  new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(scene,/const prewarmHostile=shouldPrewarmContactRig/);
 assert.match(scene,/started:s\.started,side:actor\.side,visible/);
 assert.match(scene,/historical:!!replay\|\|!!replayDisclosurePolicy/);
 assert.match(scene,/if\(!visible&&!this\.actors\.has\(actor\.id\)&&!prewarmHostile\)continue/);
 assert.match(scene,/if\(!object\.root\.visible&&!prewarmHostile\)\{/);
 assert.match(scene,/object\.beam\.visible=false/);
 assert.match(scene,/for\(const shadow of object\.contactShadows\)shadow\.visible=false/);
 assert.match(scene,/this\.graphicLookEnabled&&\(object\.root\.visible\|\|prewarmHostile\)/);
});
