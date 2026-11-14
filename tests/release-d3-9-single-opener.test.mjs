import test from 'node:test';
import assert from 'node:assert/strict';
import {implicitDoorOpeningOwner,shouldStageForOpening}
 from '../src/breach-door-opening-ownership.ts';
const p=(x,y)=>({x,y});
const door=()=>({
 id:'FRONT',a:p(100,100),b:p(100,142),hinge:'a',swing:-1,
 kind:'hinged',open:true,openFraction:.4,angularVelocity:0,
 pushTarget:1.55,locked:false,wedged:false,heldBy:null
});
const actor=(id,index,kind='move')=>({
 id,side:'blue',health:4,surrendered:false,p:p(113+index*3,121),
 plan:[{id:index+1,kind,p:p(65,120),doorId:kind==='door'?'FRONT':undefined,
  method:kind==='door'?'open':undefined}],
 doorTraversal:{doorId:'FRONT',authoredOrderId:index+1,
  destination:p(65,120)},nav:[p(65,120)],blockedTime:0
});
test('D3.9 exactly one stable opening owner, even when closer follower moves',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1),
  ash=actor('ash',2),vale=actor('vale',3);
 const s={seconds:1,doors:[d],operators:[rook,moss,ash,vale]};
 assert.equal(implicitDoorOpeningOwner(s,d),'rook');
 assert.equal(shouldStageForOpening(s,rook,d),false);
 for(const a of [moss,ash,vale])
  assert.equal(shouldStageForOpening(s,a,d),true);
 moss.p=p(101,120);
 s.seconds+=1/60;
 assert.equal(implicitDoorOpeningOwner(s,d),'rook','no role churn');
});
test('D3.9 explicit opening has priority and invalid owner hands off',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1,'door'),
  ash=actor('ash',2);
 const s={seconds:1,doors:[d],operators:[rook,moss,ash]};
 assert.equal(implicitDoorOpeningOwner(s,d),'moss');
 moss.health=0;
 assert.equal(implicitDoorOpeningOwner(s,d),'rook');
 rook.plan=[];
 assert.equal(implicitDoorOpeningOwner(s,d),'ash');
});
test('D3.9 release ownership immediately once physical aperture is clear',()=>{
 const d=door(),rook=actor('rook',0),moss=actor('moss',1);
 const s={seconds:1,doors:[d],operators:[rook,moss]};
 assert.equal(implicitDoorOpeningOwner(s,d),'rook');
 d.openFraction=.95;
 assert.equal(implicitDoorOpeningOwner(s,d),null);
 assert.equal(shouldStageForOpening(s,moss,d),false);
 d.openFraction=.4;rook.health=0;
 assert.equal(implicitDoorOpeningOwner(s,d),'moss',
  'new opening cycle cannot retain a stale owner');
});
test('D3.9 inactive and opposing actors do not commandeer implicit door',()=>{
 const d=door(),rook=actor('rook',0),
  red={...actor('enemy',-1),side:'red'},idle={...actor('idle',-2),plan:[]};
 const s={seconds:1,doors:[d],operators:[red,idle,rook]};
 assert.equal(implicitDoorOpeningOwner(s,d),'rook');
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
 assert.match(motor,/staged\.attempts<3/);
});
