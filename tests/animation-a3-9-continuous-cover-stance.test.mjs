import test from 'node:test';
import assert from 'node:assert/strict';
import {stanceSurface,coverStanceTarget,advanceCoverStances,
  STAND_COVER_DROP_MAX,CROUCH_COVER_DROP_MIN}
 from '../src/breach-cover-stance.ts';
import {effectiveAimHeight,effectiveEyeHeight}
 from '../src/breach-cover-height.ts';
import {friendIntersectsTrajectory,safetyBodyFor}
 from '../src/breach-friendly-safety-volume.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {createA3Session,DEFAULT_A3_CONFIG}
 from '../src/a3-physicality-scenarios.ts';
import {team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

test('A3.9-H cover must be a real front-facing reachable surface',()=>{
 const p={p:{x:145,y:223},heading:0};
 const cover={x:178,y:223,w:26,h:36,topHeight:27};
 assert.equal(stanceSurface(p,cover,0)?.top,27);
 assert.equal(stanceSurface({...p,heading:Math.PI},cover,0),null);
 assert.equal(stanceSurface({...p,p:{x:95,y:223}},cover,0),null);
 assert.equal(stanceSurface(p,{...cover,toppled:true},0),null);
 assert.equal(stanceSurface(p,{...cover,fixture:'glass-barrier'},0),null);
});
test('A3.9-H authored posture remains two bounded, distinct tactical bands',()=>{
 for(const top of [13,17,21,27,33,40]){
  for(const threat of [false,true]){
   const stand=coverStanceTarget('stand',top,threat);
   const crouch=coverStanceTarget('crouch',top,threat);
   assert.ok(stand>=0&&stand<=STAND_COVER_DROP_MAX);
   assert.ok(crouch>=CROUCH_COVER_DROP_MIN&&crouch<=2.5);
   assert.ok(effectiveEyeHeight({posture:'stand',
     coverStanceDrop:stand})>effectiveEyeHeight({
     posture:'crouch',coverStanceDrop:crouch}));
  }
 }
});
test('A3.9-H fixed-step real cover lowers a stationary operator smoothly',()=>{
 const s=createA3Session({...DEFAULT_A3_CONFIG,
   scenario:'brace-cover',operators:1,intent:'hold'});
 const a=team(s)[0];
 try{
  s.phase='running';a.velocity=0;a.plan=[];a.heading=0;
  const original={...a.p};s.seconds=1;
  const height=[];
  for(let i=0;i<60;i++){
   s.seconds+=1/60;
   advanceCoverStances(s);
   height.push(a.coverStanceDrop??0);
  }
  assert.ok(height[0]>0&&height.at(-1)>2);
  assert.ok(height.every((v,i)=>i===0||v>=height[i-1]-.001));
  assert.equal(a.posture,'stand','authored posture never replaced');
  assert.deepEqual(a.p,original,'cover cannot move the actor');
  const frame=snapshot(s);
  assert.equal(frame.actors.find(p=>p.id===a.id)?.coverStanceDrop,
    a.coverStanceDrop);
  a.p={x:50,y:50};s.seconds+=1/60;
  for(let i=0;i<45;i++){s.seconds+=1/60;advanceCoverStances(s);}
  assert.ok(Math.abs(a.coverStanceDrop??0)<.01,'releases on departure');
  applyReplayFrame(s,frame);
  assert.equal(a.coverStanceDrop,
    frame.actors.find(p=>p.id===a.id)?.coverStanceDrop,
    'historical fixed-tick posture is restored');
  for(const p of frame.actors)delete p.coverStanceDrop;
  applyReplayFrame(s,frame);
  assert.equal(a.coverStanceDrop,0,'old films do not inherit future posture');
 }finally{activateSite(null);}
});
test('A3.9-H rendered barrel and real muzzle use identical height adjustment',()=>{
 const p={x:12,z:31,heading:0,weaponYaw:0,
   weapon:'carbine',aim:.8,velocity:0,recoil:0,posture:'stand'};
 const normal=muzzleAtShot(p),adjusted=muzzleAtShot({
  ...p,coverStanceDrop:5});
 assert.ok(Math.abs(normal.y-adjusted.y-5)<1e-6);
 const a=effectiveAimHeight({posture:'stand',coverStanceDrop:5});
 assert.equal(a,27);
});
test('A3.9-H friendly protective helmet shrinks with actual cover stance',()=>{
 const friend={p:{x:45,y:0},posture:'stand',coverStanceDrop:0};
 assert.equal(friendIntersectsTrajectory({x:0,y:0},38,
   {x:100,y:0},38,safetyBodyFor(friend)),true);
 friend.coverStanceDrop=6;
 assert.equal(friendIntersectsTrajectory({x:0,y:0},38,
   {x:100,y:0},38,safetyBodyFor(friend)),false);
 assert.equal(friendIntersectsTrajectory({x:0,y:0},20,
   {x:100,y:0},20,safetyBodyFor(friend)),true);
});
