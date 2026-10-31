import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stockPocket,elbowCorridor} from '../src/breach-anatomy.ts';
import {handlingProfile,HANDLING_PROFILES}
  from '../src/breach-handling-profiles.ts';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {readFileSync} from 'node:fs';

const modes=['low','high','ready','short','point','ads'];
const weapons=['carbine','smg','rifle','shotgun'];
const rigPose=(mode)=>({
 x:0,z:0,heading:0,travelYaw:0,seconds:1,velocity:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:mode==='ads',firing:false,turning:0,handlingOverride:mode,
 deterministic:true
});

test('169: stock seats medially without changing the visible buttplate or stock length',()=>{
 for(const mode of modes){
  const p=stockPocket(mode);
  assert.ok(p.z>=6.50&&p.z<=7.2,'bad shoulder pocket '+mode);
  if(mode!=='short')assert.ok(p.z<6.8,'stock still outboard '+mode);
  for(const weapon of weapons){
   const fit=fitWeaponPose({weapon,handling:mode,yaw:0,recoil:0});
   const g=weaponGrips(weapon);
   assert.equal(g.stockX,-13.5,'stock length must remain Build 168');
   const rear=new THREE.Vector3(g.stockX*g.lengthScale,0,0)
     .applyEuler(fit.rotation).add(fit.origin);
   assert.ok(fit.stock.distanceTo(rear)<1e-6);
   assert.ok(fit.stock.z>=(mode==='short'?6.60:6.35));
   assert.ok(fit.stockError<3);
   assert.ok(Number.isFinite(fit.contactError));
  }
 }
 assert.ok(stockPocket('short').z>stockPocket('ready').z+.25);
 assert.ok(stockPocket('short').y<stockPocket('ready').y-5);
});

test('169: independent elbows are driven by authored profiles and blend inputs',()=>{
 for(const mode of modes){
  const p=HANDLING_PROFILES[mode];
  const left=elbowCorridor(mode,-1,p),right=elbowCorridor(mode,1,p);
  assert.ok(left.z<0&&right.z>0);
  assert.ok(right.z+left.z>.05,
    'firing elbow must have greater outward bias than support '+mode);
  const relaxed={...p,firingElbowFlare:p.firingElbowFlare+.35};
  assert.ok(elbowCorridor(mode,1,relaxed).z>right.z+.3);
  assert.equal(elbowCorridor(mode,-1,relaxed).z,left.z);
  assert.ok(Math.abs(right.z)<9&&Math.abs(left.z)<9);
 }
 assert.ok(HANDLING_PROFILES.high.elbowTuck>HANDLING_PROFILES.ads.elbowTuck);
 assert.ok(HANDLING_PROFILES.short.elbowTuck>HANDLING_PROFILES.ready.elbowTuck);
});

test('169: shoulder girdle and eye alignment contribute without moving gameplay muzzle',()=>{
 const rig=createOperatorRig('rook','blue');
 const body={};
 for(const mode of modes){
   poseOperator(rig,rigPose(mode),0);
   body[mode]={headY:rig.head.position.y,profile:rig.handlingProfile,
     grips:rig.gripError,elbows:[...rig.elbowSpread]};
   assert.ok(rig.legGap.every(v=>v<1.5));
   assert.ok(Number.isFinite(rig.eyeError));
   assert.ok(rig.elbowSpread.every(Number.isFinite));
 }
 assert.ok(body.ads.profile.supportShoulderForward>
   body.ready.profile.supportShoulderForward);
 assert.ok(body.short.profile.firingShoulderForward<
   body.ready.profile.firingShoulderForward);
 assert.ok(body.ads.profile.headDrop<body.ads.profile.shoulderLift+1);
 // The live muzzle/chest stays authoritative when no explicit Lab override.
 poseOperator(rig,{...rigPose('ads'),handlingOverride:undefined},0);
 assert.ok(Math.abs(rig.chest.position.y-26)<1e-6);
 rig.dispose();
});

test('169: Lab diagnostics and version label use the same elbow profile',()=>{
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.match(html,/Build 169/);
 assert.match(lab,/rig\.handlingProfile\?\?undefined/);
 assert.match(rig,/elbowCorridor\(handling,sign as -1\|1,profile\)/);
 assert.match(rig,/profile\.supportShoulderForward/);
 assert.match(rig,/profile\.firingShoulderForward/);
});
