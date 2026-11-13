import test from 'node:test';
import assert from 'node:assert/strict';
import {friendIntersectsTrajectory,safetyBodyFor,
 FRIENDLY_CROUCH_VOLUMES,FRIENDLY_STAND_VOLUMES}
 from '../src/breach-friendly-safety-volume.ts';
import {assessFireLane,assessFriendlyLane,fireLaneReachable}
 from '../src/breach-fire-safety.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {createA3Session,DEFAULT_A3_CONFIG}
 from '../src/a3-physicality-scenarios.ts';
import {team,enemies,stepSession}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {aimHeight} from '../src/breach-cover-height.ts';
const p=(x,y)=>({x,y});
const shot=(fromY,toY,friends,from=p(0,0),to=p(100,0))=>
 assessFireLane(from,fromY,to,toY,[],[],[],friends).blocker;
const F=(posture,x=48,y=0)=>({...p(x,y),posture});
test('A3.1 upright friendly fully protects torso and helmet while crouch opens only true overhead lanes',()=>{
 assert.equal(shot(32,32,[F('stand')]),'friendly');
 assert.equal(shot(32,32,[F('crouch')]),'clear');
 assert.equal(shot(27,27,[F('crouch')]),'clear');
 assert.equal(shot(26,26,[F('crouch')]),'friendly',
  'tangent to highest helmet and its margin is not a clear lane');
 assert.equal(shot(18,18,[F('crouch')]),'friendly');
 assert.equal(shot(11,11,[F('crouch')]),'friendly');
 assert.equal(shot(32,32,[F('stand',48,8)]),'friendly',
  'grazing helmet and shoulder region are protected');
 assert.equal(shot(32,32,[F('stand',48,9)]),'clear',
  'valid sufficiently lateral head-height path can clear');
 assert.equal(FRIENDLY_CROUCH_VOLUMES[1].top,26);
 assert.ok(FRIENDLY_STAND_VOLUMES[1].top>FRIENDLY_CROUCH_VOLUMES[1].top);
});
test('A3.1 diagonal trajectories and segment-overlap stay protected, not a center-only check',()=>{
 assert.equal(shot(34,12,[F('crouch',50,0)]),'friendly',
  'ray descends into crouched body');
 assert.equal(shot(34,31,[F('crouch',50,0)]),'clear',
  'high shot never descends into crouched body');
 assert.equal(shot(29,27,[F('crouch',50,0)]),'clear');
 assert.equal(shot(29,23,[F('crouch',50,0)]),'friendly',
  'descending flank touches helmet edge');
 assert.equal(shot(18,18,[F('crouch',0,0)]),'friendly',
  'muzzle at occupied endpoint blocked');
 assert.equal(shot(18,18,[F('crouch',100,0)]),'friendly',
  'ally at target endpoint remains protected');
 assert.equal(shot(32,32,[F('stand',110,0)]),'clear',
  'teammate past segment end not falsely blocking');
 assert.equal(shot(29,29,[F('crouch',50,10.5)]),'clear');
 assert.equal(shot(12,12,[F('crouch',50,10.5)]),'friendly',
  'torso horizontal grazing blocked at torso height');
});
test('A3.1 unknown posture and legacy 2D point callers remain conservative',()=>{
 for(const legacy of [p(48,0),{...p(48,0),posture:'invalid'}]){
  assert.equal(shot(40,40,[legacy]),'friendly',
   'unknown posture may never grant height clearance');
  assert.equal(shot(100,100,[legacy]),'friendly');
 }
 assert.equal(shot(40,40,[p(48,20)]),'clear');
 assert.equal(friendIntersectsTrajectory(p(0,0),25,p(100,0),25,F('crouch',50,0)),true);
 assert.equal(friendIntersectsTrajectory(p(0,0),35,p(100,0),35,F('crouch',50,0)),false);
});
test('A3.1 projectile and rigid weapon use same crouch volumes, but independent cover/door authority',()=>{
 const crouch=F('crouch',34,0);
 assert.equal(assessFireLane(p(0,0),32,p(70,0),32,[],[],[],[crouch],
  'projectile').blocker,'clear');
 assert.equal(assessFireLane(p(0,0),32,p(70,0),32,[],[],[],[crouch],
  'weapon').blocker,'clear');
 assert.equal(assessFireLane(p(0,0),12,p(70,0),12,[],[],[],[crouch],
  'weapon').blocker,'friendly');
 assert.equal(assessFireLane(p(0,0),32,p(70,0),32,[],[],
  [{id:'test',a:p(40,-20),b:p(40,20),open:false,hinge:'a',kind:'hinged'}],
  [crouch],'weapon').blocker,'door');
 const cover=[{x:40,y:0,w:20,h:20,fixture:'shelf'}];
 assert.equal(assessFireLane(p(0,0),32,p(70,0),32,cover,[],[],
  [crouch]).blocker,'cover');
 assert.equal(fireLaneReachable({blocker:'friendly'},
  {end:p(70,0),remaining:1},p(70,0)),false);
});
test('A3.1 allied body is a hard veto even when penetrable cover is also in the lane',()=>{
 const cover=[{x:45,y:0,w:20,h:20,fixture:'shelf'}];
 const teammate=F('stand',70,0);
 assert.equal(assessFireLane(p(0,0),32,p(100,0),32,
  cover,[],[],[teammate]).blocker,'cover',
  'world/material priorities remain unchanged for diagnostics');
 assert.equal(assessFriendlyLane(p(0,0),32,p(100,0),32,
  [teammate]).blocker,'friendly',
  'independent veto blocks any penetrable-cover approval');
 assert.equal(assessFireLane(p(0,0),32,p(100,0),32,
  cover,[],[],[]).blocker,'cover');
});
test('A3.1 long spread/missed projectile path guards teammates behind target',()=>{
 const intended=p(90,0),far=p(190,0),behind=F('stand',135,0);
 assert.equal(shot(32,32,[behind],p(0,0),intended),'clear',
  'near target lane can be open');
 assert.equal(shot(32,32,[behind],p(0,0),far),'friendly',
  'full outgoing tracer needs the additional downstream veto');
});
test('A3.1 all bodies are considered independently and shooter is excluded by caller',()=>{
 const first=F('crouch',24,0),second=F('stand',70,0);
 assert.equal(shot(32,32,[first,second]),'friendly');
 assert.equal(shot(32,32,[first]),'clear');
 assert.equal(shot(32,32,[first,F('stand',150,0)]),'clear');
 const actor={p:p(50,5),posture:'crouch'};
 assert.deepEqual(safetyBodyFor(actor),{x:50,y:5,posture:'crouch'});
});
test('A3.1 actual seeded Breach stack tracks crouch and uses the true current muzzle',()=>{
 const cfg={...DEFAULT_A3_CONFIG,scenario:'mixed-crouch',operators:2};
 const s=createA3Session(cfg);
 try{
  const blue=team(s),a=blue[0],ally=blue[1],target=enemies(s)[0];
  const input={x:a.p.x,z:a.p.y,heading:a.heading,
   weaponYaw:a.weaponYaw,weapon:a.weapon,equipment:a.equipment,
   weaponConfiguration:a.weaponConfiguration,aim:a.aim,
   posture:a.posture,velocity:0,recoil:0};
  const ready=weaponClearance(input,s.doors,[],[]);
  const from={x:ready.muzzle.x,y:ready.muzzle.z};
  const targetHeight=aimHeight(target.posture==='crouch');
  const actual=assessFireLane(from,ready.muzzle.y,target.p,targetHeight,
   [],[],[],[safetyBodyFor(ally)]);
  const flat=assessFireLane(from,ready.muzzle.y,target.p,targetHeight,
   [],[],[],[ally.p]);
  assert.equal(flat.blocker,'friendly');
  assert.equal(actual.blocker,
   friendIntersectsTrajectory(from,ready.muzzle.y,target.p,targetHeight,
    safetyBodyFor(ally))?'friendly':'clear');
  for(let i=0;i<12;i++)stepSession(s,1/60);
  assert.equal(blue[1].posture,'crouch');
  assert.ok(Number.isFinite(blue[0].p.x));
 }finally{activateSite(null);}
});
