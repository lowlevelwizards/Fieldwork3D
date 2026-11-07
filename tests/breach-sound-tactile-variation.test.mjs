import test from 'node:test';
import assert from 'node:assert/strict';
import {tactileProfile,variationForSound,renderTactileBody,
 hashString} from '../src/sound-live-tactility.ts';
import {renderSound,playDesignedSound} from '../src/sound-synth.ts';
import {defaultSoundSettings,SOUND_BY_ID,defaultSoundPack,
 resolvePlayableSoundSettings} from '../src/sound-catalog.ts';
import {withFieldworkLiveMix} from '../src/breach-live-sound-pack.ts';

const sampleRate=8000;
const lowEnergy=(array,cutoff=230)=>{
 const alpha=Math.min(.9,2*Math.PI*cutoff/sampleRate);
 let low=0,sum=0;
 const count=Math.min(array.length,Math.round(sampleRate*.26));
 for(let i=0;i<count;i++){
  low+=(array[i]-low)*alpha;
  sum+=low*low;
 }
 return sum/Math.max(1,count);
};
test('S4 profiles add physical low-mid weight to cinematic and tactile events, not UI',()=>{
 const pack=withFieldworkLiveMix(defaultSoundPack());
 const required=['weapons.carbine','weapons.rifle','weapons.shotgun',
  'weapons.rifle_suppressed','combat.flash','doors.kick','doors.close',
  'doors.open','movement.boot','equipment.reload','impacts.body_hit'];
 for(const id of required){
  const profile=tactileProfile(id);
  assert.ok(profile,id+' missing body profile');
  assert.ok(profile.hz>=60&&profile.hz<=220,id+' fundamental is not low-mid');
  assert.ok(profile.body>.09,id+' body layer too weak to compare');
  const settings=resolvePlayableSoundSettings(pack,id);
  assert.ok(settings);
  const original=renderSound(id,settings,sampleRate);
  const before=original.slice();
  const weighted=renderTactileBody(id,original,sampleRate);
  assert.notDeepEqual(weighted,original,id+' body layer was inaudible');
  assert.deepEqual(original,before,id+' selected dry master must stay unmodified');
  assert.equal(weighted.length,original.length,id+' should not extend room reverb');
  assert.ok(weighted.every(x=>Number.isFinite(x)&&Math.abs(x)<=1),id+' peak unsafe');
  assert.ok(lowEnergy(weighted)>lowEnergy(original)*.85,
   id+' should not remove the existing low end');
 }
 const ui=renderSound('orders.waypoint',
  defaultSoundSettings(SOUND_BY_ID.get('orders.waypoint'),'A'),sampleRate);
 assert.equal(renderTactileBody('orders.waypoint',ui,sampleRate),ui);
 assert.equal(tactileProfile('ui.select'),null);
 assert.equal(tactileProfile('orders.waypoint'),null);
});

test('S4 seeded variants are reproducible, restrained and nonrepeating across adjacent events',()=>{
 for(const id of ['weapons.carbine','weapons.rifle','combat.flash',
  'doors.kick','movement.boot','equipment.reload','impacts.body_hit']){
  const rates=Array.from({length:8},(_,i)=>variationForSound(id,i).rate);
  assert.equal(new Set(rates.map(x=>x.toFixed(6))).size,8,id);
  for(const rate of rates)
   assert.ok(rate>.90&&rate<1.10,id+' should stay recognizable');
  for(let i=0;i<7;i++)assert.notEqual(rates[i],rates[i+1]);
  assert.deepEqual(variationForSound(id,14),variationForSound(id,14));
 }
 assert.deepEqual(variationForSound('ui.go',31),
  {rate:1,timbreDb:0,gain:1});
 assert.equal(hashString('shot:42'),hashString('shot:42'));
 assert.notEqual(hashString('shot:42'),hashString('shot:43'));
});

function fakeAudioContext(){
 let builds=0,filters=0;
 const node=()=>({connect(){return this;},disconnect(){}});
 const ctx={
  state:'running',sampleRate,
  destination:node(),
  createBuffer(channels,length){
   builds++;const data=new Float32Array(length);
   return {getChannelData(){return data;}};
  },
  createBufferSource(){return {...node(),playbackRate:{value:1},
    onended:null, start(){},stop(){}};},
  createGain(){return {...node(),gain:{value:0}};},
  createBiquadFilter(){filters++;return {...node(),type:'peaking',
    frequency:{value:0},Q:{value:0},gain:{value:0}};},
  createStereoPanner(){return {...node(),pan:{value:0}};},
  get builds(){return builds;},get filters(){return filters;}
 };
 return ctx;
}
test('S4 variations cost no additional PCM buffers and keep lab/legacy audio untouched',()=>{
 const settings=defaultSoundSettings(SOUND_BY_ID.get('weapons.carbine'),'B');
 const ctx=fakeAudioContext();
 const early=playDesignedSound(ctx,'weapons.carbine',settings,
  {liveTactile:true,variationSeed:0});
 const other=playDesignedSound(ctx,'weapons.carbine',settings,
  {liveTactile:true,variationSeed:1});
 assert.ok(early&&other);
 assert.notEqual(early.playbackRate.value,other.playbackRate.value);
 assert.equal(ctx.builds,1,'variable events must share cached audio buffer');
 assert.ok(ctx.filters>=2,'event color variation should be applied in WebAudio');
 const unmodified=playDesignedSound(ctx,'weapons.carbine',settings);
 assert.equal(unmodified.playbackRate.value,1);
 assert.equal(ctx.builds,2,'legacy dry sound must have a separate buffer');
});
