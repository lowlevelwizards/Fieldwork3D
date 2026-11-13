import test from 'node:test';
import assert from 'node:assert/strict';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {assessFireLane,assessFriendlyLane}
 from '../src/breach-fire-safety.ts';
import {chooseMicroAimOffset,approachMicroAimOffset,allowMicroAim,
 MICRO_AIM_CANDIDATES} from '../src/breach-physical-micro-aim.ts';
import {createA3Session,DEFAULT_A3_CONFIG} from '../src/a3-physicality-scenarios.ts';
import {probeA3} from '../src/a3-physicality-probe.ts';
import {team,stepSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const close=(a,b,margin=1e-6)=>assert.ok(Math.abs(a-b)<=margin,
 'expected '+a+' close to '+b);
test('A3.2 candidate ordering, minimal adjustment, hysteresis and no impossible fire',()=>{
 assert.deepEqual(MICRO_AIM_CANDIDATES,[0,-1.2,1.2,-2.4,2.4,-3.2,3.2]);
 let checks=0;
 const c=chooseMicroAimOffset(0,offset=>{checks++;return offset===1.2;});
 assert.equal(c.offset,1.2);assert.equal(c.attempts,3);
 const held=chooseMicroAimOffset(1.2,offset=>offset===1.2||offset===-1.2);
 assert.equal(held.offset,1.2);assert.equal(held.reason,'retained');
 const no=chooseMicroAimOffset(0,()=>false);
 assert.equal(no.offset,0);assert.equal(no.reason,'blocked');
 assert.equal(no.attempts,MICRO_AIM_CANDIDATES.length);
});
test('A3.2 input and rendered stock+grips+muzzle translate as one canonical fit',()=>{
 const input={weapon:'carbine',handling:'ads',yaw:0,recoil:0,aimBlend:.9};
 const zero=fitWeaponPose(input),other=fitWeaponPose({...input,shoulderOffset:2.4});
 for(const name of ['origin','stock','primary','support']){
  close(other[name].x,zero[name].x);
  close(other[name].y,zero[name].y);
  close(other[name].z-zero[name].z,2.4);
 }
 const muzzle={x:100,z:100,heading:0,weaponYaw:0,
  weapon:'carbine',aim:.9,velocity:0,recoil:0,posture:'stand'};
 const first=muzzleAtShot(muzzle),shift=muzzleAtShot({...muzzle,shoulderOffset:2.4});
 close(shift.z-first.z,2.4);close(shift.x,first.x);close(shift.y,first.y);
 const bounded=muzzleAtShot({...muzzle,shoulderOffset:900});
 close(bounded.z-first.z,3.2);
});
test('A3.2 actual muzzle and aim adjustment must respect full friend and solid clearance',()=>{
 const input={x:100,z:100,heading:0,weaponYaw:0,
  weapon:'carbine',aim:.95,velocity:0,recoil:0,posture:'stand'};
 const center=weaponClearance(input,[],[],[]);
 const origin={x:center.muzzle.x,y:center.muzzle.z};
 const target={x:220,y:100};
 const ally={x:164,y:108,posture:'stand'};
 // Build the helper check on the same actual rigid gun the renderer uses.
 const evaluate=offset=>{
  const clearance=weaponClearance({...input,shoulderOffset:offset},
    [],[],[],[ally]);
  if(clearance.blocked)return false;
  const from={x:clearance.muzzle.x,y:clearance.muzzle.z};
  return assessFriendlyLane(from,clearance.muzzle.y,target,32,[ally])
    .blocker==='clear'&&assessFireLane(from,clearance.muzzle.y,target,32,
    [],[],[],[ally]).blocker==='clear';
 };
 const best=chooseMicroAimOffset(0,evaluate);
 assert.ok(MICRO_AIM_CANDIDATES.includes(best.offset));
 if(best.offset!==0)assert.ok(evaluate(best.offset));
 assert.equal(assessFriendlyLane(origin,center.muzzle.y,target,32,
  [{x:164,y:100,posture:'stand'}]).blocker,'friendly');
 const impossible=chooseMicroAimOffset(0,offset=>{
  const sample=weaponClearance({...input,shoulderOffset:offset},
    [],[],[],[{x:155,y:100,posture:'stand'}]);
  const from={x:sample.muzzle.x,y:sample.muzzle.z};
  return !sample.blocked&&assessFriendlyLane(from,sample.muzzle.y,target,
    32,[{x:155,y:100,posture:'stand'}]).blocker==='clear';
 });
 assert.equal(impossible.offset,0,'impossible centered stack does not magically permit a shot');
});
test('A3.2 real-session ENGAGE fixture drives fixed-step game and exact muzzle',()=>{
 // Same actual session and physical muzzle as the interactive inspector.
 const config={...DEFAULT_A3_CONFIG,scenario:'rear-stack',
  intent:'engage',operators:2};
 const session=createA3Session(config);
 try{
  const blue=team(session),shooter=blue[0],lead=blue[1];
  assert.equal(shooter.firePolicy,'engage');
  assert.equal(lead.firePolicy,'hold');
  const sample=probeA3(session,config);
  const clearance=weaponClearance({x:shooter.p.x,z:shooter.p.y,
   heading:shooter.heading,weaponYaw:shooter.weaponYaw,
   shoulderOffset:shooter.aimSideOffset??0,weapon:shooter.weapon,
   aim:shooter.aim,velocity:shooter.velocity,recoil:shooter.recoil,
   posture:shooter.posture,weaponConfiguration:shooter.weaponConfiguration,
   equipment:shooter.equipment},session.doors,[],[]);
  close(sample.shot.muzzle.x,clearance.muzzle.x,.001);
  close(sample.shot.muzzle.z,clearance.muzzle.z,.001);
  for(let i=0;i<18;i++)stepSession(session,1/60);
  const after=probeA3(session,config);
  assert.ok(Number.isFinite(after.shooter.shoulderOffset));
  assert.ok(Math.abs(after.shooter.shoulderOffset)<=3.2);
  assert.equal(lead.postureWasAuthored,false);
 }finally{activateSite(null);}
});
test('A3.2 fixed-tick approaches smoothly and decays when interrupted',()=>{
 let v=0;for(let i=0;i<20;i++){
  const next=approachMicroAimOffset(v,2.4,1/60);
  assert.ok(Math.abs(next-v)<=.351);v=next;
 }
 close(v,2.4);
 for(let i=0;i<20;i++)v=approachMicroAimOffset(v,0,1/60);
 close(v,0);
 assert.equal(approachMicroAimOffset(NaN,2,1/60),0);
 assert.equal(allowMicroAim({moving:0,busy:false,fireAllowed:true,
  aiming:true,activeTarget:true}),true);
 assert.equal(allowMicroAim({moving:13,busy:false,fireAllowed:true,
  aiming:true,activeTarget:true}),false);
 assert.equal(allowMicroAim({moving:0,busy:true,fireAllowed:true,
  aiming:true,activeTarget:true}),false);
});
