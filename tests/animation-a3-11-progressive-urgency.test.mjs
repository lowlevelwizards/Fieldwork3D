import test from 'node:test';
import assert from 'node:assert/strict';
import {fireUrgency,passiveAimReadiness,
 contactAimOnAcquisition,contactAcquisitionScale,
 contactTurnScale,urgentFireMode,SHORT_STOCK_FIRE_YAW_LIMIT}
 from '../src/breach-fire-urgency.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
const p=(x,y)=>({x,y});
const approx=(a,b)=>assert.ok(Math.abs(a-b)<.001,`${a} vs ${b}`);

test('A3.11 readiness strictly escalates without creating a fire permission',()=>{
 const facts=[
  {confirmed:false,suspicious:false,authored:false,aimMode:null},
  {confirmed:false,suspicious:false,authored:true,aimMode:'fixed'},
  {confirmed:false,suspicious:false,authored:true,aimMode:'track'},
  {confirmed:false,suspicious:true,authored:true,aimMode:'track'},
  {confirmed:true,suspicious:true,authored:false,aimMode:null}
 ];
 const tiers=facts.map(fireUrgency);
 assert.deepEqual(tiers,['routine','look','watch','suspect','contact']);
 const readiness=tiers.map(passiveAimReadiness);
 assert.deepEqual(readiness,[0,.12,.26,.32,.36]);
 assert.ok(readiness.every((v,i)=>i===0||v>readiness[i-1]));
 assert.equal(contactAimOnAcquisition(.26),.26);
 assert.equal(contactAimOnAcquisition(.01),.16);
 assert.equal(contactAimOnAcquisition(.98),.48);
 assert.ok(contactAcquisitionScale('contact')<1);
 assert.ok(contactTurnScale('contact')>1);
 assert.equal(contactAcquisitionScale('watch'),1);
 assert.equal(fireUrgency({confirmed:false,suspicious:false,
  authored:true,aimMode:'free'}),'routine');
 assert.equal(fireUrgency({confirmed:false,suspicious:false,
  authored:false,aimMode:'free',lookOrder:true}),'look');
});

test('A3.11 short-stock permits only downrange emergency point fire',()=>{
 const clearance={blocked:false,carryOverride:'short',
  muzzle:{x:20,y:25,z:0,yaw:0,pitch:0}};
 assert.equal(urgentFireMode(null,.65,clearance,.12),'point');
 assert.equal(urgentFireMode('ads',.95,clearance,.12),'point',
  'short stock does not receive sighted ADS accuracy');
 assert.equal(urgentFireMode(null,.33,clearance,0),null);
 assert.equal(urgentFireMode('ads',1,clearance,SHORT_STOCK_FIRE_YAW_LIMIT+.02),null);
 assert.equal(urgentFireMode('ads',1,{...clearance,
  muzzle:{...clearance.muzzle,pitch:.56}},0),null,
  'a gun visibly aimed at the floor cannot fire straight forward');
 assert.equal(urgentFireMode('ads',1,{...clearance,blocked:true},0),null);
 assert.equal(urgentFireMode(null,1,{...clearance,carryOverride:'low'},0),null);
 assert.equal(urgentFireMode('ads',1,{...clearance,carryOverride:'ready'},0),'ads');
});

test('A3.11 pullback moves firearm, barrel, stock and both grips together',()=>{
 const p0=fitWeaponPose({weapon:'carbine',handling:'point',
  yaw:0,recoil:0,aimBlend:.7});
 const p1=fitWeaponPose({weapon:'carbine',handling:'point',
  yaw:0,recoil:0,aimBlend:.7,shoulderPullback:2.4});
 for(const part of ['origin','stock','primary','support']){
  approx(p1[part].x,p0[part].x-2.4);
  approx(p1[part].z,p0[part].z);
  approx(p1[part].y,p0[part].y);
 }
 const input={x:100,z:100,heading:0,weaponYaw:0,weapon:'carbine',
  aim:.7,velocity:0,recoil:0,posture:'stand',carryOverride:'point'};
 const regular=muzzleAtShot(input);
 const pulled=muzzleAtShot({...input,shoulderPullback:2.4});
 approx(pulled.x,regular.x-2.4);
 approx(pulled.z,regular.z);
 approx(pulled.yaw,regular.yaw);
 approx(muzzleAtShot({...input,shoulderPullback:999}).x,regular.x-3.2);
});

test('A3.11 cover still blocks a complete shot even with shorter gun',()=>{
 const input={x:100,z:100,heading:0,weaponYaw:0,weapon:'carbine',
  aim:.95,velocity:0,recoil:0,posture:'stand',threatRange:80};
 const clear=weaponClearance(input,[],[],[]);
 assert.equal(clear.blocked,false);
 const muzzle=muzzleAtShot(input);
 const at=muzzle.x-.9;
 const obstacle={a:p(at,60),b:p(at,140)};
 const recovered=weaponClearance(input,[],[],[obstacle]);
 assert.ok(recovered.shoulderPullback!==undefined||
   recovered.compression>0||recovered.blocked,
  'nearby wall must cause a physical adjustment or a hard block');
 if(!recovered.blocked){
  assert.ok(recovered.muzzle.x<at,
   'weapon barrel must remain on shooter side of cover');
  const ray=assessFireLane(p(recovered.muzzle.x,recovered.muzzle.z),
   recovered.muzzle.y,p(at+40,100),recovered.muzzle.y,[],
   [obstacle],[]);
  assert.equal(ray.blocker,'wall',
   'fitting the barrel alone never grants a shot through a wall');
 }
});
