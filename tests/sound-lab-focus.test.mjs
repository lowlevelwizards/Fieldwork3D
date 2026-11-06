import test from 'node:test';
import assert from 'node:assert/strict';
import {FOCUS_SOUNDS,FOCUS_SOUND_IDS,FOCUS_BY_ID,FOCUS_DIRECTIONS,
 DIRECTION_METHODS} from '../src/sound-focus.ts';
import {SOUND_BY_ID,SOUND_CATALOG,defaultSoundPack,defaultSoundSettings,
 normalizeSoundPack,resolveSoundSettings} from '../src/sound-catalog.ts';
import {renderSound} from '../src/sound-synth.ts';

test('Wave 01 is an ordered, bounded and fully connected first batch',()=>{
 assert.equal(FOCUS_SOUNDS.length,16);
 assert.equal(FOCUS_DIRECTIONS.length,8);
 assert.equal(new Set(FOCUS_SOUND_IDS).size,16);
 assert.equal(DIRECTION_METHODS.length,8);
 assert.equal(SOUND_CATALOG.length>=200,true);
 for(const f of FOCUS_SOUNDS){
  assert.equal(SOUND_BY_ID.get(f.id)?.status,'live',f.id);
  assert.equal(FOCUS_BY_ID.get(f.id),f);
  assert.equal(f.names.length,8);
  assert.equal(new Set(f.names).size,8);
  assert.ok(f.why.length>18);
 }
});
test('Each of 128 sketches has a distinct deterministic waveform construction',()=>{
 for(const f of FOCUS_SOUNDS){
  const fingerprints=new Set();
  for(const [i,v] of FOCUS_DIRECTIONS.entries()){
   const settings=defaultSoundSettings(SOUND_BY_ID.get(f.id),v);
   assert.equal(settings.concept,i);
   const samples=renderSound(f.id,settings,8000);
   assert.ok(samples.length>300&&samples.length<50000, f.id+' '+v);
   assert.ok(samples.every(n=>Number.isFinite(n)&&Math.abs(n)<=1));
   let sum=0;
   for(let k=101;k<Math.min(samples.length,1900);k+=13)
    sum+=samples[k]*Math.sin(k*.357);
   fingerprints.add(sum.toFixed(9));
  }
  assert.equal(fingerprints.size,8,f.id);
 }
});
test('Old saved sound packs remain not-yet-explored and do not opt into new synthesis',()=>{
 const pack=normalizeSoundPack({version:1,master:.5,
  choices:{'weapons.carbine':{choice:'B',reviewed:true,enabled:true}}});
 assert.equal(pack.choices['weapons.carbine'].reviewed,true);
 assert.notEqual(pack.choices['weapons.carbine'].explored,true);
 const chosen=normalizeSoundPack({version:1,
  choices:{'weapons.carbine':{choice:'H',reviewed:true,explored:true,
   shortlist:['B','H','H','Z',7],edits:{H:{concept:999,gain:.3,noise:1}}}}});
 assert.equal(chosen.choices['weapons.carbine'].choice,'H');
 assert.deepEqual(chosen.choices['weapons.carbine'].shortlist,['B','H']);
 assert.equal(resolveSoundSettings(chosen,'weapons.carbine').concept,7);
 assert.equal(resolveSoundSettings(chosen,'weapons.carbine').gain,.3);
 const old=defaultSoundPack();
 assert.equal(old.choices['weapons.carbine'].choice,'B');
 assert.notEqual(old.choices['weapons.carbine'].explored,true);
});
