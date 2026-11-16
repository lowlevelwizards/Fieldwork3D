import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {FACTION_REFERENCES} from '../src/faction-reference-catalog.ts';
import {projectDispatchSelection,mayChooseDispatchSelection}
 from '../src/dispatch-selection-projection.ts';

const context={mode:'dispatch',referenceId:'us-police-polo-2020'};
test('D2.3 patrol selection projects only valid new gear and retains current rifle',()=>{
 const opts=projectDispatchSelection({context,kind:'equipment',equipmentSlot:'primary',
  candidateIds:['primary-carbine','primary-smg','armor-soft','made-up','primary-carbine'],
  currentId:'primary-carbine'});
 assert.equal(opts.length,4);
 const rifle=opts.find(x=>x.id==='primary-carbine');
 assert.equal(rifle.status,'specialist');
 assert.equal(rifle.allowedForNewSelection,false);
 assert.equal(rifle.retainedCurrent,true);
 const smg=opts.find(x=>x.id==='primary-smg');
 assert.equal(smg.status,'unclassified');
 assert.equal(smg.allowedForNewSelection,false);
 const vest=opts.find(x=>x.id==='armor-soft');
 assert.equal(vest.allowedForNewSelection,false);
 assert.match(vest.reason,/slot/);
 assert.equal(mayChooseDispatchSelection({
  context,kind:'equipment',equipmentSlot:'primary'
 },'primary-carbine'),false);
 assert.equal(mayChooseDispatchSelection({
  context:{...context,specialistAuthorized:true},kind:'equipment',
  equipmentSlot:'primary'
 },'primary-carbine'),true);
});

test('D2.3 saved choice outside candidate list is retained but never authorized',()=>{
 const options=projectDispatchSelection({
  context:{mode:'dispatch',referenceId:'us-swat-mp5-1995'},
  kind:'weapon-preset',candidateIds:['hk-mp5a3','ar-m4a1'],
  currentId:'ak-aks74u'
 });
 assert.deepEqual(options.map(x=>x.id),['hk-mp5a3','ar-m4a1','ak-aks74u']);
 assert.equal(options[0].allowedForNewSelection,true);
 assert.equal(options[1].allowedForNewSelection,false);
 assert.equal(options[2].retainedCurrent,true);
 assert.equal(options[2].allowedForNewSelection,false);
});

test('D2.3 other modes remain unrestricted without altering catalog or saves',()=>{
 const loadout=initialEquipmentLoadout('carbine');
 const before=JSON.stringify({loadout,refs:FACTION_REFERENCES});
 const modes=['quick-play','sandbox','legacy-campaign','operations','wasteland'];
 for(const mode of modes){
  const opts=projectDispatchSelection({
   context:{mode},kind:'equipment',equipmentSlot:'primary',
   candidateIds:['primary-smg','primary-shotgun','armor-soft','invalid'],
   currentId:'primary-smg'
  });
  assert.deepEqual(opts.map(x=>x.allowedForNewSelection),[true,true,false,false]);
  assert.equal(opts[0].status,'not-applicable');
  assert.equal(mayChooseDispatchSelection({
   context:{mode},kind:'equipment',equipmentSlot:'primary'
  },'primary-shotgun'),true);
 }
 assert.equal(JSON.stringify({loadout,refs:FACTION_REFERENCES}),before);
});
test('D2.3 selection projection is stable, immutable and does not change source',()=>{
 const request={context:{mode:'dispatch',referenceId:'russian-omon-2002'},
  kind:'identity-marking',candidateIds:['label-omon','label-swat','label-omon']};
 const a=projectDispatchSelection(request),b=projectDispatchSelection(request);
 assert.deepEqual(a,b);assert.notStrictEqual(a,b);
 assert.equal(Object.isFrozen(a),true);
 assert.equal(a.length,2);
 for(const item of a)assert.equal(Object.isFrozen(item),true);
 assert.deepEqual(a.map(x=>x.status),['available','unclassified']);
});

test('D2.3 missing equipment slot fails closed even for otherwise offered gear',()=>{
 const req={context:{mode:'dispatch',referenceId:'us-swat-2015'},
  kind:'equipment',candidateIds:['head-helmet'],currentId:'head-helmet'};
 const projection=projectDispatchSelection(req);
 assert.equal(projection[0].status,'available');
 assert.equal(projection[0].allowedForNewSelection,false);
 assert.equal(projection[0].retainedCurrent,true);
 assert.match(projection[0].reason,/slot required/);
 assert.equal(mayChooseDispatchSelection({
  context:req.context,kind:'equipment'
 },'head-helmet'),false);
 assert.equal(mayChooseDispatchSelection({
  context:req.context,kind:'equipment',equipmentSlot:'head'
 },'head-helmet'),true);
});
