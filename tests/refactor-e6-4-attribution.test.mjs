/** E6.4: CPU attribution and WebGL upload-submission contracts.
 * No timing gates: measurements are observations, not phone FPS/GPU time. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession} from '../src/breach-game.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {createOperatorRig} from '../src/breach-operator-rig.ts';
import {updateOperatorAppearance} from '../src/breach-operator-appearance.ts';
import {bakedOperatorCarry} from '../src/rendering/breach-saved-operator-carry-bake.ts';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const loop=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
const controller=readFileSync(
 new URL('../src/breach-operator-animation-controller.ts',import.meta.url),'utf8');

test('E6.4 appearance profiler measures the original exact serialization and immediate edit invalidation',()=>{
 const session=newSession(0,4343);
 const actor=session.operators.find(a=>a.side==='blue');
 assert.ok(actor);
 actor.equipment=initialEquipmentLoadout(actor.weapon);
 const rig=createOperatorRig(actor.id,actor.side,true);
 try{
  const carry=bakedOperatorCarry(actor);
  const p={
   appearanceSeed:actor.appearanceSeed,equipment:actor.equipment,
   wardrobe:actor.wardrobe,weaponConfiguration:actor.weaponConfiguration,
   magazineCarryLocations:carry.locations,
   medicalCarryLocation:carry.medical,utilityCarryLocation:carry.utility,
   flashCharges:actor.flashCharges,treatmentActive:actor.treatmentActive,
   down:actor.health<=0,surrender:actor.surrendered
  };
  rig.root.userData.fieldworkProfilePose=true;
  updateOperatorAppearance(rig,p);
  const key=rig.root.userData.fieldworkLightingAppearanceKey;
  const exact=JSON.stringify([
   p.appearanceSeed??0,p.equipment??null,p.wardrobe??null,
   p.magazineCarryLocations??null,p.medicalCarryLocation??null,
   p.utilityCarryLocation??null,p.faceStyle??null,
   p.flashCharges??null,p.wedgeRemaining??null,
   p.restraintRemaining??null,p.treatmentActive??null,
   p.weaponConfiguration?.build?.parts.magazine??null,
   p.nvgDeployed??false
  ]);
  assert.equal(key,exact,'no key semantics changed');
  let stats=rig.root.userData.fieldworkAppearanceCpu;
  assert.equal(stats.appearanceChanged,1);
  assert.ok(Number.isFinite(stats.fingerprintMs)&&stats.fingerprintMs>=0);
  updateOperatorAppearance(rig,p);
  stats=rig.root.userData.fieldworkAppearanceCpu;
  assert.equal(stats.appearanceChanged,0,'steady pose never claims a rebuild');
  assert.equal(rig.root.userData.fieldworkLightingAppearanceKey,key);
  p.equipment.slots.rig=p.equipment.slots.rig==='rig-none'?
   'rig-full':'rig-none';
  updateOperatorAppearance(rig,p);
  stats=rig.root.userData.fieldworkAppearanceCpu;
  assert.equal(stats.appearanceChanged,1,'in-place wardrobe edit is immediate');
  assert.notEqual(rig.root.userData.fieldworkLightingAppearanceKey,key);
  rig.root.userData.fieldworkProfilePose=false;
  delete rig.root.userData.fieldworkAppearanceCpu;
  updateOperatorAppearance(rig,p);
  assert.equal(rig.root.userData.fieldworkAppearanceCpu,undefined,
   'normal gameplay never pays for diagnostic reports');
 }finally{rig.dispose();}
});

test('E6.4 retains one persistent CanvasTexture and records renderer callback submissions',()=>{
 assert.match(scene,/this\.fogTexture=new THREE\.CanvasTexture\(this\.fogCanvas\)/);
 assert.match(scene,/this\.fogTexture\.onUpdate=\(\)=>\{/);
 assert.match(scene,/this\.fogTextureSubmittedUploads\+\+/);
 assert.match(scene,/this\.fogTextureSubmittedBytesEstimate\+=/);
 assert.match(scene,/this\.fogCanvas\.width\*this\.fogCanvas\.height\*4/);
 assert.match(scene,/this\.fogTexture\.needsUpdate=true/);
 assert.match(scene,/fogTextureUpdateRequests:this\.fogTextureUpdateRequests/);
 assert.match(scene,/fogTextureSubmittedUploads:this\.fogTextureSubmittedUploads/);
 assert.match(scene,/fogTextureSubmittedBytesEstimate:this\.fogTextureSubmittedBytesEstimate/);
 assert.match(scene,/fogComposeCpuTotalMs:this\.profileSceneUpdate\?/);
 assert.match(scene,/setPerformanceProfilingEnabled\(enabled:boolean\):void\{/);
 assert.match(scene,/actor\.physical\.root\.userData\.fieldworkProfilePose=enabled/);
 assert.doesNotMatch(scene,/this\.fogTexture\.dispose\(/);
 assert.doesNotMatch(scene,/this\.renderer\.dispose\(/);
});

test('E6.4 interval capture separates changed-frame Canvas2D work and submitted textures',()=>{
 assert.match(loop,/const intervalE6=\{/);
 assert.match(loop,/if\(updated3d\)\{/);
 assert.match(loop,/intervalE6\.fogCanvasMs\+=stats\?\.fogComposeMs\?\?0/);
 assert.match(loop,/totals\.uploads-lastFogUploadTotals\.uploads/);
 assert.match(loop,/totals\.requests-lastFogUploadTotals\.requests/);
 assert.match(loop,/totals\.bytes-lastFogUploadTotals\.bytes/);
 assert.match(loop,/E6\.4 APPEARANCE KEY/);
 assert.match(loop,/E6\.4 FOG CANVAS/);
 assert.match(loop,/E6\.4 WINDOW 3D/);
 assert.match(loop,/intervalE6\[k\]=0/);
 assert.match(controller,/appearanceFingerprintMs:kitBreakdown\?\.fingerprintMs\?\?0/);
 assert.match(controller,/appearanceInvalidations:kitBreakdown\?\.appearanceChanged\?\?0/);
 assert.match(scene,/this\.actorPhaseCosts\.appearanceFingerprintMs\+=/);
 assert.match(scene,/this\.actorPhaseCosts\.appearanceInvalidations\+=/);
});

test('E6.4 does not throttle visible rigs, introduce fog disclosure, or change contact-prewarm quota',()=>{
 assert.match(scene,/let coldPrewarmBuilt=0;/);
 assert.match(scene,/withinContactPrewarmBudget\(true,coldPrewarmBuilt\)/);
 assert.match(scene,/if\(!visible&&!this\.actors\.has\(actor\.id\)&&!prewarmHostile\)continue;/);
 assert.match(scene,/object\.root\.visible=visible;/);
 assert.match(scene,/poseOperator\(object\.physical,\{/);
 assert.match(scene,/paintFogMemory\(this\.fogMemoryContext,s,this\.fogDiagnostic\)/);
 assert.match(scene,/paintFogVisibility\(this\.fogContext,s\)/);
 assert.match(scene,/fogSessionFingerprint\(s\)/);
 assert.match(scene,/this\.fogAt>=\(this\.quality\.mode===/);
});
