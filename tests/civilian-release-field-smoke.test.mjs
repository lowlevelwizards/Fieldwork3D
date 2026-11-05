import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,toggling,stepSession,enemies,team,liveVisibility}
 from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';

test('E5-B combined field preview: no neutral acquires combat identity or auto-pauses',()=>{
 for(const seed of [11,17,31]){
  const site=generateSite(seed,'small',undefined,
   {seed,mission:'intel',risk:1,premise:'routine'});
  const s=newSession(0,seed,'floor-plan','small','intel',site,
   {enableCivilians:true});
  assert.equal(team(s).length,4);
  assert.equal(enemies(s).length,site.enemies.length);
  assert.equal(s.civilians.length,site.encounter.neutrals?.length??0);
  for(const c of s.civilians){
   assert.ok(!s.operators.some(a=>a.id===c.id));
   assert.equal('side' in c,false);
   assert.equal('weapon' in c,false);
  }
  toggling(s);
  assert.equal(s.phase,'running');
  for(let tick=0;tick<75;tick++){
   stepSession(s,1/60);
   assert.equal(s.phase,'running','neutral perception must not auto-pause');
  }
  for(const c of s.civilians){
   assert.ok(Number.isFinite(c.p.x)&&Number.isFinite(c.p.y));
   assert.ok(c.health>0);
   assert.equal(typeof liveVisibility(s,c.p),'boolean');
  }
 }
});
test('E5-B combined rescue: exactly one physical target and rewindable position',()=>{
 const seed=27;
 const site=generateSite(seed,'small',undefined,
  {seed,mission:'rescue',risk:1,premise:'routine'});
 const s=newSession(0,seed,'floor-plan','small','rescue',site,
  {enableCivilians:true});
 const targets=s.civilians.filter(c=>c.rescueTarget);
 assert.equal(targets.length,1);
 assert.deepEqual(targets[0].p,s.rescue.p);
 const film=new MissionRecorder();
 film.capture(s,true);
 toggling(s);
 for(let i=0;i<15;i++)stepSession(s,1/60);
 film.capture(s,true);
 const prior=film.frames[0];
 applyReplayFrame(s,prior);
 assert.equal(s.civilians.filter(c=>c.rescueTarget).length,1);
 assert.deepEqual(s.civilians.find(c=>c.rescueTarget).p,prior.civilians[0].p);
});
