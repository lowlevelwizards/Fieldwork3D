import test from 'node:test';
import assert from 'node:assert/strict';
import {LIVE_AUDIO_MIX,withFieldworkLiveMix} from '../src/breach-live-sound-pack.ts';
import {defaultSoundPack,resolvePlayableSoundSettings,
 normalizeSoundPack} from '../src/sound-catalog.ts';
import {renderSound} from '../src/sound-synth.ts';
import {acousticResponseForCue} from '../src/breach-audio-environment.ts';
import {renderAcousticResponse} from '../src/sound-room-filter.ts';

const site=(width,height,purpose='office')=>({
 rooms:[{id:'r1',x:0,y:0,w:width,h:height,
  purpose,kind:'room',tone:0}],walls:[],doors:[],archetype:'office'
});
const origin={x:30,y:30};

test('Live audition ships exactly ten selected Wave 03 choices without editing user pack',()=>{
 assert.equal(LIVE_AUDIO_MIX.length,10);
 assert.equal(new Set(LIVE_AUDIO_MIX.map(x=>x.id)).size,10);
 const base=defaultSoundPack();
 const prior=JSON.stringify(base);
 const live=withFieldworkLiveMix(base);
 assert.equal(JSON.stringify(base),prior);
 assert.notEqual(live.choices,base.choices);
 for(const pick of LIVE_AUDIO_MIX){
  const c=live.choices[pick.id];
  assert.equal(c.enabled,true,pick.id);
  assert.equal(c.explored,true,pick.id);
  assert.equal(c.choice,pick.wave1,pick.id);
  assert.equal(c.refinement.choice,pick.wave2,pick.id);
  assert.equal(c.compound.choice,pick.wave3,pick.id);
  assert.equal(c.compound.approved,true,pick.id);
  const playable=resolvePlayableSoundSettings(live,pick.id);
  assert.ok(playable.refinement>=0,pick.id);
  assert.ok(playable.compound>=0,pick.id);
 }
 assert.equal(live.choices['doors.open'].choice,'A');
 assert.equal(live.choices['weapons.shotgun'].choice,'B');
});
test('User muting unrelated cues and personal choices survive the auditioner',()=>{
 const base=normalizeSoundPack({version:1,master:.37,choices:{
  'ui.notification':{enabled:false,choice:'C',reviewed:true},
  'weapons.carbine':{choice:'G',explored:true,enabled:false}
 }});
 const live=withFieldworkLiveMix(base);
 assert.equal(base.choices['weapons.carbine'].choice,'G');
 assert.equal(live.choices['weapons.carbine'].choice,'B');
 assert.equal(live.choices['ui.notification'].enabled,false);
 assert.equal(live.choices['ui.notification'].choice,'C');
 assert.equal(live.master,.37);
});
test('small tiled room, soft room, large hall and exterior have different acoustic parameters',()=>{
 const tiled=acousticResponseForCue(site(85,85,'bathroom'),origin,'weapons.carbine');
 const soft=acousticResponseForCue(site(85,85,'bedroom'),origin,'weapons.carbine');
 const big=acousticResponseForCue(site(500,450,'warehouse'),origin,'weapons.carbine');
 const outside=acousticResponseForCue(site(85,85,'bathroom'),{x:-55,y:40},'weapons.carbine');
 assert.equal(tiled.space,'small');
 assert.equal(big.space,'large');
 assert.equal(outside.space,'exterior');
 assert.ok(big.tail>tiled.tail);
 assert.ok(tiled.wet>soft.wet);
 assert.ok(tiled.bass>outside.bass);
 assert.ok(outside.tail<tiled.tail);
 assert.notEqual(tiled.key,soft.key);
 assert.equal(acousticResponseForCue(site(85,85),origin,'orders.waypoint'),null);
 assert.equal(acousticResponseForCue(site(85,85),origin,'ui.go'),null);
});
test('closed wall muffles and neighboring transparent space does not leak game intel',()=>{
 const s=site(100,110,'corridor');
 s.walls=[{a:{x:103,y:0},b:{x:103,y:120}}];
 const near=acousticResponseForCue(s,origin,'combat.flash',{x:75,y:30});
 const across=acousticResponseForCue(s,origin,'combat.flash',{x:170,y:30});
 assert.equal(near.occlusion,0);
 assert.ok(across.occlusion>near.occlusion);
 assert.equal(near.space,'small');
});
test('procedural reflections are deterministic, louder-room tail lasts longer without clipping',()=>{
 const base=withFieldworkLiveMix(defaultSoundPack());
 const settings=resolvePlayableSoundSettings(base,'weapons.carbine');
 const dry=renderSound('weapons.carbine',settings,8000);
 const before=dry.slice();
 const small=acousticResponseForCue(site(85,85,'bathroom'),origin,'weapons.carbine');
 const big=acousticResponseForCue(site(500,450,'warehouse'),origin,'weapons.carbine');
 const exterior=acousticResponseForCue(site(85,85),{x:-55,y:50},'weapons.carbine');
 const s=renderAcousticResponse(dry,8000,small);
 const s2=renderAcousticResponse(dry,8000,small);
 const l=renderAcousticResponse(dry,8000,big);
 const o=renderAcousticResponse(dry,8000,exterior);
 assert.deepEqual(s,s2);
 assert.deepEqual(dry,before);
 assert.ok(l.length>s.length);
 assert.ok(s.length>o.length);
 assert.notDeepEqual(s,l);
 for(const out of [s,l,o]){
  assert.ok(out.length>dry.length);
  assert.ok(out.every(v=>Number.isFinite(v)&&Math.abs(v)<=1));
 }
});
