import test from 'node:test';
import assert from 'node:assert/strict';
import {auditEncounter} from '../src/worldgen/encounter-diagnostics.ts';
test('encounter audit measures empty, occupied, and clustered zones',()=>{
 const site={entrance:{x:0,y:0},rooms:[
  {id:'a',kind:'room',x:0,y:0,w:100,h:100,zoneId:'x'},
  {id:'b',kind:'room',x:100,y:0,w:100,h:100,zoneId:'y'}],
  enemies:[],encounter:{actors:[
  {position:{x:40,y:40},role:'sentry',groupId:'g'},
  {position:{x:60,y:40},role:'lookout',groupId:'g'}]}};
 const audit=auditEncounter(site);
 assert.equal(audit.hostiles,2);assert.equal(audit.groups,1);
 assert.equal(audit.occupiedZones,1);assert.equal(audit.emptyZones,1);
 assert.equal(audit.closestPair,20);assert.equal(audit.roles.lookout,1);
});
