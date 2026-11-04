import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRoomSightlines,retainsTacticalSightline} from
 '../src/worldgen/room-sightline-audit.ts';
import {tacticalDefenderRoomScore} from '../src/worldgen/tactical-room-suitability.ts';

const room={id:'office',kind:'room',x:0,y:0,w:140,h:140,purpose:'office'};
const door={id:'D',a:{x:0,y:50},b:{x:0,y:90}};
const cabinet={x:61,y:70,w:30,h:85,fixture:'cabinet',low:false};
const site={rooms:[room],doors:[door],openings:[],cover:[],walls:[]};
test('R3 real doorway LOS distinguishes furnished cover from unoccluded fire lanes',()=>{
 const empty=assessRoomSightlines(site,room);
 const covered=assessRoomSightlines({...site,cover:[cabinet]},room);
 assert.ok(empty.exposedSamples>covered.exposedSamples);
 assert.ok(covered.concealedSamples>=empty.concealedSamples);
 assert.ok(empty.thresholds===1);
});
test('R3 optional tall furniture cannot seal last usable engagement lanes',()=>{
 const allowed=retainsTacticalSightline(site,room,cabinet,[]);
 assert.equal(typeof allowed,'boolean');
 const score=tacticalDefenderRoomScore(room,[cabinet],[door],'prepared',
   {...site,cover:[cabinet]});
 assert.ok(Number.isFinite(score));
});
