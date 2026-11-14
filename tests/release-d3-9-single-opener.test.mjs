import test from 'node:test';
import assert from 'node:assert/strict';
import {implicitDoorOpeningOwner,shouldStageForOpening,mayManipulateOpening,claimContactReadyOpening,claimOpeningIntent}
 from '../src/breach-door-opening-ownership.ts';
const p=(x,y)=>({x,y});
// Proven 25-second warehouse BODY coordinates, not a hypothetical pose.
const door=()=>({
 id:'FRONT',a:p(390,470.24),b:p(390,428.24),hinge:'a',swing:-1,
 kind:'hinged',open:true,openFraction:.397,angularVelocity:0,
 pushTarget:1.55,locked:false,wedged:false,heldBy:null
});
const positions=[p(405.91,462.57),p(408.75,458.03),
 p(410.68,456),p(412.66,452.05)];
const actor=(id,index,kind='move')=>({
 id,side:'blue',health:4,surrendered:false,
 p:{...positions[Math.max(0,index)]},
 plan:[{id:index+1,kind,p:p(150.8,237.5),
  doorId:kind==='door'?'FRONT':undefined,
  method:kind==='door'?'open':undefined}],
 doorTraversal:{doorId:'FRONT',authoredOrderId:index+1,
  destination:p(150.8,237.5)},nav:[p(352,432)],blockedTime:0
});
test('D3.9 exactly one stable opening owner, even when closer follower moves',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1),
  ash=actor('ash',2),vale=actor('vale',3);
 const s={seconds:1,doors:[d],operators:[rook,moss,ash,vale]};
 assert.equal(claimOpeningIntent(s,rook,d),true);
 const owner=implicitDoorOpeningOwner(s,d);
 assert.equal(owner,'rook');
 for(const a of [rook,moss,ash,vale])
  assert.equal(shouldStageForOpening(s,a,d),a.id!==owner);
 const follower=[rook,moss,ash,vale].find(a=>a.id!==owner);
 follower.p=p(393,452);
 s.seconds+=1/60;
 assert.equal(implicitDoorOpeningOwner(s,d),owner,'no role churn');
});
test('D3.9 explicit opening has priority and invalid owner hands off',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1,'door'),
  ash=actor('ash',2);
 const s={seconds:1,doors:[d],operators:[rook,moss,ash]};
 assert.equal(claimOpeningIntent(s,moss,d),true);
 assert.equal(implicitDoorOpeningOwner(s,d),'moss');
 moss.health=0;
 assert.equal(implicitDoorOpeningOwner(s,d),null);
 assert.equal(claimOpeningIntent(s,rook,d),true);
 const after=implicitDoorOpeningOwner(s,d);
 assert.equal(after,'rook');
 rook.plan=[];
 assert.equal(implicitDoorOpeningOwner(s,d),null,
  'a lone active operator needs no multi-body ownership lease');
});
test('D3.9 release ownership immediately once physical aperture is clear',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1);
 const s={seconds:1,doors:[d],operators:[rook,moss]};
 assert.equal(claimOpeningIntent(s,rook,d),true);
 const owner=implicitDoorOpeningOwner(s,d);
 assert.equal(owner,'rook');
 d.openFraction=.95;
 assert.equal(implicitDoorOpeningOwner(s,d),owner,
  'an active owner persists while a 1.55 push target remains');
 d.openFraction=1.55;
 assert.equal(implicitDoorOpeningOwner(s,d),null);
 assert.equal(shouldStageForOpening(s,moss,d),false);
 d.openFraction=.4;rook.health=0;
 assert.equal(implicitDoorOpeningOwner(s,d),null,
  'a new cycle with one remaining blocker is ordinary door traffic');
});
test('D3.9 inactive and opposing actors do not commandeer implicit door',()=>{
 const d=door(),rook=actor('rook',0),
  red={...actor('enemy',-1),side:'red'},idle={...actor('idle',-2),plan:[]};
 const s={seconds:1,doors:[d],operators:[red,idle,rook]};
 assert.equal(implicitDoorOpeningOwner(s,d),null);
});
test('D3.9 all pressure, hand and motor roles use same opener lease',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const pressure=read('breach-door-pressure-frame.ts');
 const hand=read('breach-door-hand-contact.ts');
 const motor=read('breach-motor-door.ts');
 assert.match(pressure,/mayManipulateOpening\(s,actor,door\)/);
 assert.match(pressure,/if\(!claimOpeningIntent\(s,actor,door\)\)return false/);
 assert.match(hand,/mayManipulateOpening\(s,a,door\)/);
 assert.match(motor,/shouldStageForOpening\(s,a,doorAhead\)/);
 assert.match(motor,/selfBlockingHingeRelief\(a,s,p\)/);
 assert.match(motor,/queueOpeningFootstep\(a,retreat\)/);
 assert.match(motor,/staged\.attempts<5/);
 assert.match(motor,/ownerRelief/);
 assert.match(motor,/queueOpeningFootstep\(a,staged\.target\)/);
});

test('D3.9A claims a CLOSED door before any hinge-body jam',()=>{
 const d=door();d.open=false;d.openFraction=0;d.angularVelocity=0;
 const rook=actor('rook',0),moss=actor('moss',1),s={
  seconds:0,doors:[d],operators:[rook,moss]};
 assert.equal(implicitDoorOpeningOwner(s,d),null);
 assert.equal(claimOpeningIntent(s,rook,d),true);
 const owner=implicitDoorOpeningOwner(s,d);
 assert.equal(owner,'rook');
 assert.equal(mayManipulateOpening(s,rook,d),owner==='rook');
 assert.equal(mayManipulateOpening(s,moss,d),owner==='moss');
 assert.equal(implicitDoorOpeningOwner(s,d),owner);
});
test('D3.9A solo interaction is never blocked by a missing lease',()=>{
 const d=door(),rook=actor('rook',0),s={seconds:0,doors:[d],operators:[rook]};
 assert.equal(implicitDoorOpeningOwner(s,d),null);
 assert.equal(mayManipulateOpening(s,rook,d),true);
});
test('D3.9A leaves an independently traversable angle free of staging',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1);
 const s={seconds:0,doors:[d],operators:[rook,moss]};
 assert.equal(claimOpeningIntent(s,rook,d),true);
 assert.ok(implicitDoorOpeningOwner(s,d));
 d.openFraction=.86;
 assert.equal(shouldStageForOpening(s,moss,d),false);
});

test('D3.9A2 order, motor and grip share the same manipulator',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const explicit=read('breach-order-door.ts'),motor=read('breach-motor-door.ts');
 const hand=read('breach-door-hand-contact.ts');
 assert.match(explicit,/!claimOpeningIntent\(s,a,door\)/);
 assert.match(motor,/!mayManipulateOpening\(s,a,doorAhead\)/);
 assert.match(motor,/!doorWouldStrikeActors\(doorAhead,swing,\[move\]/);
 assert.match(hand,/!assisted\|\|!mayManipulateOpening\(s,a,door\)/);
});

test('D3.9A3 cancelled implicit MOVE cannot retain a ghost owner',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1);
 const s={seconds:0,doors:[d],operators:[rook,moss]};
 assert.equal(claimOpeningIntent(s,rook,d),true);
 const owner=implicitDoorOpeningOwner(s,d);
 assert.equal(owner,'rook');
 const chosen=s.operators.find(a=>a.id===owner);
 chosen.plan=[];
 assert.equal(implicitDoorOpeningOwner(s,d),null,
  'only the remaining uncontested actor may manipulate');
 assert.equal(mayManipulateOpening(s,moss,d),true);
 assert.equal(mayManipulateOpening(s,rook,d),true);
});
test('D3.9A3 explicit OPEN finishing keeps its own moving leaf briefly',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1,'door');
 const s={seconds:0,doors:[d],operators:[rook,moss]};
 assert.equal(claimOpeningIntent(s,moss,d),true);
 assert.equal(implicitDoorOpeningOwner(s,d),'moss');
 moss.plan=[];s.seconds=.25;
 assert.equal(implicitDoorOpeningOwner(s,d),'moss');
 s.seconds=1.55;
 assert.equal(implicitDoorOpeningOwner(s,d),null,
  'expired explicit ownership cannot stall an otherwise valid mover');
});

test('D3.9A physical hand contact may claim one anticipated implicit door',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1);
 const s={seconds:0,doors:[d],operators:[rook,moss]};
 assert.equal(claimOpeningIntent(s,rook,d),true);
 const initial=implicitDoorOpeningOwner(s,d);
 const follower=s.operators.find(a=>a.id!==initial);
 assert.equal(claimContactReadyOpening(s,follower,d),true);
 assert.equal(implicitDoorOpeningOwner(s,d),follower.id);
 assert.equal(mayManipulateOpening(s,s.operators.find(a=>a.id===initial),d),false);
});

test('D3.9A3 chooses safe forward movement before fallback retreat',async()=>{
 const {readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/breach-motor-door.ts',import.meta.url),'utf8');
 const safe=source.indexOf('A valid authored stride takes priority');
 const relief=source.indexOf('const retreat=selfBlockingHingeRelief');
 assert.ok(safe>=0&&relief>=0&&safe<relief,
  'do not replace an already clear follower stride with unnecessary retreat');
});

test('D3.9A proximity alone does not seize a door before physical intent',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1);
 const s={seconds:0,doors:[d],operators:[rook,moss]};
 assert.equal(implicitDoorOpeningOwner(s,d),null);
 assert.equal(claimOpeningIntent(s,moss,d),true);
 assert.equal(implicitDoorOpeningOwner(s,d),'moss');
});

test('D3.9B1 shared transient footwork is stable and duplicate-free',async()=>{
 const {openingFootwork,setOpeningFootstep,queueOpeningFootstep,
  clearOpeningFootwork}=await import('../src/breach-door-opening-footwork.ts');
 const a=actor('rook',0),x=openingFootwork(a,'FRONT',1,'swing');
 x.attempts=2;setOpeningFootstep(a,x,p(320,430));
 assert.equal(openingFootwork(a,'FRONT',1,'swing'),x);
 queueOpeningFootstep(a,x.target);queueOpeningFootstep(a,x.target);
 assert.equal(a.nav.filter(v=>v.x===320&&v.y===430).length,1);
 clearOpeningFootwork(a,'FRONT',1);
 assert.notEqual(openingFootwork(a,'FRONT',1,'swing'),x);
 assert.equal(openingFootwork(a,'FRONT',1,'stance').kind,'stance');
});
