import test from 'node:test';
import assert from 'node:assert/strict';
import {SOUND_CATALOG,SOUND_BY_ID,SOUND_GROUPS,SOUND_STORAGE_KEY,
 defaultSoundPack,normalizeSoundPack,defaultSoundSettings,
 resolveSoundSettings} from '../src/sound-catalog.ts';
import {renderSound,encodeSoundWav,packageSoundZip} from '../src/sound-synth.ts';

test('Sound Lab has stable unique IDs and covers the complete audio backlog',()=>{
 assert.ok(SOUND_CATALOG.length>=200);
 assert.equal(new Set(SOUND_CATALOG.map(e=>e.id)).size,SOUND_CATALOG.length);
 assert.equal(SOUND_GROUPS.length,12);
 assert.ok(SOUND_CATALOG.filter(e=>e.status==='live').length>=18);
 assert.ok(SOUND_CATALOG.some(e=>e.status==='planned'));
 assert.equal(SOUND_STORAGE_KEY,'fieldwork3d.soundlab.pack.v1');
 for(const entry of SOUND_CATALOG){
  assert.equal(SOUND_BY_ID.get(entry.id),entry);
  assert.ok(entry.label.length>2);
 }
});
test('Defaults do not play unconnected candidate sounds in game',()=>{
 const pack=defaultSoundPack();
 assert.equal(pack.version,1);
 assert.equal(pack.choices['weapons.rifle'].enabled,true);
 assert.equal(pack.choices['weapons.rifle_suppressed'].enabled,true);
 assert.equal(pack.choices['doors.close'].enabled,true);
 assert.equal(pack.choices['environment.rain'].enabled,false);
 assert.equal(pack.choices['people.civilian_scream'].enabled,false);
 assert.equal(pack.choices['ui.select'].choice,'B');
});
test('A B C are distinct, and imported settings cannot escape safe bounds',()=>{
 const entry=SOUND_BY_ID.get('weapons.rifle');
 assert.ok(entry);
 const a=defaultSoundSettings(entry,'A');
 const b=defaultSoundSettings(entry,'B');
 const c=defaultSoundSettings(entry,'C');
 assert.notDeepEqual(a,b);assert.notDeepEqual(b,c);
 const pack=normalizeSoundPack({version:1,master:40,
  choices:{'weapons.rifle':{choice:'C',reviewed:true,favorite:true,
   enabled:false,edits:{C:{pitch:-2,gain:999,length:99,noise:8}}}}});
 const selected=resolveSoundSettings(pack,'weapons.rifle');
 assert.ok(selected);
 assert.equal(pack.master,1);
 assert.equal(pack.choices['weapons.rifle'].enabled,false);
 assert.equal(pack.choices['weapons.rifle'].reviewed,true);
 assert.equal(pack.choices['weapons.rifle'].favorite,true);
 assert.equal(selected.pitch,45);
 assert.equal(selected.gain,1);
 assert.equal(selected.length,3.8);
 assert.equal(selected.noise,1);
});
test('Procedural samples are finite, repeatable, quiet at the end and differ across cues',()=>{
 const entry=SOUND_BY_ID.get('doors.kick');
 assert.ok(entry);
 const settings=defaultSoundSettings(entry,'B');
 const a=renderSound(entry.id,settings);
 const b=renderSound(entry.id,settings);
 assert.ok(a.length>2000&&a.length<130000);
 assert.deepEqual(a,b);
 assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<=1));
 const other=renderSound('weapons.rifle',
   defaultSoundSettings(SOUND_BY_ID.get('weapons.rifle'),'B'));
 assert.notEqual(a[87],other[87]);
});
test('WAV export has valid mono 16-bit PCM and ZIP pack has intact directory',()=>{
 const pcm=renderSound('ui.select',
  defaultSoundSettings(SOUND_BY_ID.get('ui.select'),'A'));
 const wav=encodeSoundWav(pcm);
 assert.equal(new TextDecoder().decode(wav.subarray(0,4)),'RIFF');
 assert.equal(new TextDecoder().decode(wav.subarray(8,12)),'WAVE');
 assert.equal(new TextDecoder().decode(wav.subarray(36,40)),'data');
 const w=new DataView(wav.buffer);
 assert.equal(w.getUint16(22,true),1);
 assert.equal(w.getUint16(34,true),16);
 assert.equal(w.getUint32(40,true),pcm.length*2);
 const zip=packageSoundZip([
  {name:'sound-pack.json',data:new TextEncoder().encode('{"version":1}')},
  {name:'wavs/ui.select.wav',data:wav}
 ]);
 const z=new DataView(zip.buffer);
 assert.equal(z.getUint32(0,true),0x04034b50);
 assert.equal(z.getUint32(zip.length-22,true),0x06054b50);
 assert.equal(z.getUint16(zip.length-22+10,true),2);
 assert.ok(z.getUint32(zip.length-22+16,true)>0);
});
