import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
test('166: ADS head follows sight line while gun, grips and muzzle stay rigid',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const body=createOperatorRig('rook','blue');
  body.root.position.set(50,0,50);
  const p={x:50,z:50,heading:0,seconds:1,velocity:0,stride:0,
   posture:'stand',injury:0,weapon,reload:0,reloadDuration:1.8,
   lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
   aiming:true,firing:false,turning:0,deterministic:true,
   handlingOverride:'ads'};
  poseOperator(body,p,0);
  assert.ok(Number.isFinite(body.eyeError));
  assert.ok(body.eyeError<5,'eye misaligned with sights for '+weapon);
  assert.ok(body.gripError<.25,'weapon hands detached in ADS '+weapon);
  assert.ok(body.legGap.every(v=>v<1.5));
  body.dispose();
 }
});
test('166: blended stock error measures the actual interpolated pocket',()=>{
 for(let i=0;i<=10;i++){
  const fit=fitWeaponPose({weapon:'carbine',handling:'ads',
   blendFrom:'ready',blendAlpha:i/10,yaw:0,recoil:0});
  assert.ok(Number.isFinite(fit.stockError));
 }
});
test('166: mobile comparison poses cache stable rigs and support reference export',()=>{
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 assert.match(lab,/if\(comparisonKey!==signature\)/);
 assert.match(lab,/comparePoseUpdates/);
 assert.match(lab,/canvas\.toDataURL\('image\/png'\)/);
 assert.match(html,/id="savePoseView"/);
 assert.match(html,/body\.compare-open main/);
});
test('166 final: silhouette mode is reversible and comparison views stay accessible',()=>{
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 assert.match(lab,/material\.color\.copy\(enabled\?silhouetteColor:originalColor\)/);
 assert.match(lab,/if\(!comparing&&silhouettes\)applySilhouette\(rig,true\)/);
 assert.match(lab,/applySilhouette\(body,silhouettes\)/);
 assert.match(html,/body\.compare-open main>\.row:has\(#comparePose\)>\[data-view\]/);
 assert.match(html,/overflow-x:auto/);
 assert.match(lab,/if\(comparing\)fit\(\)/);
});
test('166 final: screenshot captures fresh WebGL frame inside user gesture',()=>{
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 const start=lab.indexOf("choose<HTMLButtonElement>('savePoseView').addEventListener");
 const end=lab.indexOf('silhouetteButton.addEventListener',start);
 assert.ok(start>0&&end>start);
 const block=lab.slice(start,end);
 assert.ok(block.indexOf('renderer.render(scene,camera)')<
   block.indexOf("canvas.toDataURL('image/png')"));
 assert.match(block,/link\.download='fieldwork-poses-reference\.png'/);
 assert.match(block,/catch\(error\)/);
});
