import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('connected multi-piece rooms share floor tones and meet at seams',()=>{
 const site=compileArchitecturalSite('house',1);
 const zones=new Map();
 for(const room of site.rooms){
  if(!zones.has(room.zoneId))zones.set(room.zoneId,[]);
  zones.get(room.zoneId).push(room);
 }
 let multi=0;
 for(const rooms of zones.values()){
  if(rooms.length<2)continue;
  multi++;
  assert.ok(rooms.every(r=>r.tone===rooms[0].tone),'connected floor palette must match');
 }
 assert.ok(multi>=1);
 const renderer=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(renderer,/site\.programLocked\?0:2/);
 assert.match(renderer,/room\.w-floorInset/);
});
