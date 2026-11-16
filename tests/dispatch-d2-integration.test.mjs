import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISPATCH_STARTER_REFERENCE_IDS,dispatchStarterReferenceContexts}
 from '../src/dispatch-content-foundation.ts';
import {dispatchStarterCoverage,auditDispatchFoundation}
 from '../src/dispatch-reference-coverage.ts';
import {DISPATCH_STARTER_CHOICES}
 from '../src/dispatch-starter-choices.ts';
import {isKnownDispatchContent,evaluateDispatchContent}
 from '../src/dispatch-content-policy.ts';
import {mayChooseDispatchSelection}
 from '../src/dispatch-selection-projection.ts';
import {referenceWeaponChoice} from '../src/faction-reference-weapons.ts';
import {factionReference} from '../src/faction-reference-catalog.ts';

test('D2.4 all starter decisions refer only to implemented content IDs',()=>{
 assert.deepEqual(auditDispatchFoundation(),[]);
 assert.deepEqual(Object.keys(DISPATCH_STARTER_CHOICES).sort(),
  [...DISPATCH_STARTER_REFERENCE_IDS].sort());
 assert.equal(dispatchStarterReferenceContexts().length,4);
 assert.equal(dispatchStarterCoverage().length,4);
 for(const referenceId of DISPATCH_STARTER_REFERENCE_IDS){
  const recipe=DISPATCH_STARTER_CHOICES[referenceId];
  assert.ok(recipe);
  const seen=new Set();
  for(const [status,choices] of [['available',recipe.available],
   ['specialist',recipe.specialist]]){
   for(const [kind,ids] of Object.entries(choices)){
    for(const id of ids){
     const key=kind+':'+id;
     assert.equal(seen.has(key),false,'Overlapping choice: '+referenceId+' '+key);
     seen.add(key);
     assert.equal(isKnownDispatchContent(kind,id),true,
      'Unimplemented choice: '+referenceId+' '+key);
     const decision=evaluateDispatchContent({
      kind,id,context:{mode:'dispatch',referenceId}
     });
     assert.equal(decision.status,status);
     assert.equal(decision.provenance,'authored-starter-policy');
    }
   }
  }
  const weapon=referenceWeaponChoice(referenceId);
  assert.equal(seen.has('weapon-preset:'+weapon.presetId),true,
   'Original authored weapon preview must be explicitly declared: '+referenceId);
  const ref=factionReference(referenceId);
  assert.ok(ref);
  for(const marking of Object.values(ref.markings??{})){
   assert.equal(seen.has('identity-marking:'+marking),true,
    'Current visible identity remains available: '+referenceId);
  }
  if(ref.uniformCamo)
   assert.equal(seen.has('camouflage:'+ref.uniformCamo),true,
    'Current authored uniform pattern remains available: '+referenceId);
 }
});

test('D2.4 legacy mode is not gated, and Dispatch stays non-playable',()=>{
 for(const mode of ['quick-play','sandbox','legacy-campaign']){
  assert.equal(mayChooseDispatchSelection({
   context:{mode},kind:'equipment',equipmentSlot:'primary'
  },'primary-shotgun'),true);
  assert.equal(mayChooseDispatchSelection({
   context:{mode},kind:'weapon-preset'
  },'ak-aks74u'),true);
 }
 const creator=readFileSync(new URL('../src/ui/campaign-creator.ts',import.meta.url),'utf8');
 const creation=readFileSync(new URL('../src/campaign-creation.ts',import.meta.url),'utf8');
 assert.match(creator,/Dispatch, Operations and Wasteland are planned experiences/);
 assert.match(creation,/template:'custom'/);
 for(const path of ['dispatch-content-policy.ts','dispatch-starter-choices.ts',
  'dispatch-selection-projection.ts']){
  const source=readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage|indexedDB)\b/);
  assert.doesNotMatch(source,/\b(?:saveCampaign|writeCampaign|setEquipmentChoice)\s*\(/);
 }
});
