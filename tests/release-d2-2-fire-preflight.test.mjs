import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareShotSight,matchingShotSight,nearShotLane}
 from '../src/breach-fire-preflight.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {assessFireLane,assessFriendlyLane} from '../src/breach-fire-safety.ts';
import {setCombatCostDiagnosticsEnabled,drainCombatCostDiagnostics}
 from '../src/breach-combat-cost-counters.ts';

const p=(x,y)=>({x,y});
const input={x:100,z:100,heading:0,weaponYaw:0,
 shoulderOffset:0,weapon:'carbine',aim:.8,posture:'stand',
 velocity:0,recoil:0,threatRange:95};
const source=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');

test('D2.2a identical live snapshot reuses clearance without a second solve',()=>{
 const doors=[],walls=[],cover=[],friends=[];
 try{
  setCombatCostDiagnosticsEnabled(true);
  const snapshot=prepareShotSight(input,doors,cover,walls,friends);
  const same={...input}; // same VALUES, not merely the same input object
  const reused=matchingShotSight(snapshot,same,doors,cover,walls,friends);
  assert.equal(reused,snapshot.clearance);
  assert.deepEqual(drainCombatCostDiagnostics().clearanceCalls,1);
  assert.equal(reused.blocked,false);
 }finally{setCombatCostDiagnosticsEnabled(false);}
});
test('D2.2a any changed physical input or world roster forces recomputation',()=>{
 const doors=[],walls=[],cover=[],friends=[];
 const sample=prepareShotSight(input,doors,cover,walls,friends);
 for(const patch of [
  {x:101},{z:102},{heading:.01},{weaponYaw:.01},
  {shoulderOffset:1.2},{aim:.3},{posture:'crouch'},
  {coverStanceDrop:0},{velocity:12},{recoil:.2},
  {threatRange:100},{weapon:'pistol'}, {friendlyNear:true},
  {clearanceRetraction:1},{shortCompression:.6},{shoulderPullback:2}
 ]){
  assert.equal(matchingShotSight(sample,{...input,...patch},
    doors,cover,walls,friends),null,JSON.stringify(patch));
 }
 assert.equal(matchingShotSight(sample,input,[],cover,walls,friends),null);
 assert.equal(matchingShotSight(sample,input,doors,[],walls,friends),null);
 assert.equal(matchingShotSight(sample,input,doors,cover,[],friends),null);
 assert.equal(matchingShotSight(sample,input,doors,cover,walls,[]),null);
 assert.equal(matchingShotSight(undefined,input,doors,cover,walls,friends),null);
 // An actor with an adjusted cover stance never inherits the older
 // coverStanceDrop-omitting readiness sample as final shot authorization.
 assert.equal(matchingShotSight(sample,{...input,coverStanceDrop:8},
   doors,cover,walls,friends),null);
});
test('D2.2b near-target lane never lets penetrable geometry conceal an ally',()=>{
 const from=p(0,0),target=p(40,0);
 const wall=[{a:p(20,-10),b:p(20,10)}];
 const friends=[p(27,0)];
 assert.equal(assessFireLane(from,24,target,24,[],wall,[],friends).blocker,'wall');
 assert.equal(nearShotLane(from,24,target,24,[],wall,[],friends).blocker,'friendly');
 assert.equal(nearShotLane(from,24,target,24,[],wall,[],[]).blocker,'wall');
});
test('D2.2b near-lane result preserves the old two-stage friendly then material policy',()=>{
 const from=p(0,0),target=p(55,0);
 const walls=[{a:p(40,-9),b:p(40,9)}];
 for(const friends of [[],[p(22,0)],[p(90,0)]]){
  for(const cover of [[],[{x:30,y:0,w:10,h:10,height:36}]]){
   const protective=assessFriendlyLane(from,25,target,24,friends);
   const original=protective.blocker==='friendly'?protective:
    assessFireLane(from,25,target,24,cover,walls,[],friends);
   const current=nearShotLane(from,25,target,24,cover,walls,[],friends);
   assert.deepEqual(current,original);
  }
 }
});
test('D2.2c post-spread safety, shot RNG and authored control remain in the resolver',()=>{
 const fire=source('breach-firing-pipeline.ts');
 const shot=source('breach-shot-resolution.ts');
 assert.match(fire,/const shotPreflight=prepareShotSight/);
 assert.match(fire,/preflight:shotPreflight/);
 assert.match(shot,/matchingShotSight\(ctx\.preflight,sightInput/);
 assert.match(shot,/const proposedYaw=shotYaw\(a\.weaponYaw,cone,random\(s\),random\(s\)\)/);
 assert.match(shot,/const shotClearance=weaponClearance/);
 assert.match(shot,/if\(observedCivilianFireLane\(s,a,muzzlePoint,muzzle\.y/);
 assert.match(shot,/if\(assessFriendlyLane\(muzzlePoint,muzzle\.y,far,strikeHeight/);
 assert.match(shot,/const shotLane=assessFireLane\(muzzlePoint,muzzle\.y,/);
 assert.doesNotMatch(source('breach-fire-preflight.ts'),/\bSession\s*[;=:]/);
});
