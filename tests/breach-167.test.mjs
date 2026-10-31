import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {stockPocket,elbowCorridor} from '../src/breach-anatomy.ts';
import {blendedHandlingProfile} from '../src/breach-handling-transition.ts';
import {readFileSync} from 'node:fs';

const pose=(mode)=>({x:0,z:0,seconds:1,heading:0,velocity:0,
 stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:mode==='ads',firing:false,
 turning:0,deterministic:true,handlingOverride:mode});

test('167: stock contact uses the actual rear face of the visible stock',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const g=weaponGrips(weapon);
  assert.equal(g.stockX,-12.5);
  assert.ok(g.supportX>g.primaryX+1.2,
   weapon+' must preserve support-hand grip ahead of firing hand');
  for(const mode of ['high','low','ready','short','point','ads']){
   const fit=fitWeaponPose({weapon,handling:mode,yaw:0,recoil:0});
   const butt=new THREE.Vector3(g.stockX*g.lengthScale,0,0)
     .applyEuler(fit.rotation).add(fit.origin);
   assert.ok(butt.distanceTo(fit.stock)<1e-7,
     'visible buttplate and claimed stock contact must coincide');
   assert.ok(fit.stock.z>=8.15,
     weapon+' '+mode+' sends buttplate inside the torso');
   assert.ok(Number.isFinite(fit.contactError));
   assert.ok(fit.stockError<3,
     weapon+' '+mode+' cannot contact its shoulder pocket: '+fit.stockError);
  }
 }
});

test('167: underarm short-stock contact is below and outside ready pocket',()=>{
 const ready=stockPocket('ready'),short=stockPocket('short');
 assert.ok(short.y<ready.y-5);
 assert.ok(short.z>ready.z+1);
 assert.ok(short.x<ready.x-2);
 const fitR=fitWeaponPose({weapon:'carbine',handling:'ready',yaw:0,recoil:0});
 const fitS=fitWeaponPose({weapon:'carbine',handling:'short',yaw:0,recoil:0});
 assert.ok(fitS.stock.y<fitR.stock.y-5);
 assert.ok(fitS.stock.z>fitR.stock.z+1);
});

test('167: elbows use compact shoulder-relative bend corridors',()=>{
 const high=elbowCorridor('high',1),ads=elbowCorridor('ads',1);
 assert.ok(high.z<ads.z);
 for(const mode of ['high','low','ready','short','point','ads']){
  const r=createOperatorRig('rook','blue');
  poseOperator(r,pose(mode),0);
  assert.ok(r.elbowSpread.every(Number.isFinite));
  assert.ok(r.elbowSpread.every(v=>v<8),
   mode+' still makes an extreme outward elbow wing');
  r.dispose();
 }
});

test('167: interrupted blend can begin from the exact displayed weapon',()=>{
 const from=fitWeaponPose({weapon:'carbine',handling:'low',yaw:0,recoil:0});
 const target={origin:from.origin.clone().add(new THREE.Vector3(1.3,-.5,0)),
  rotation:from.rotation.clone()};
 const p=fitWeaponPose({weapon:'carbine',handling:'ads',yaw:0,recoil:0,
  blendFrom:'low',blendAlpha:0,blendSnapshot:target});
 assert.ok(p.origin.distanceTo(target.origin)<1e-8);
 const after=fitWeaponPose({weapon:'carbine',handling:'ads',yaw:0,recoil:0,
  blendFrom:'low',blendAlpha:1,blendSnapshot:target});
 const to=fitWeaponPose({weapon:'carbine',handling:'ads',yaw:0,recoil:0});
 assert.ok(after.origin.distanceTo(to.origin)<1e-8);
 const previous=blendedHandlingProfile('low','ready',.4,'carbine');
 const immediate=blendedHandlingProfile('low','ads',0,'carbine',previous);
 assert.deepEqual(immediate,previous);
});

test('167: live Lab buttons expose animated, interruptible contact diagnostics',()=>{
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(lab,/fromWeapon:\{/);
 assert.match(lab,/performance\.now\(\)\/1000-labSwitch\.since/);
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.match(rig,/blendSnapshot:p\.handlingTransition\?\.fromWeapon/);
 assert.match(lab,/BUTTPLATE GAP/);
 assert.match(lab,/ELBOW SPREAD/);
 assert.match(lab,/handlingBlend/);
});
