import test from 'node:test';import assert from 'node:assert/strict';
import {entryToolVerdict} from '../src/breach-entry-tools.ts';
import {newSession,planEntryTool} from '../src/breach-game.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
test('23.02 contextual door menu exposes only eligible equipped methods',()=>{
 const d={id:'G',a:{x:0,y:0},b:{x:0,y:30},open:false,
  openedAt:0,style:'mesh-gate'};
 const choices=contextActionChoices({door:true,node:false,flashRemaining:1,
  posture:'stand',pace:'walk',firePolicy:'engage',reserve:20,magazine:12,
  availableTools:['cut']}).map(x=>x.id);
 assert.ok(choices.includes('ctxTool-cut'));
 assert.ok(!choices.includes('ctxTool-pry'));
 assert.equal(entryToolVerdict(d,'cut').allowed,true);
});
test('23.02 unissued tools never become queued orders',()=>{
 const s=newSession(),actor=s.operators.find(a=>a.id==='rook');
 const door=s.doors[0];assert.ok(door);
 actor.equipment=initialEquipmentLoadout('carbine');
 assert.equal(planEntryTool(s,'rook',door.id,'breach'),false);
 assert.equal(actor.plan.length,0);
 actor.equipment=setEquipmentChoice(actor.equipment,'utility','utility-cutter');
 assert.equal(planEntryTool(s,'rook',door.id,'pry'),false);
});
test('23.02 incompatible door mechanisms cannot receive cutting orders',()=>{
 const d={id:'W',a:{x:0,y:0},b:{x:0,y:30},open:false,
  openedAt:0,style:'steel',kind:'shutter'};
 for(const tool of ['cut','wedge','pry','breach'])
  assert.equal(entryToolVerdict(d,tool).allowed,false);
});
