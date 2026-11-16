import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDispatchContent,isKnownDispatchContent,
 DISPATCH_CONTENT_KINDS} from '../src/dispatch-content-policy.ts';

const dispatch=(id='us-swat-mp5-1995')=>({mode:'dispatch',referenceId:id});
test('D2.1 rejects unknown content, unknown role and wrong era',()=>{
 assert.deepEqual([...DISPATCH_CONTENT_KINDS],[
  'reference','equipment','weapon-preset','wardrobe-style',
  'solid-color','camouflage','identity-marking'
 ]);
 for(const kind of DISPATCH_CONTENT_KINDS){
  const d=evaluateDispatchContent({kind,id:'nonexistent-item',context:dispatch()});
  assert.equal(d.status,'unclassified');assert.equal(d.selectable,false);
 }
 const invalid=evaluateDispatchContent({kind:'equipment',id:'head-cap',
  context:{...dispatch(),role:'military'}});
 assert.equal(invalid.status,'unclassified');
 assert.equal(invalid.selectable,false);
 const year=evaluateDispatchContent({kind:'reference',id:'us-swat-mp5-1995',
  context:{...dispatch(),year:1960}});
 assert.equal(year.status,'unclassified');
 assert.equal(year.selectable,false);
 const unsupported=evaluateDispatchContent({kind:'equipment',id:'head-cap',
  context:dispatch('us-army-m81-1990')});
 assert.equal(unsupported.status,'unclassified');
});
test('D2.1 does not restrict other modes and still validates actual catalog IDs',()=>{
 for(const mode of ['quick-play','sandbox','legacy-campaign','operations','wasteland']){
  const d=evaluateDispatchContent({kind:'equipment',id:'head-cap',context:{mode}});
  assert.equal(d.status,'not-applicable');assert.equal(d.selectable,true);
  const invalid=evaluateDispatchContent({kind:'equipment',id:'invented',context:{mode}});
  assert.equal(invalid.status,'unclassified');assert.equal(invalid.selectable,false);
 }
 assert.equal(isKnownDispatchContent('weapon-preset','hk-mp5a3'),true);
 assert.equal(isKnownDispatchContent('identity-marking','label-police'),true);
 assert.equal(isKnownDispatchContent('solid-color','navy'),true);
 assert.equal(isKnownDispatchContent('camouflage','urban-kamysh'),true);
});
test('D2.1 starts unclassified without pretending item permissions already exist',()=>{
 const d=evaluateDispatchContent({kind:'weapon-preset',id:'hk-mp5a3',
  context:dispatch()});
 assert.equal(d.status,'unclassified');
 assert.equal(d.provenance,'none');
 assert.equal(d.selectable,false);
});
