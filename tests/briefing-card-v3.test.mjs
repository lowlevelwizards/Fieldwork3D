import test from 'node:test';
import assert from 'node:assert/strict';
import {operationBrief} from '../src/breach-operations.ts';
import {createBriefingCardModel} from '../src/briefing/briefing-view-model.ts';

function make(kind,dossier){
 const b=operationBrief(kind);
 return createBriefingCardModel(kind,{...b,building:'MOTEL',
   layout:'INTERIOR NOT FULLY CHARTED',squad:4},dossier);
}
test('UI1: all five missions have a three-step instruction and exact contract',()=>{
 for(const kind of ['clear','intel','rescue','hold','capture']){
  const view=make(kind);
  assert.equal(view.steps.length,3);
  assert.ok(view.steps.every(step=>step.action&&step.detail));
  assert.equal(view.objective,operationBrief(kind).objective);
  assert.equal(view.condition,operationBrief(kind).condition);
  assert.equal(view.extraction,operationBrief(kind).extraction);
 }
 assert.match(make('hold').steps[1].detail,/7 sec/);
 assert.match(make('intel').steps[2].detail,/evidence/);
});
test('UI1: no x-ray of hidden foes from low confidence or blind intel',()=>{
 const base={identity:{title:'OPERATION DARK STREET'},
  classification:{intelMode:'true-blind'},
  incident:{lead:'Investigators identified evidence at this address.',context:'Unconfirmed contacts.'},
  claims:[{id:'threat',text:'Reliable armed occupancy information unavailable.',
   source:'dispatch',confidence:'unknown'},
   {id:'layout-unknown',text:'No verified architectural plan has been provided.',
    source:'records',confidence:'unknown'}]};
 const view=make('intel',base);
 assert.equal(view.threat.value,'Unconfirmed');
 assert.equal(view.layout,'No verified plan');
 assert.equal(view.reports.threat.length,1);
 assert.equal(view.reports.site.length,1);
 assert.doesNotMatch(view.situation,/enemy|hostile/i);
});
test('UI1: follow-ups are present only for recorded campaign history',()=>{
 const v=make('capture',{identity:{title:'OPERATION GREY LINE'},
   classification:{intelMode:'floor-plan'},
   incident:{lead:'An identified subject is at the address.',context:''},
   claims:[],campaign:{title:'Task Force',region:'Cutwoods',risk:2,
    followUp:{title:'Old Warrant',outcome:'success'}}});
 assert.match(v.followUp,/Old Warrant/);
 assert.match(v.campaignLabel,/CUTWOODS/);
 assert.equal(make('capture').followUp,null);
});
