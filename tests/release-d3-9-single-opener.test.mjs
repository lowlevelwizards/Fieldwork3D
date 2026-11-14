import test from 'node:test';
import assert from 'node:assert/strict';
import {implicitDoorOpeningOwner,shouldStageForOpening}
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
 const owner=implicitDoorOpeningOwner(s,d);
 assert.ok([rook,moss,ash,vale].some(a=>a.id===owner));
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
 assert.equal(implicitDoorOpeningOwner(s,d),'moss');
 moss.health=0;
 const after=implicitDoorOpeningOwner(s,d);
 assert.equal(after,'rook');
 rook.plan=[];
 assert.equal(implicitDoorOpeningOwner(s,d),null,
  'a lone active operator needs no multi-body ownership lease');
});
test('D3.9 release ownership immediately once physical aperture is clear',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1);
 const s={seconds:1,doors:[d],operators:[rook,moss]};
 assert.ok(['rook','moss'].includes(implicitDoorOpeningOwner(s,d)));
 d.openFraction=.95;
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
 assert.match(pressure,/implicitDoorOpeningOwner\(s,door\)===actor\.id/);
 assert.match(pressure,/if\(owner&&owner!==actor\.id\)return false/);
 assert.match(hand,/implicitDoorOpeningOwner\(s,door\)!==a\.id/);
 assert.match(motor,/shouldStageForOpening\(s,a,doorAhead\)/);
 assert.match(motor,/selfBlockingHingeRelief\(a,s,p\)/);
 assert.match(motor,/a\.nav\.unshift\(retreat\)/);
 assert.match(motor,/staged\.attempts<5/);
 assert.match(motor,/ownerRelief/);
 assert.match(motor,/a\.nav\.unshift\(\{\.\.\.staged\.target\}\)/);
});
