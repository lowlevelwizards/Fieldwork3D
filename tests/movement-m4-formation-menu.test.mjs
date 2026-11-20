import test from 'node:test';
import assert from 'node:assert/strict';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {selectedDoorStackFormation,cycleDoorStackFormation}
 from '../src/breach-stack-formation-selection.ts';
const base={door:true,node:false,flashRemaining:2,posture:'stand',
 pace:'walk',firePolicy:'engage',reserve:30,magazine:30};
test('M4.9 selection cycles five formations per door/session without authored edits',()=>{
 const s={plan:[]},other={plan:[]};
 assert.equal(selectedDoorStackFormation(s,'FRONT'),'auto');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'left');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'right');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'split');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'angled');
 assert.equal(cycleDoorStackFormation(s,'FRONT'),'auto');
 assert.equal(selectedDoorStackFormation(s,'D2'),'auto');
 assert.equal(selectedDoorStackFormation(other,'FRONT'),'auto');
 assert.deepEqual(s.plan,[]);
});
test('M4.9 formation actions are visible only for planning and retain door controls',()=>{
 const editable=contextActionChoices({...base,formationEditable:true,
  stackFormation:'split',doorOpen:false});
 assert.ok(editable.some(x=>x.id==='ctxOpen'));
 assert.ok(editable.some(x=>x.id==='ctxFormationCycle'&&
   x.label.includes('SPLIT')));
 assert.ok(editable.some(x=>x.id==='ctxStackTeam'));
 assert.ok(editable.some(x=>x.id==='ctxSquadEntry'));
 for(const state of [{...base,doorPartial:true},{...base,doorOpen:true}])
  assert.equal(contextActionChoices({...state,formationEditable:true})
    .filter(x=>x.id==='ctxFormationCycle').length,1);
 const executing=contextActionChoices({...base,formationEditable:false});
 assert.equal(executing.some(x=>x.id==='ctxStackTeam'),false);
 assert.equal(executing.some(x=>x.id==='ctxSquadEntry'),false);
});
