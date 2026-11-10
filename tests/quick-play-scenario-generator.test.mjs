import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultQuickPlaySettings,resolveQuickPlaySettings,
 QUICK_PLAY_BUILDINGS} from '../src/quick-play-settings.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';

test('default random scope includes every supported size and building',()=>{
 const initial=defaultQuickPlaySettings();
 assert.equal(initial.size,'random');
 assert.deepEqual(initial.buildings,QUICK_PLAY_BUILDINGS);
 assert.equal(initial.mission,'random');
 assert.equal(initial.seed,null);
 const seen=new Set(Array.from({length:64},(_,i)=>
  resolveQuickPlaySettings(initial,i+1).scale));
 assert.deepEqual([...seen].sort(),['large','medium','small']);
});

test('explicit recipe preserves seed and requested parameters',()=>{
 const config={...defaultQuickPlaySettings(),seed:0x12345678,
  size:'large',buildings:['clinic'],mission:'rescue',
  presence:'heavy',civilians:'off'};
 const one=resolveQuickPlaySettings(config,31);
 const two=resolveQuickPlaySettings(config,993);
 assert.deepEqual(one,two);
 assert.equal(one.seed,0x12345678);
 assert.equal(one.archetype,'clinic');
 assert.equal(one.scale,'large');
 assert.equal(one.mission,'rescue');
 assert.equal(one.presence,'heavy');
 assert.equal(one.civilians,'off');
});

test('random lanes remain reproducible without changing seed or mission choices',()=>{
 const cfg=defaultQuickPlaySettings();
 const a=resolveQuickPlaySettings(cfg,71);
 const b=resolveQuickPlaySettings(cfg,71);
 assert.deepEqual(a,b);
 assert.equal(a.seed,71);
 const only={...cfg,buildings:['warehouse']};
 assert.equal(resolveQuickPlaySettings(only,71).mission,a.mission);
 assert.equal(resolveQuickPlaySettings(only,71).scale,a.scale);
});

test('invalid/empty building pools cannot silently generate a different site',()=>{
 assert.throws(()=>resolveQuickPlaySettings(
  {...defaultQuickPlaySettings(),buildings:[]},19),/at least one/);
 assert.throws(()=>resolveQuickPlaySettings(
  {...defaultQuickPlaySettings(),seed:0},19),/Seed must/);
});

test('one explicit building and mission reach the real architecture and session',()=>{
 const requested=resolveQuickPlaySettings({...defaultQuickPlaySettings(),
  seed:71,buildings:['house'],size:'small',mission:'rescue',
  presence:'light',civilians:'off'},999);
 const site=generateSite(requested.seed,requested.scale,undefined,
  {mission:requested.mission,presence:requested.presence,
   civilianPolicy:requested.civilians,enableIncidentIntent:true},
  {archetype:requested.archetype});
 assert.equal(site.seed,71);
 assert.equal(site.archetype,'house');
 assert.equal(site.scale,'small');
 assert.equal(site.encounter?.mission,'rescue');
 assert.equal(site.encounter?.neutrals?.length,0);
 const session=newSession(0,requested.seed,'floor-plan',requested.scale,
  requested.mission,site,{enableCivilians:true});
 assert.equal(session.missionType,'rescue');
 assert.equal(session.civilians.filter(c=>!c.rescueTarget).length,0);
 assert.equal(session.civilians.filter(c=>c.rescueTarget).length,1);
});

test('quick play UI and worker preserve the mission contract without leaking counts',()=>{
 const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 assert.match(source('campaign-ui.ts'),/button\('QUICK PLAY',this\.handlers\.quickPlay/);
 assert.match(source('breach-main.ts'),/startSession:\(seed,site,mission\)=>reset/);
 assert.match(source('quick-play-worker.ts'),/mission:req\.mission/);
 assert.match(source('quick-play-worker.ts'),/archetype:req\.archetype/);
 assert.doesNotMatch(source('quick-play-worker.ts'),/site\.enemies\.length\+' contacts'/);
});
