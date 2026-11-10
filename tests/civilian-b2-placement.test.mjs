import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,enemies,team} from '../src/breach-game.ts';
import {planCivilians,civilianBudget}
  from '../src/worldgen/encounter-civilians.ts';
import {clearOfInsertion,roomOccupancyCapacity}
  from '../src/worldgen/encounter-spawn-safety.ts';
test('E5-B2 generated neutrals are seeded, bounded and never armed',()=>{
 let nonzero=0;
 for(const seed of [6,11,17,22,31,43,56,73,84,101]){
  const site=generateSite(seed,'small',undefined,
    {seed,mission:'intel',premise:'routine',risk:1});
  const a=site.encounter.neutrals??[];
  const expected=civilianBudget(site,seed,site.encounter.premise,
    site.encounter.mission);
  assert.ok(site.encounter.diagnostics.notes.includes(
    'civilian population: requested '+expected+', placed '+a.length));
  if(expected>0&&!a.length)assert.ok(
    site.encounter.diagnostics.notes.some(n=>n.includes(
      'no civilian placement met physical clearance')));
  const b=planCivilians(site,site.encounter.actors,seed,
    site.encounter.premise,site.encounter.mission);
  assert.deepEqual(a,b);
  assert.ok(a.length<=2);
  if(a.length)nonzero++;
  assert.equal(new Set(a.map(n=>n.id)).size,a.length);
  for(const civ of a){
   assert.equal('weaponProfile' in civ,false);
   assert.equal(civ.id.startsWith('civ:'),true);
   assert.ok(clearOfInsertion(site,civ.position));
   const room=site.rooms.find(r=>r.id===civ.roomId);
   assert.ok(room);
   assert.ok(civ.position.x>=room.x+22&&civ.position.x<=room.x+room.w-22);
   assert.ok(civ.position.y>=room.y+22&&civ.position.y<=room.y+room.h-22);
   assert.ok(site.encounter.actors.every(h=>
    Math.hypot(h.position.x-civ.position.x,h.position.y-civ.position.y)>=43));
   const occupants=a.filter(p=>p.roomId===room.id).length+
    site.encounter.actors.filter(h=>h.roomId===room.id).length;
   assert.ok(occupants<=roomOccupancyCapacity(room,site.cover));
  }
 }
 assert.ok(nonzero>0,'some furnished sites should have occupants');
});
test('E5-B2 civilians remain opt-in and cannot alter hostile count',()=>{
 const site=generateSite(17,'small',undefined,
  {seed:17,mission:'intel',premise:'routine'});
 const off=newSession(0,17,'floor-plan','small','intel',site);
 const on=newSession(0,17,'floor-plan','small','intel',site,
  {enableCivilians:true});
 assert.equal(off.civilians.length,0);
 assert.equal(on.civilians.length,site.encounter.neutrals?.length??0);
 assert.equal(enemies(off).length,enemies(on).length);
 assert.equal(team(off).length,team(on).length);
});
test('E5-B2 vacant, defended, and rescue pre-migration do not duplicate targets',()=>{
 const site=generateSite(17,'small',undefined,
  {seed:17,mission:'rescue',premise:'routine'});
 assert.deepEqual(site.encounter.neutrals,[]);
 for(const premise of ['vacant','defensive','after-hours']){
  assert.equal(civilianBudget(site,3,premise,'intel'),0);
 }
});

test('E5 civilian presence: active occupied sites have an encounter floor, not guaranteed placement',()=>{
 const site={training:false,scale:'small',
  identity:{activity:'normal',condition:'occupied'}};
 const activePremises=['routine','disturbance','incident'];
 for(const premise of activePremises)for(let seed=1;seed<=48;seed++){
  assert.ok(civilianBudget(site,seed,premise,'clear')>=1,
   'occupied '+premise+' seed '+seed+' should request at least one bystander');
  assert.ok(civilianBudget(site,seed,premise,'clear')<=2);
 }
 const busy={...site,identity:{...site.identity,activity:'busy'}};
 for(let seed=1;seed<=48;seed++)
  assert.ok(civilianBudget(busy,seed,'guarded','clear')>=1);
 const quiet={...site,identity:{...site.identity,activity:'quiet'}};
 assert.ok(Array.from({length:48},(_,i)=>
  civilianBudget(quiet,i+1,'routine','clear')).some(n=>n===0),
  'quiet occupied premises may still be empty');
 const vacant={...site,identity:{...site.identity,condition:'vacant'}};
 assert.ok(Array.from({length:48},(_,i)=>
  civilianBudget(vacant,i+1,'routine','clear')).some(n=>n===0),
  'vacant condition must not imply civilian presence');
 for(const premise of ['vacant','defensive','after-hours'])
  assert.equal(civilianBudget(site,17,premise,'clear'),0);
 assert.equal(civilianBudget(site,17,'routine','rescue'),0);
 assert.equal(civilianBudget({...site,training:true},17,'routine','clear'),0);
});
