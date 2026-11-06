import test from 'node:test';
import assert from 'node:assert/strict';
import {COMPOUND_SOUNDS,COMPOUND_SOUND_IDS,COMPOUND_BY_ID,
 COMPOUND_DIRECTIONS,COMPOUND_RECIPES} from '../src/sound-compound.ts';
import {REFINEMENT_BY_ID} from '../src/sound-refine.ts';
import {SOUND_BY_ID,defaultSoundPack,defaultSoundSettings,
 normalizeSoundPack,resolvePlayableSoundSettings} from '../src/sound-catalog.ts';
import {renderSound} from '../src/sound-synth.ts';
const rms=a=>Math.sqrt(a.reduce((sum,n)=>sum+n*n,0)/Math.max(1,a.length));

test('Wave 03 is a 10 × 6 follow-up built only from prior live studies',()=>{
 assert.equal(COMPOUND_SOUNDS.length,10);
 assert.equal(COMPOUND_DIRECTIONS.length,6);
 assert.equal(COMPOUND_RECIPES.length,6);
 assert.equal(new Set(COMPOUND_SOUND_IDS).size,10);
 for(const item of COMPOUND_SOUNDS){
  assert.equal(COMPOUND_BY_ID.get(item.id),item);
  assert.equal(SOUND_BY_ID.get(item.id)?.status,'live');
  assert.ok(REFINEMENT_BY_ID.has(item.id),item.id);
  assert.equal(item.names.length,6);
  assert.equal(item.details.length,6);
  assert.equal(new Set(item.names).size,6);
  assert.ok(item.why.length>45);
 }
 for(const recipe of COMPOUND_RECIPES)
  assert.ok(recipe.layers.length>=3);
});

test('60 compound studies are deterministic, bounded, distinct and not simply louder copies',()=>{
 for(const id of COMPOUND_SOUND_IDS){
  const chosen=defaultSoundSettings(SOUND_BY_ID.get(id),
   id==='orders.waypoint'?'A':id==='equipment.reload'?'D':'B');
  const prior={...chosen,refinement:id==='doors.kick'?2:
   id==='weapons.carbine'||id==='weapons.rifle'?0:1};
  const baseline=renderSound(id,prior,8000);
  const hashes=new Set();
  for(let index=0;index<6;index++){
   const sound={...prior,compound:index};
   const out=renderSound(id,sound,8000);
   const repeat=renderSound(id,sound,8000);
   assert.deepEqual(out,repeat,id+' compound '+index);
   assert.ok(out.length>=baseline.length);
   assert.ok(out.every(x=>Number.isFinite(x)&&Math.abs(x)<=1),id+' '+index);
   assert.notDeepEqual(out,baseline,id+' '+index+' must add real events');
   let fingerprint=0;
   for(let n=17;n<Math.min(out.length,4000);n+=19)
    fingerprint+=out[n]*Math.sin(n*.227);
   hashes.add(fingerprint.toFixed(8));
   const ratio=rms(out)/Math.max(.00001,rms(baseline));
   assert.ok(ratio>.22&&ratio<2.5,id+' '+index+' loudness ratio '+ratio);
  }
  assert.equal(hashes.size,6,id+' must distinguish six sound narratives');
  assert.deepEqual(renderSound(id,prior,8000),baseline,
   id+' previous approved Wave 02 must remain unchanged');
 }
});

test('Wave 03 approves only explicit, supported compound directions with approved Wave 02 source',()=>{
 const old=normalizeSoundPack({version:1,choices:{
  'weapons.carbine':{choice:'B',reviewed:true,explored:true,
   shortlist:['H'],refinement:{choice:'A',approved:true}},
  'doors.kick':{choice:'B',reviewed:true,explored:true,
   refinement:{choice:'C',approved:true}}
 }});
 assert.equal(old.choices['weapons.carbine'].compound,undefined);
 assert.equal(resolvePlayableSoundSettings(old,'weapons.carbine').compound,undefined);
 assert.equal(resolvePlayableSoundSettings(old,'weapons.carbine').refinement,0);
 assert.deepEqual(old.choices['weapons.carbine'].shortlist,['H']);
 const newPack=normalizeSoundPack({version:1,choices:{
  'weapons.carbine':{choice:'B',explored:true,
   refinement:{choice:'A',approved:true},
   compound:{choice:'F',approved:true,shortlist:['A','C','F','F','Z',37]}},
  'doors.kick':{choice:'B',explored:true,
   refinement:{choice:'C',approved:true},
   compound:{choice:'E',approved:true}}
 }});
 assert.equal(newPack.choices['weapons.carbine'].choice,'B');
 assert.equal(newPack.choices['weapons.carbine'].refinement.choice,'A');
 assert.deepEqual(newPack.choices['weapons.carbine'].compound.shortlist,['A','C','F']);
 assert.equal(resolvePlayableSoundSettings(newPack,'weapons.carbine').refinement,0);
 assert.equal(resolvePlayableSoundSettings(newPack,'weapons.carbine').compound,5);
 assert.equal(resolvePlayableSoundSettings(newPack,'doors.kick').compound,4);
});

test('Malformed, premature or unselected Wave 03 cannot affect older sounds',()=>{
 const pack=normalizeSoundPack({version:1,choices:{
  'weapons.carbine':{choice:'B',explored:true,
   refinement:{choice:'A',approved:false},
   compound:{choice:'F',approved:true}},
  'weapons.rifle':{choice:'B',explored:true,
   refinement:{choice:'B',approved:true},
   compound:{choice:'NOPE',approved:true}},
  'equipment.reload':{choice:'D',explored:true,
   refinement:{choice:'B',approved:true},
   compound:{choice:'A',approved:false}},
  'ui.go':{choice:'D',explored:true,
   compound:{choice:'F',approved:true}}
 }});
 assert.equal(pack.choices['weapons.carbine'].compound.approved,false);
 assert.equal(pack.choices['weapons.rifle'].compound.approved,false);
 assert.equal(resolvePlayableSoundSettings(pack,'weapons.carbine').compound,undefined);
 assert.equal(resolvePlayableSoundSettings(pack,'weapons.rifle').compound,undefined);
 assert.equal(resolvePlayableSoundSettings(pack,'equipment.reload').compound,undefined);
 assert.equal(pack.choices['ui.go'].compound,undefined);
 assert.equal(defaultSoundPack().choices['weapons.carbine'].compound,undefined);
});
