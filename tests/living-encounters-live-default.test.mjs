import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');

test('LE-live: ordinary Quick Play/Campaign defaults civilians on, retains URL opt-out',()=>{
 assert.match(main,/const civilianPreview=startupParams\.get\('civilians'\)!=='0'/);
 assert.equal((main.match(/enableCivilians:civilianPreview/g)??[]).length,2);
 assert.match(main,/enableIncidentIntent:true/);
});

test('LE-live: real seeded encounter generates neutral actors without adding hostiles',()=>{
 try{
  const live=newSession(0,11,'floor-plan','small','clear',undefined,
    {enableCivilians:true,enableIncidentIntent:true});
  assert.ok(live.civilians.length>0,'seed 11 house has authored neutral population');
  assert.equal(live.civilians.length,live.site?.encounter?.neutrals?.length);
  assert.ok(live.civilians.every(c=>c.id.startsWith('civ:')&&!c.rescueTarget));
  const without=newSession(0,11,'floor-plan','small','clear',undefined,
    {enableCivilians:false,enableIncidentIntent:true});
  assert.equal(without.civilians.length,0);
  assert.deepEqual(live.site?.enemies,without.site?.enemies,
    'neutral opt-out must not reroll hostiles');
 }finally{activateSite(null);}
});

test('LE-live: rescue uses exactly one physical target and no extra neutral duplicates',()=>{
 try{
  const s=newSession(0,13,'floor-plan','small','rescue',undefined,
    {enableCivilians:true,enableIncidentIntent:true});
  assert.equal(s.civilians.filter(c=>c.rescueTarget).length,1);
  assert.equal(s.civilians.length,1);
  assert.ok(s.rescue);
  assert.equal(s.rescue?.p.x,s.civilians[0].p.x);
  assert.equal(s.rescue?.p.y,s.civilians[0].p.y);
 }finally{activateSite(null);}
});
