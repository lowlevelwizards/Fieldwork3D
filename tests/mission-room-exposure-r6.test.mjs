import test from 'node:test';
import assert from 'node:assert/strict';
import {engagementRoomRelevant,tacticalFurnishingValue,
 assessRoomSightlines} from '../src/worldgen/room-sightline-audit.ts';

const room={id:'lobby',kind:'room',purpose:'lobby',x:0,y:0,w:160,h:160};
const door={id:'front',a:{x:0,y:60},b:{x:0,y:100}};
const site={rooms:[room],doors:[door],openings:[],walls:[],cover:[]};
const tall=(x,y)=>({x,y,w:27,h:42,fixture:'bookcase',low:false});

test('R6: tiny service spaces do not inflate engagement risk',()=>{
 assert.equal(engagementRoomRelevant(room),true);
 assert.equal(engagementRoomRelevant({...room,purpose:'bathroom'}),false);
 assert.equal(engagementRoomRelevant({...room,w:88}),false);
 assert.equal(engagementRoomRelevant({...room,kind:'hall'}),false);
});
test('R6: legal optional cabinet placement respects actual lines',()=>{
 const baseline=assessRoomSightlines(site,room);
 assert.ok(baseline.exposedFraction>.85);
 const central=tacticalFurnishingValue(site,room,tall(65,80),[]);
 const side=tacticalFurnishingValue(site,room,tall(135,80),[]);
 assert.ok(central>=side,'the better opening interruption should win');
 assert.equal(tacticalFurnishingValue(site,{...room,purpose:'bathroom'},
   tall(65,80),[]),0);
});
test('R6: low cover does not become an opaque vision blocker',()=>{
 assert.equal(tacticalFurnishingValue(site,room,{
  ...tall(65,80),low:true},[]),0);
});
