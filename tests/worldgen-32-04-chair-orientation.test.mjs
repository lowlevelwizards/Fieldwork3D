import test from 'node:test';
import assert from 'node:assert/strict';
import {orientFurnishings} from '../src/worldgen/prop-orientation.ts';
import {newSession} from '../src/breach-game.ts';
import {generateSite} from '../src/breach-site.ts';
const room=(purpose='office')=>({id:'R',kind:'room',purpose,
 x:0,y:0,w:220,h:230,tone:0});
test('an office chair faces a nearby work surface and keeps its rear approach clear',()=>{
 const site={rooms:[room()],doors:[]};
 const furniture=[
  {fixture:'office-chair',x:110,y:125,w:23,h:20},
  {fixture:'desk',x:110,y:90,w:70,h:40}
 ];
 const arranged=orientFurnishings(site,furniture);
 assert.equal(arranged[0].orientation,2,
  'seat should face the desk to its north instead of an empty wall');
});
test('a dining chair faces its table without requiring a front-side walkway',()=>{
 const site={rooms:[room('dining')],doors:[]};
 const arranged=orientFurnishings(site,[
  {fixture:'chair',x:110,y:125,w:23,h:20},
  {fixture:'dining-table',x:110,y:90,w:70,h:40}
 ]);
 assert.equal(arranged[0].orientation,2);
});
test('newSession live site generation matches the Map Lab authoritative pipeline',()=>{
 const seed=8,expected=generateSite(seed,'small');
 const quick=newSession(0,seed,'floor-plan','small');
 const mission=newSession(0,seed,'floor-plan','small','rescue');
 assert.deepEqual(quick.site?.doors,expected.doors);
 assert.deepEqual(quick.site?.cover,expected.cover);
 assert.deepEqual(mission.site?.doors,expected.doors);
 assert.deepEqual(mission.site?.cover,expected.cover);
 assert.equal(mission.missionType,'rescue');
});
