import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_ITEMS,readFieldInventory,fieldQuantity,fieldCarryReport}
 from '../src/equipment-field-inventory.ts';
import {initialEquipmentLoadout,equippedRestraintCharges}
 from '../src/equipment-loadouts.ts';
import {nearestContextCivilian} from '../src/breach-civilian-context-selection.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {civilianPose} from '../src/breach-civilian-pose.ts';
import {planCivilianInteraction,newSession,team,toggling,stepSession}
 from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {activateSite} from '../src/breach-core.ts';
const pt=(x,y)=>({x,y});
const roomSite=(walls=[])=>({seed:31010,name:'EQA3.10 physical RESTRAIN',
 layout:'corridor',rooms:[{id:'floor',x:80,y:140,w:420,h:160,
 kind:'room',purpose:'floor',tone:1}],roomCount:1,
 walls,cover:[],doors:[],windows:[],enemies:[],
 spawn:[pt(300,200),pt(300,230),pt(300,260),pt(300,290)],
 entrance:pt(290,200),objective:pt(100,200),extract:pt(475,200),
 bounds:{minX:0,minY:0,maxX:640,maxY:740}});
const civilian=(position=pt(315,200))=>{
 const c=createCivilian({id:'civ:restrain-test',role:'visitor',
 persona:'steady',activity:'idle',position,heading:0,
 roomId:'floor',appearanceSeed:13});
 c.state='compliant';c.stateSince=0;return c;
};
const session=(walls=[])=>{
 const s=newSession(0,31010,'floor-plan','small','rescue',
   roomSite(walls),{enableCivilians:true});
 const a=team(s)[0];for(const blue of team(s))if(blue!==a)blue.health=0;
 a.p=pt(300,200);a.priorP={...a.p};a.heading=0;a.weaponYaw=0;
 const c=civilian();s.civilians.push(c);return {s,a,c};
};
test('EQA3.10 flex cuffs use real physical capacity and no implicit issuance',()=>{
 const kit=initialEquipmentLoadout();
 assert.equal(equippedRestraintCharges(kit),0);
 const stock={version:1,stacks:[{itemId:'zip-tie',quantity:3,location:'belt'}]};
 const read=readFieldInventory(stock,kit);
 assert.equal(fieldQuantity(read,'zip-tie'),3);
 assert.equal(FIELD_ITEMS['zip-tie'].usable,true);
 assert.ok(fieldCarryReport(kit,[],read).valid);
 const issued={...kit,fieldInventory:read};
 assert.equal(equippedRestraintCharges(issued),3);
 assert.equal(fieldQuantity(readFieldInventory({version:1,
   stacks:[{itemId:'zip-tie',quantity:999,location:'belt'}]},kit),'zip-tie'),
   FIELD_ITEMS['zip-tie'].maxPerOperator);
});
test('EQA3.10 palette selects only compliant, unsecured, nonrescue people',()=>{
 const person=civilian();
 assert.equal(nearestContextCivilian([person],pt(300,200),
  'restrain','secure',()=>false,()=>true),person);
 assert.equal(nearestContextCivilian([{...person,restrained:true}],
  pt(300,200),'restrain','secure',()=>false,()=>true),null);
 assert.equal(nearestContextCivilian([{...person,rescueTarget:true}],
  pt(300,200),'restrain','secure',()=>false,()=>true),null);
 assert.equal(nearestContextCivilian([{...person,state:'startled'}],
  pt(300,200),'restrain','secure',()=>false,()=>true),null);
 assert.equal(nearestContextCivilian([person],
  pt(300,200),'restrain','secure',()=>false,()=>false),null,
  'wall contact always blocks action even at arm length');
 const options={door:false,node:false,posture:'stand',pace:'walk',
  firePolicy:'engage',reserve:0,magazine:10,flashRemaining:0,
  nearRestrainableCivilian:true,restraintsRemaining:2};
 assert.ok(contextActionChoices(options).some(x=>x.id==='ctxRestrainCivilian'));
 assert.ok(!contextActionChoices({...options,restraintsRemaining:0})
   .some(x=>x.id==='ctxRestrainCivilian'));
});
test('EQA3.10 RESTRAIN completes only after physical GO and consumes exactly one cuff',()=>{
 const {s,a,c}=session();
 try{
  a.restraintRemaining=2;
  assert.equal(planCivilianInteraction(s,a.id,c.id,'restrain'),true);
  assert.equal(c.restrained,false,'planning must not bind');
  assert.equal(a.restraintRemaining,2,'planning does not consume');
  toggling(s);
  for(let i=0;i<105&&s.phase==='running'&&!c.restrained;i++)
    stepSession(s,1/60);
  assert.equal(c.restrained,true);
  assert.equal(civilianPose(c),'restrained');
  assert.equal(a.restraintRemaining,1,'physical GO consumes exact-one');
  assert.equal(c.state,'compliant','restraint is not a forced FOLLOW');
  assert.equal(c.following,null);
  assert.ok(a.lastCivilianContactAt>=0);
  assert.equal(a.plan.some(n=>n.interaction==='restrain-civilian'),false);
  const film=snapshot(s);
  c.restrained=false;a.restraintRemaining=0;
  applyReplayFrame(s,film);
  assert.equal(s.civilians.find(x=>x.id===c.id)?.restrained,true);
  assert.equal(team(s)[0].restraintRemaining,1);
 }finally{activateSite(null);}
});
test('EQA3.10 zero cuffs, unconscious and rescued people cannot be tied',()=>{
 const {s,a,c}=session();
 try{
  assert.equal(planCivilianInteraction(s,a.id,c.id,'restrain'),false);
  a.restraintRemaining=1;c.rescueTarget=true;
  assert.equal(planCivilianInteraction(s,a.id,c.id,'restrain'),false);
  c.rescueTarget=false;c.health=0;
  assert.equal(planCivilianInteraction(s,a.id,c.id,'restrain'),false);
 }finally{activateSite(null);}
});
test('EQA3.10 true physical wall blocks RESTRAIN despite proximity',()=>{
 const {s,a,c}=session([{a:pt(307,180),b:pt(307,220)}]);
 try{
  a.restraintRemaining=2;
  assert.equal(planCivilianInteraction(s,a.id,c.id,'restrain'),false);
  assert.equal(c.restrained,false);
 }finally{activateSite(null);}
});
