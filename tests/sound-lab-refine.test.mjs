import test from 'node:test';
import assert from 'node:assert/strict';
import {REFINEMENT_SOUNDS,REFINEMENT_SOUND_IDS,REFINEMENT_BY_ID,
 REFINEMENT_DIRECTIONS,REFINEMENT_RECIPES} from '../src/sound-refine.ts';
import {FOCUS_BY_ID} from '../src/sound-focus.ts';
import {SOUND_BY_ID,defaultSoundSettings,defaultSoundPack,
 normalizeSoundPack,resolveSoundSettings,resolvePlayableSoundSettings} from '../src/sound-catalog.ts';
import {renderSound} from '../src/sound-synth.ts';

const rms=a=>Math.sqrt(a.reduce((s,x)=>s+x*x,0)/Math.max(a.length,1));
test('Wave 02A has ten previous live cues with six authored layer recipes each',()=>{
 assert.equal(REFINEMENT_SOUND_IDS.length,10);
 assert.equal(new Set(REFINEMENT_SOUND_IDS).size,10);
 assert.equal(REFINEMENT_DIRECTIONS.length,6);
 assert.equal(REFINEMENT_RECIPES.length,6);
 for(const cue of REFINEMENT_SOUNDS){
  assert.equal(REFINEMENT_BY_ID.get(cue.id),cue);
  assert.ok(FOCUS_BY_ID.has(cue.id),cue.id);
  assert.equal(SOUND_BY_ID.get(cue.id)?.status,'live',cue.id);
  assert.equal(cue.names.length,6);assert.equal(cue.details.length,6);
  assert.equal(new Set(cue.names).size,6);
  assert.ok(cue.intent.length>36);
 }
 for(const recipe of REFINEMENT_RECIPES){
  assert.ok(recipe.layers.includes('core'));
  assert.ok(recipe.layers.length>=2);
 }
});
test('Wave 02 renders sixty finite, reproducible and distinct layered studies',()=>{
 for(const id of REFINEMENT_SOUND_IDS){
  const baseline=defaultSoundSettings(SOUND_BY_ID.get(id),'B');
  const before=renderSound(id,baseline,8000);
  const fingerprints=new Set();
  for(let i=0;i<6;i++){
   const settings={...baseline,refinement:i};
   const first=renderSound(id,settings,8000);
   const again=renderSound(id,settings,8000);
   assert.deepEqual(first,again,id+' '+i);
   assert.ok(first.length>=before.length,id+' '+i);
   assert.ok(first.every(x=>Number.isFinite(x)&&Math.abs(x)<=1),id+' '+i);
   let sum=0;for(let k=13;k<Math.min(first.length,2500);k+=11)
    sum+=first[k]*Math.sin(k*.43);
   fingerprints.add(sum.toFixed(8));
   assert.ok(Math.abs(sum)>1e-8,id+' '+i);
   const ratio=rms(first)/Math.max(.0001,rms(before));
   assert.ok(ratio>.24&&ratio<3.1,id+' '+i+' rms ratio '+ratio);
  }
  assert.equal(fingerprints.size,6,id);
  assert.deepEqual(renderSound(id,baseline,8000),before,id+' changed Wave 01');
 }
});
test('Import of the prior Wave 01 JSON keeps its choices; refinements are opt-in',()=>{
 const pack=normalizeSoundPack({version:1,master:.7,choices:{
  'weapons.carbine':{enabled:true,choice:'B',reviewed:true,explored:true,
   shortlist:['H']},
  'equipment.reload':{enabled:true,choice:'D',reviewed:true,explored:true},
  'doors.kick':{enabled:true,choice:'B',reviewed:true,explored:true}
 }});
 assert.equal(pack.choices['weapons.carbine'].choice,'B');
 assert.deepEqual(pack.choices['weapons.carbine'].shortlist,['H']);
 assert.equal(resolvePlayableSoundSettings(pack,'weapons.carbine').refinement,undefined);
 assert.equal(pack.choices['equipment.reload'].choice,'D');
 assert.equal(pack.choices['doors.kick'].choice,'B');
 const withWave2=normalizeSoundPack({version:1,choices:{
  'weapons.carbine':{choice:'B',explored:true,refinement:{
   choice:'F',approved:true,shortlist:['D','F','F','Z',42]}}
 }});
 assert.deepEqual(withWave2.choices['weapons.carbine'].refinement?.shortlist,['D','F']);
 assert.equal(withWave2.choices['weapons.carbine'].choice,'B');
 assert.equal(resolveSoundSettings(withWave2,'weapons.carbine').refinement,undefined);
 assert.equal(resolvePlayableSoundSettings(withWave2,'weapons.carbine').refinement,5);
});
test('An invalid or unapproved refinement cannot affect gameplay',()=>{
 const blocked=normalizeSoundPack({version:1,choices:{
  'weapons.carbine':{choice:'B',explored:false,refinement:{
   choice:'A',approved:true}},
  'weapons.rifle':{choice:'B',explored:true,refinement:{
   choice:'Z',approved:true}},
  'orders.waypoint':{choice:'A',explored:true,refinement:{
   choice:'D',approved:false}}
 }});
 assert.equal(blocked.choices['weapons.carbine'].refinement?.approved,false);
 assert.equal(blocked.choices['weapons.rifle'].refinement?.approved,false);
 assert.equal(resolvePlayableSoundSettings(blocked,'weapons.rifle').refinement,undefined);
 assert.equal(resolvePlayableSoundSettings(blocked,'orders.waypoint').refinement,undefined);
 assert.equal(defaultSoundPack().choices['weapons.carbine'].refinement,undefined);
});
