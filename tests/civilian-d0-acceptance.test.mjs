import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,toggling,stepSession,enemies,team}
 from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame}
 from '../src/breach-replay.ts';

/** E5-D0: fixed-seed acceptance matrix, opt-in only until device approval.
 * Never force civilian population into an unsafe generated room. */
const fixtures=[
 {seed:11,scale:'small',kind:'intel',premise:'vacant'},
 {seed:17,scale:'small',kind:'intel',premise:'routine'},
 {seed:31,scale:'standard',kind:'intel',premise:'routine'},
 {seed:61,scale:'expanded',kind:'intel',premise:'routine'},
 {seed:27,scale:'small',kind:'rescue',premise:'routine'}
];
test('E5-D0 generated civilian population is optional, identity-safe and deterministic',()=>{
 for(const f of fixtures){
  const site=generateSite(f.seed,f.scale,undefined,{
   seed:f.seed,mission:f.kind,premise:f.premise,risk:1
  });
  const before=newSession(0,f.seed,'floor-plan',f.scale,f.kind,site);
  const active=newSession(0,f.seed,'floor-plan',f.scale,f.kind,site,
   {enableCivilians:true});
  assert.equal(before.civilians.length,0);
  assert.equal(enemies(before).length,enemies(active).length);
  assert.equal(team(active).length,team(before).length);
  assert.equal(new Set(active.civilians.map(c=>c.id)).size,active.civilians.length);
  assert.ok(active.civilians.every(c=>!('side' in c)&&!('weapon' in c)));
  assert.ok(active.civilians.every(c=>Number.isFinite(c.p.x)&&
    Number.isFinite(c.p.y)&&c.health>0));
  if(f.kind==='rescue'){
   assert.equal(active.civilians.filter(c=>c.rescueTarget).length,1);
   assert.deepEqual(active.civilians.find(c=>c.rescueTarget).p,active.rescue.p);
  }else assert.ok(active.civilians.length<=
     (f.scale==='small'?2:f.scale==='expanded'?6:4));
  if(f.premise==='vacant')assert.equal(active.civilians.length,0);
  const again=newSession(0,f.seed,'floor-plan',f.scale,f.kind,site,
   {enableCivilians:true});
  assert.deepEqual(again.civilians.map(c=>[c.id,c.p,c.activity]),
    active.civilians.map(c=>[c.id,c.p,c.activity]));
 }
});
test('E5-D0 civilians cannot force an auto-pause and rewind retains identities',()=>{
 const f=fixtures[2];
 const site=generateSite(f.seed,f.scale,undefined,
  {seed:f.seed,mission:f.kind,premise:f.premise});
 const s=newSession(0,f.seed,'floor-plan',f.scale,f.kind,site,
  {enableCivilians:true});
 const film=new MissionRecorder();
 film.capture(s,true);
 const identities=s.civilians.map(c=>[c.id,c.p.x,c.p.y]);
 toggling(s);
 for(let tick=0;tick<35;tick++){
  stepSession(s,1/60);
  assert.equal(s.phase,'running');
 }
 applyReplayFrame(s,film.frames[0]);
 assert.deepEqual(s.civilians.map(c=>[c.id,c.p.x,c.p.y]),identities);
});
