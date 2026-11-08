import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ANATOMY,stockPocket,carryElbowViolation}
 from '../src/breach-anatomy.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {M4A1_AUTHORED_SHORT}
 from '../src/breach-authored-m4a1-short-stock.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {fitWeaponPose,weaponGrips}
 from '../src/breach-weapon-pose.ts';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const carbine='carbine';
const configuration=selectWeaponFamilyPreset(
  initialWeaponConfiguration(carbine),'ar-m4a1');
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const base={x:0,z:0,heading:0,weaponYaw:0,weapon:carbine,
 weaponConfiguration:configuration,aim:1,velocity:0,recoil:0,
 posture:'stand'};
const pose=(mode,more={})=>({
 x:0,z:0,heading:0,travelYaw:0,velocity:0,seconds:2,
 stride:0,posture:'stand',injury:0,weapon:carbine,
 weaponConfiguration:configuration,reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:mode==='ads',firing:false,turning:0,aimBlend:mode==='ads'?1:0,
 deterministic:true,handlingOverride:mode,...more
});
const armJoint=arm=>arm.lower.position.clone().multiplyScalar(2)
 .sub(arm.hand.position);
const armShoulder=(arm,joint)=>arm.upper.position.clone()
 .multiplyScalar(2).sub(joint);

test('normal stocks shoulder at the front; SHORT tucks beside the waist',()=>{
 for(const mode of ['low','high','ready','point','ads']){
  const pocket=stockPocket(mode);
  assert.ok(pocket.x>=4.3&&pocket.x<=5.2,mode+' front seat X');
  assert.ok(pocket.z>=5.0&&pocket.z<5.5,mode+' close to chest edge');
  const fit=fitWeaponPose({weapon:carbine,configuration,
   handling:mode,yaw:0,recoil:0});
  assert.ok(fit.stockError<3,mode+' contact stays seated');
  assert.ok(fit.stock.z<7.8,mode+' no floating side stock');
 }
 const short=stockPocket('short'),ready=stockPocket('ready');
 assert.ok(short.x<0&&short.x<ready.x-5,'tuck must pull BACK');
 assert.ok(short.y<-4&&short.y<ready.y-7,'tuck must drop toward waist');
 assert.ok(short.z>ANATOMY.shoulderRight.z+.5,
   'tuck must move outside right ribs beneath the armpit');
 const fit=fitWeaponPose({weapon:carbine,configuration,
   handling:'short',yaw:0,recoil:0});
 assert.ok(fit.stock.distanceTo(
   new THREE.Vector3(...M4A1_AUTHORED_SHORT.targets.stock))<1e-6,
   'M4A1 buttplate must exactly match user-authored pose, not old socket');
});
test('wall fold is a continuous rigid gun transform with sliding grip',()=>{
 const input={weapon:carbine,configuration,handling:'short',
  shortFrom:'ready',yaw:0,recoil:0};
 const from=fitWeaponPose({...input,handling:'ready'});
 let lastZ=Infinity,lastX=Infinity;
 let lastButtX=Infinity,lastButtY=Infinity,lastButtZ=-Infinity;
 for(const progress of [0,.1,.25,.4,.6,.8,1]){
  const fit=fitWeaponPose({...input,shortCompression:progress});
  assert.ok(fit.stock.x<=lastButtX+.01&&
    fit.stock.y<=lastButtY+.01&&fit.stock.z>=lastButtZ-.01,
    'butt must move rearward, downward and outside: '+progress);
  lastButtX=fit.stock.x;lastButtY=fit.stock.y;lastButtZ=fit.stock.z;
  // The rigid gun keeps its *physical* ready grip sockets; the
  // approved operator's independent wrist targets can differ. Never
  // silently move the authored wrist to an old short-stock socket.
  const grips=weaponGrips(carbine,configuration,'ready');
  const actual=V(grips.supportX*grips.lengthScale,
    grips.supportY,-1.6).applyEuler(fit.rotation).add(fit.origin);
  assert.ok(actual.distanceTo(fit.support)<1e-6,
    'rigid support grip socket detached from gun at '+progress);
  const sample=muzzleAtShot({...base,obstruction:true,
    shortCompression:progress});
  assert.ok(sample.y<=lastZ+.01,'barrel must fold downward');
  assert.ok(sample.x<=lastX+.01,'barrel must come back toward torso');
  lastZ=sample.y;lastX=sample.x;
 }
 const ready=fitWeaponPose({...input,handling:'ready'});
 const tucked=fitWeaponPose({...input,shortCompression:1});
 assert.ok(tucked.stock.x<ready.stock.x-5);
 assert.ok(tucked.stock.y<ready.stock.y-7);
 assert.ok(tucked.stock.z>ready.stock.z+2);
});
test('approaching a wall produces increasing compression before contact',()=>{
 const ready=muzzleAtShot(base);
 const walls=[ready.x+16,ready.x+7,ready.x+2,ready.x-3];
 let previous=-.001;
 for(const x of walls){
  const result=weaponClearance(base,[],[],[
   {a:{x,y:-40},b:{x,y:40}}
  ]);
  assert.ok(result.compression>=previous,
    'wall approach must not unfold a rifle: '+x);
  assert.ok(result.compression>=0&&result.compression<=1);
  if(result.compression>0){
   assert.equal(result.obstruction,true);
   assert.deepEqual(result.muzzle,muzzleAtShot({...base,
     obstruction:true,shortCompression:result.compression,
     clearanceRetraction:0}));
  }
  previous=result.compression;
 }
 assert.ok(previous>.35,'barrel never responded to approaching wall');
});
test('short-stock and run keep both elbows forward/down without stretching',()=>{
 const rig=createOperatorRig('stock-fold-elbows','blue');
 try{
  const cases=[
   pose('ready'),pose('ads'),pose('short'),
   ...[.1,.3,.55,.8,1].map(shortCompression=>
     pose('short',{shortCompression})),
   pose('low',{velocity:46,gait:'run',handlingIntent:'run',
     deterministic:true})
  ];
  for(const state of cases){
   poseOperator(rig,state,0);
   for(const [index,arm] of rig.arms.entries()){
    const joint=armJoint(arm),shoulder=armShoulder(arm,joint);
    // The user-approved short-stock intentionally draws the firing arm
    // rearward under the armpit; normal running/ready must still honor the
    // forward/down corridor. The independent authored-pose regression
    // checks exact manual elbow positions instead of rejecting them here.
    if(state.handlingOverride!=='short')
     assert.ok(carryElbowViolation(shoulder,joint,index===0?-1:1)<.075,
       'elbow flapped behind shoulder in '+state.handlingOverride+
       ' arm '+index+': '+JSON.stringify(joint.toArray()));
    assert.ok(Math.abs(arm.upper.scale.y-10)<1e-6);
    assert.ok(Math.abs(arm.lower.scale.y-10)<1e-6);
   }
  }
 }finally{rig.dispose();}
});

test('classic weapons use a compact support grip on the same rigid gun',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const fit=fitWeaponPose({weapon,handling:'short',yaw:0,recoil:0});
  const grip=weaponGrips(weapon,undefined,'short');
  const p=V(grip.supportX*grip.lengthScale,grip.supportY,-1.6)
    .applyEuler(fit.rotation).add(fit.origin);
  assert.ok(fit.support.distanceTo(p)<1e-6,weapon+' wrist detached');
  assert.ok(grip.supportX<=1.35,weapon+' hand should fold in near the receiver');
 }
});
