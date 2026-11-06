import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {captureMissionStart,restoreMissionStartingTeam}
  from '../src/breach-mission-restart.ts';
import {addFavoriteMission,readFavoriteMissions,writeFavoriteMissions,
  removeFavoriteMission,FAVORITE_MISSIONS_LIMIT}
  from '../src/breach-mission-favorites.ts';

test('favorite retains exact resolved site and deployment across JSON storage',()=>{
  const s=newSession(0,34817);
  const start=captureMissionStart(s,'standard','FRONT');
  const favorites=addFavoriteMission([],start,'mission-A','SAVED TEST',17200);
  const restored=readFavoriteMissions(writeFavoriteMissions(favorites));
  assert.equal(restored.length,1);
  assert.equal(restored[0].start.site.seed,s.site.seed);
  assert.deepEqual(restored[0].start.site.rooms,s.site.rooms);
  assert.deepEqual(restored[0].start.squad.map(x=>x.id),
    s.operators.filter(x=>x.side==='blue').map(x=>x.id));
  const next=newSession(restored[0].start.variant,restored[0].start.seed,
    restored[0].start.intelMode,restored[0].start.scale,
    restored[0].start.missionType,restored[0].start.site);
  restoreMissionStartingTeam(next,restored[0].start);
  assert.equal(next.site.seed,s.site.seed);
  assert.deepEqual(next.operators.filter(a=>a.side==='blue')
    .map(a=>a.p),s.operators.filter(a=>a.side==='blue').map(a=>a.p));
});
test('favorite add/replace/delete and quota bounds never corrupt existing entries',()=>{
  const s=newSession(0,33004),start=captureMissionStart(s,'standard');
  let list=[];
  for(let i=0;i<FAVORITE_MISSIONS_LIMIT+2;i++)
    list=addFavoriteMission(list,start,'favorite'+i,'Mission '+i,i);
  assert.equal(list.length,FAVORITE_MISSIONS_LIMIT);
  assert.equal(list[0].id,'favorite2');
  list=addFavoriteMission(list,start,'favorite3','Renamed',35);
  assert.equal(list.filter(v=>v.id==='favorite3').length,1);
  assert.equal(list.at(-1).label,'Renamed');
  assert.equal(removeFavoriteMission(list,'favorite3').length,list.length-1);
  assert.deepEqual(readFavoriteMissions('{bad json'),[]);
  assert.deepEqual(readFavoriteMissions(JSON.stringify([{id:'broken'}])),[]);
});
