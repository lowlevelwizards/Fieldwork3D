import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialRoster} from '../src/breach-roster.ts';
import {newCampaign} from '../src/campaign-state.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
import {validateStudioAppearanceEdits,
 applyStudioRosterEdits,applyStudioCampaignEdits}
 from '../src/operator-studio-batch-save.ts';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const look=top=>setWardrobeStyle(initialWardrobe(),'top',top);
test('batch-edit validation is strict, bounded, and avoids silent invalid saves',()=>{
 const entries=[{id:'rook',wardrobe:look('combat-shirt')},
  {id:'vale',wardrobe:look('acu-shirt')}];
 assert.deepEqual(validateStudioAppearanceEdits(entries),entries);
 assert.equal(validateStudioAppearanceEdits([]),null);
 assert.equal(validateStudioAppearanceEdits([{id:'rook',wardrobe:{version:5}}]),null);
 assert.equal(validateStudioAppearanceEdits([...entries,entries[0]]),null);
 assert.equal(validateStudioAppearanceEdits(Array.from({length:33},(_,i)=>({
  id:'operator-'+i,wardrobe:initialWardrobe()}))),null);
});
test('Quick Play Save All updates only appearance for multiple operators',()=>{
 const roster=initialRoster();
 const [a,b]=roster.members;
 assert.ok(a&&b,'two operators required');
 const edits=validateStudioAppearanceEdits([
  {id:a.id,wardrobe:look('combat-shirt')},
  {id:b.id,wardrobe:look('smock-jacket')}
 ]);
 assert.ok(edits);
 const before=JSON.stringify(roster.members.map(x=>x.loadout));
 const next=applyStudioRosterEdits(roster,edits);
 assert.ok(next);
 assert.equal(next.members.find(x=>x.id===a.id)?.wardrobe.styles.top,'combat-shirt');
 assert.equal(next.members.find(x=>x.id===b.id)?.wardrobe.styles.top,'smock-jacket');
 assert.equal(JSON.stringify(next.members.map(x=>x.loadout)),before,
  'appearance saving cannot alter weapons or equipment');
 assert.deepEqual(roster.members.map(x=>x.wardrobe.styles),
  initialRoster().members.map(x=>x.wardrobe.styles),
  'original roster cannot mutate');
 assert.equal(applyStudioRosterEdits(roster,[{id:'missing',wardrobe:look('acu-shirt')}]),null);
});
test('Campaign Save All retains inventory and refuses active operation changes',()=>{
 const campaign=newCampaign(417),[a,b]=campaign.operators;
 assert.ok(a&&b);
 const edits=validateStudioAppearanceEdits([
  {id:a.id,wardrobe:look('gorka-jacket')},
  {id:b.id,wardrobe:look('acu-shirt')}
 ]);
 assert.ok(edits);
 const before=JSON.stringify(campaign.inventory);
 const loadouts=JSON.stringify(campaign.operators.map(x=>x.loadout));
 const next=applyStudioCampaignEdits(campaign,edits);
 assert.ok(next);
 assert.equal(next.operators.find(x=>x.id===a.id)?.wardrobe.styles.top,'gorka-jacket');
 assert.equal(next.operators.find(x=>x.id===b.id)?.wardrobe.styles.top,'acu-shirt');
 assert.equal(JSON.stringify(next.inventory),before);
 assert.equal(JSON.stringify(next.operators.map(x=>x.loadout)),loadouts);
 assert.equal(applyStudioCampaignEdits({...campaign,activeContractId:'mission'},edits),null);
 assert.equal(applyStudioCampaignEdits(campaign,[{id:'ghost',wardrobe:look('acu-shirt')}]),null);
});
test('game owns the atomic one-write protocol and Studio labels all dirty looks',()=>{
 const parent=source('../src/breach-main.ts'),studio=source('../src/operator-studio.ts');
 assert.match(parent,/msg.type==='fw-studio-commit-batch'/);
 assert.match(parent,/applyStudioRosterEdits\(persistentRoster,edits\)/);
 assert.match(parent,/applyStudioCampaignEdits\(campaign,edits\)/);
 assert.match(parent,/event.origin!==location.origin/);
 assert.match(parent,/type:'fw-studio-batch-saved'/);
 assert.match(studio,/type:'fw-studio-commit-batch'/);
 assert.match(studio,/SAVE '\+dirty.size\+' LOOKS'/);
 assert.match(studio,/dirty.has\(person.id\)/);
 assert.match(studio,/SAVE REJECTED · ALL UNSAVED DRAFTS PRESERVED/);
});
