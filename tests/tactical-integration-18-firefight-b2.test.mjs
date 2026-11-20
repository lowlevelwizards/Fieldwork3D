import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {muzzleFlashCue,impactPulse} from '../src/breach-combat-cues.ts';
import {weaponAudioCue,audibleImpact} from '../src/breach-combat-audio.ts';
import {impactProfile} from '../src/breach-effects.ts';
import {hasRecentSound} from '../src/breach-ai-policy.ts';

test('B3 muzzle flashes are anchored in shot age and real weapon/muzzle state',()=>{
 const naked=muzzleFlashCue('carbine',0);
 assert.equal(naked.active,true);
 assert.ok(naked.scale>0);
 assert.equal(muzzleFlashCue('carbine',.2).active,false);
 assert.ok(muzzleFlashCue('shotgun',.09).active);
 assert.equal(muzzleFlashCue('smg',.09).active,false);
 const suppressed=muzzleFlashCue('carbine',0,'muzzle-suppressor');
 const hider=muzzleFlashCue('carbine',0,'muzzle-hider');
 assert.ok(suppressed.scale<hider.scale&&hider.scale<naked.scale);
});
test('B4 material impacts decay predictably and do not create gameplay outcomes',()=>{
 for(const surface of ['blood','wood','stone','metal','glass','dust']){
  const length=impactProfile(surface).lifetime;
  const fresh=impactPulse(surface,0,length);
  const faded=impactPulse(surface,length*.7,length);
  assert.equal(fresh.active,true);
  assert.ok(fresh.opacity>faded.opacity);
  assert.equal(impactPulse(surface,length+1,length).active,false);
 }
 assert.ok(impactPulse('blood',0,.4).scale>
  impactPulse('dust',0,.4).scale);
});
test('B5 weapon identities differ, suppressors reduce transients and hidden hits remain hidden',()=>{
 const smg=weaponAudioCue('smg');
 const rifle=weaponAudioCue('rifle');
 const shotgun=weaponAudioCue('shotgun');
 assert.notEqual(smg.crackHz,rifle.crackHz);
 assert.ok(shotgun.bodySeconds>smg.bodySeconds);
 assert.ok(weaponAudioCue('carbine',true).crackSeconds<
           weaponAudioCue('carbine',false).crackSeconds);
 assert.equal(audibleImpact(false,.04),false);
 assert.equal(audibleImpact(false,.32),true);
 assert.equal(audibleImpact(true,0),true);
});
test('B6 presentation consumes shot IDs and visibility, never chooses hit results',()=>{
 const three=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const audio=readFileSync(new URL('../src/breach-audio-controller.ts',import.meta.url),'utf8');
 assert.match(three,/this\.recentMuzzleShots\.rebuild\(s\.shots\)/,
  'scene indexes only the real authoritative recorded shot history');
 assert.match(three,/mostRecentActiveMuzzleShot\(\s*this\.recentMuzzleShots\.forShooter\(actor\.id\),actor\.id,/,
  'scene retains the original newest visible shot resolver with a bounded per-actor view');
 const cues=readFileSync(new URL('../src/breach-combat-cues.ts',import.meta.url),'utf8');
 assert.match(cues,/muzzleFlashCue\(weapon,shot\.age,attachment\)\.active/,
  'shared event resolver must still use exact shot age and muzzle attachment');
 assert.match(three,/impactPulse\(shot\.surface\?\?'dust',shot\.age/);
 assert.match(three,/shotVisibility\(s,shot\)\.flash/);
 assert.match(audio,/audibleImpact\(shotVisibility\(state,shot\)\.impact/);
 assert.match(audio,/weaponAudioCue\(weapon,/);
 assert.match(audio,/if\(freshShots\.length===3\)freshShots\.shift\(\)/,'audio voices remain bounded');
});

test('encounter regression: no false initial audio suspicion; real gunfire interrupts',()=>{
 assert.equal(hasRecentSound(2,-1),false);
 assert.equal(hasRecentSound(2,1.5),true);
 assert.equal(hasRecentSound(9,1.5),false);
 const ai=readFileSync(new URL('../src/breach-ai-reconciliation.ts',import.meta.url),'utf8');
 assert.match(ai,/const recentNoise=hasRecentSound\(s\.seconds,a\.lastNoiseAt\)/);
 const intake=readFileSync(new URL('../src/breach-ai-acoustic-perception.ts',import.meta.url),'utf8');
 // E1/E5 and the later architecture split consume each new audible item once
 // using its ID/clock and never invent unseen target positions.
 assert.match(intake,/for\(const sound of s\.noise\)/);
 assert.match(intake,/sound\.id<=a\.lastNoiseExaminedId/);
 assert.match(intake,/interpretSound\(sound,a\.id,a\.p,s\.doors,sessionWorldGeometry\(s\)\.walls,s\.windows\)/);
 assert.match(intake,/if\(disposition!=='ignore'\)observeSuspicion/);
 assert.match(intake,/a\.lastNoiseExaminedId=Math\.max/);

});
