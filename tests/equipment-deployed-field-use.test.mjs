import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster} from '../src/breach-roster.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {applyDeploymentInventory} from '../src/equipment-deployment-snapshot.ts';
import {quoteDeployedFieldUse,spendDeployedFieldItem,restoreDeployedWedge}
 from '../src/equipment-deployed-field-use.ts';
import {fieldQuantity,fieldCarryReport}
 from '../src/equipment-field-inventory.ts';
import {visibleFlashCanisters,visibleDoorWedges}
 from '../src/equipment-field-visuals.ts';
import {executeTacticalUtilityOrder} from '../src/breach-order-utility.ts';
import {activateSite} from '../src/breach-core.ts';
import {initDoor} from '../src/breach-door.ts';
import {createEntryOrderHandler} from '../src/breach-order-entry.ts';
import {newSession,team,planCivilianInteraction,toggling,stepSession}
 from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

const issued=(field,utility='utility-radio')=>{
 const source=initialRoster().members[0];
 let kit=initialEquipmentLoadout(source.weapon);
 kit=setEquipmentChoice(kit,'utility',utility);
 return {...source,loadout:{...kit,fieldInventory:{version:1,stacks:field}}};
};
const active=(source)=>{
 const actor={};
 applyDeploymentInventory(actor,source);
 return actor;
};
test('F2: one physical canister is removed from the quickest actual pouch',()=>{
 const source=issued([
  {itemId:'flashbang',quantity:1,location:'backpack'},
  {itemId:'flashbang',quantity:1,location:'rig'},
  {itemId:'zip-tie',quantity:2,location:'backpack'}]);
 const before=structuredClone(source);
 const a=active(source);
 assert.equal(quoteDeployedFieldUse(a,'flashbang').location,'rig');
 assert.equal(quoteDeployedFieldUse(a,'flashbang').accessSeconds,0);
 assert.equal(spendDeployedFieldItem(a,'flashbang'),true);
 assert.equal(a.flashCharges,1);
 assert.deepEqual(visibleFlashCanisters(a.equipment,a.flashCharges),
  [{location:'backpack',index:0}]);
 assert.equal(quoteDeployedFieldUse(a,'flashbang').accessSeconds,.8);
 assert.equal(spendDeployedFieldItem(a,'flashbang'),true);
 assert.equal(spendDeployedFieldItem(a,'flashbang'),false);
 assert.equal(a.flashCharges,0);
 assert.equal(fieldQuantity(a.equipment.fieldInventory,'flashbang'),0);
 assert.deepEqual(source,before,'authoritative roster source never changed');
});
test('F2: physical flex cuffs require a carried pair and add backpack access',()=>{
 const source=issued([{itemId:'zip-tie',quantity:2,location:'backpack'}]);
 const a=active(source);
 assert.equal(a.restraintRemaining,2);
 const quote=quoteDeployedFieldUse(a,'zip-tie');
 assert.equal(quote.location,'backpack');assert.equal(quote.accessSeconds,.8);
 assert.equal(spendDeployedFieldItem(a,'zip-tie'),true);
 assert.equal(a.restraintRemaining,1);
 assert.equal(fieldQuantity(a.equipment.fieldInventory,'zip-tie'),1);
 assert.equal(spendDeployedFieldItem(a,'zip-tie'),true);
 assert.equal(spendDeployedFieldItem(a,'zip-tie'),false);
 assert.equal(a.restraintRemaining,0);
 const stale=active(source);stale.equipment.fieldInventory.stacks=[];
 assert.equal(quoteDeployedFieldUse(stale,'zip-tie').available,false,
  'a stale counter must never conjure an unavailable physical pair');
 assert.equal(spendDeployedFieldItem(stale,'zip-tie'),false);
 assert.equal(stale.restraintRemaining,2);
});
test('F2: placed wedges return exactly one to a physically valid carrier',()=>{
 const source=issued([
  {itemId:'wedge',quantity:2,location:'belt'},
  {itemId:'flashbang',quantity:1,location:'rig'}],'utility-wedge');
 const a=active(source);
 assert.equal(a.wedgeRemaining,2);
 assert.equal(quoteDeployedFieldUse(a,'wedge').location,'belt');
 assert.equal(quoteDeployedFieldUse(a,'wedge').accessSeconds,.12);
 assert.equal(spendDeployedFieldItem(a,'wedge'),true);
 assert.equal(a.wedgeRemaining,1);
 assert.equal(fieldQuantity(a.equipment.fieldInventory,'wedge'),1);
 assert.equal(visibleDoorWedges(a.equipment,a.wedgeRemaining).length,1);
 assert.equal(restoreDeployedWedge(a),true);
 assert.equal(a.wedgeRemaining,2);
 assert.equal(fieldQuantity(a.equipment.fieldInventory,'wedge'),2);
 assert.equal(fieldCarryReport(a.equipment,a.spareMagazines,
  a.equipment.fieldInventory).valid,true);
 assert.equal(restoreDeployedWedge({...a,wedgeRemaining:4}),false);
});
test('F2: cannot spend an unissued or physically absent field item',()=>{
 const a=active(issued([]));
 assert.equal(quoteDeployedFieldUse(a,'flashbang').available,false);
 assert.equal(spendDeployedFieldItem(a,'flashbang'),false);
 a.flashCharges=2; // A stale HUD count is not a stock authority.
 assert.equal(spendDeployedFieldItem(a,'flashbang'),false);
 assert.equal(a.flashCharges,2);
 const historical={flashCharges:1,wedgeRemaining:0,restraintRemaining:0};
 assert.equal(spendDeployedFieldItem(historical,'flashbang'),true,
  'synthetic sessions without equipped records retain old behavior');
 assert.equal(historical.flashCharges,0);
});
test('F2: real flash GO uses backpack retrieval duration and spends once',()=>{
 const a=active(issued([{itemId:'flashbang',quantity:1,location:'backpack'}]));
 const p={x:100,y:100},n={kind:'flash',p,aimPoint:{x:165,y:100}};
 Object.assign(a,{id:'rook',name:'ROOK',side:'blue',health:4,p,
  heading:0,actionTimer:0,velocity:20,lastThrowAt:-100,plan:[n]});
 const s={operators:[a],doors:[],flashRemaining:1,grenades:[],
  nextEffectId:1,seconds:0};
 const done=[],events=[];
 const h={pop:()=>{done.push(1);a.plan=[];a.actionTimer=0;},
  notify:(_s,e)=>events.push(e),beginReload:()=>false,
  fail:(_s,_a,_n,e)=>events.push(e),clearIssue:()=>{},
  rotate:()=>true,battleEvent:()=>{}};
 activateSite({walls:[],cover:[],doors:[]});
 try{
  for(let i=0;i<45;i++){
   s.seconds=i/60;
   executeTacticalUtilityOrder(s,a,n,1/60,h);
  }
  assert.equal(s.grenades.length,0,'0.75 s cannot reach backpack throw');
  assert.equal(a.flashCharges,1);
  for(let i=45;i<80&&!done.length;i++){
   s.seconds=i/60;
   executeTacticalUtilityOrder(s,a,n,1/60,h);
  }
  assert.equal(s.grenades.length,1);
  assert.equal(a.flashCharges,0);
  assert.equal(fieldQuantity(a.equipment.fieldInventory,'flashbang'),0);
  assert.equal(s.flashRemaining,0);
  assert.equal(done.length,1);
 }finally{activateSite(null);}
});

test('F2: replay rewinds and seeks exact physical item positions and quantities',()=>{
 const s=newSession(),a=s.operators.find(o=>o.id==='rook');
 applyDeploymentInventory(a,issued([
  {itemId:'flashbang',quantity:1,location:'rig'},
  {itemId:'flashbang',quantity:1,location:'backpack'},
  {itemId:'zip-tie',quantity:1,location:'pocket'}]));
 const before=snapshot(s);
 assert.equal(spendDeployedFieldItem(a,'flashbang'),true);
 const after=snapshot(s);
 assert.deepEqual(before.actors.find(x=>x.id==='rook').fieldInventory.stacks
  .filter(row=>row.itemId==='flashbang').map(row=>row.location),
 ['rig','backpack']);
 assert.deepEqual(after.actors.find(x=>x.id==='rook').fieldInventory.stacks
  .filter(row=>row.itemId==='flashbang').map(row=>row.location),
 ['backpack']);
 applyReplayFrame(s,before);
 assert.equal(a.flashCharges,2);
 assert.deepEqual(visibleFlashCanisters(a.equipment,a.flashCharges).map(x=>x.location),
 ['rig','backpack']);
 applyReplayFrame(s,after);
 assert.equal(a.flashCharges,1);
 assert.deepEqual(visibleFlashCanisters(a.equipment,a.flashCharges).map(x=>x.location),
 ['backpack']);
 assert.equal(fieldQuantity(before.actors.find(x=>x.id==='rook').fieldInventory,
  'flashbang'),2,'replay seek never mutates stored historic frames');
});

test('F2: real RESTRAIN retrieves backpack cuffs, then consumes only on success',()=>{
 const pt=(x,y)=>({x,y});
 const site={seed:31010,name:'F2 pack restraints',layout:'corridor',
  rooms:[{id:'floor',x:80,y:140,w:420,h:160,kind:'room',
   purpose:'floor',tone:1}],roomCount:1,walls:[],cover:[],doors:[],
  windows:[],enemies:[],spawn:[pt(300,200),pt(300,230),
   pt(300,260),pt(300,290)],entrance:pt(290,200),
  objective:pt(100,200),extract:pt(475,200),
  bounds:{minX:0,minY:0,maxX:640,maxY:740}};
 const s=newSession(0,31010,'floor-plan','small','rescue',site,
   {enableCivilians:true});
 const a=team(s)[0];
 try{
  for(const blue of team(s))if(blue!==a)blue.health=0;
  a.p=pt(300,200);a.priorP={...a.p};a.heading=0;a.weaponYaw=0;
  applyDeploymentInventory(a,issued([
   {itemId:'zip-tie',quantity:2,location:'backpack'}]));
  const person=createCivilian({id:'civ:f2-cuffs',role:'visitor',
   persona:'steady',activity:'idle',position:pt(315,200),
   heading:0,roomId:'floor',appearanceSeed:13});
  person.state='compliant';person.stateSince=0;s.civilians.push(person);
  assert.equal(planCivilianInteraction(s,a.id,person.id,'restrain'),true);
  assert.equal(a.restraintRemaining,2,'planning is free');
  toggling(s);
  for(let i=0;i<95;i++)stepSession(s,1/60);
  assert.equal(person.restrained,false,'backpack retrieval must take real time');
  assert.equal(a.restraintRemaining,2,'incomplete gesture cannot spend cuffs');
  for(let i=95;i<190&&!person.restrained;i++)stepSession(s,1/60);
  assert.equal(person.restrained,true);
  assert.equal(a.restraintRemaining,1);
  assert.equal(fieldQuantity(a.equipment.fieldInventory,'zip-tie'),1);
 }finally{activateSite(null);}
});

test('F2: actual door WEDGE/UNWEDGE action conserves placed + carried stock',()=>{
 const s=newSession(),a=team(s)[0],events=[];
 try{
  const door=initDoor({id:'F2-WEDGE',a:{x:200,y:250},b:{x:238,y:250},
   open:false,openedAt:-1,hinge:'a',swing:1},0);
  s.doors=[door];a.p={x:231,y:272};
  applyDeploymentInventory(a,issued([
   {itemId:'wedge',quantity:2,location:'belt'},
   {itemId:'flashbang',quantity:1,location:'rig'}],'utility-wedge'));
  const hooks={notify:(_s,msg)=>events.push(msg),
   approach:()=>true,hear:()=>{},battleEvent:()=>{}};
  const handle=createEntryOrderHandler(hooks);
  const wedge={id:5001,kind:'tool',p:{...a.p},doorId:door.id,toolMethod:'wedge'};
  a.plan=[wedge];a.actionTimer=1.23;
  assert.equal(handle(s,a,wedge,.1),true);
  assert.equal(door.wedged,true);assert.equal(door.wedgeOwnerId,a.id);
  assert.equal(a.wedgeRemaining,1);
  assert.equal(fieldQuantity(a.equipment.fieldInventory,'wedge'),1);
  const unwedge={id:5002,kind:'tool',p:{...a.p},doorId:door.id,toolMethod:'unwedge'};
  a.plan=[unwedge];a.actionTimer=.71;
  assert.equal(handle(s,a,unwedge,.1),true);
  assert.equal(door.wedged,false);
  assert.equal(a.wedgeRemaining,2);
  assert.equal(fieldQuantity(a.equipment.fieldInventory,'wedge'),2);
  assert.equal(restoreDeployedWedge({...a,wedgeRemaining:4}),false);
 }finally{activateSite(null);}
});
