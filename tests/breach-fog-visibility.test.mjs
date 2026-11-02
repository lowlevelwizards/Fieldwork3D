import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {occupiedFogRooms,paintFogMask} from '../src/breach-fog-mask.ts';
const room=(id,x)=>({id,x,y:100,w:100,h:120,kind:'room',tone:0});
const scene=(friends)=>({
 site:{rooms:[room('A',100),room('B',200)]},
 operators:[...friends.map((p,i)=>({id:'blue'+i,side:'blue',health:p.health??2,
   p:{x:p.x,y:p.y},heading:p.heading??0})),
   {id:'guard',side:'red',health:2,p:{x:250,y:150}}],
 intel:{mode:'true-blind'},seenGround:new Set(),doors:[]
});
test('occupied rooms are tracked for roof cutaways, never fog clearing',()=>{
 const s=scene([{x:150,y:150}]);
 assert.deepEqual(occupiedFogRooms(s).map(r=>r.id),['A']);
 assert.deepEqual(occupiedFogRooms(scene([{x:150,y:150,health:0}])),[]);
 assert.deepEqual(occupiedFogRooms(scene([{x:90,y:150}])),[]);
});
test('fog mask clears directional polygons, not complete occupied rooms',()=>{
 const s=scene([{x:150,y:150}]);
 const calls=[],ctx={
  canvas:{width:320,height:370},
  save(){},restore(){},setTransform(){},clearRect(){},
  beginPath(){calls.push('begin')},moveTo(){},lineTo(){},closePath(){},rect(){},
  fill(){calls.push('polygon')},fillRect(){calls.push('rect')},
  filter:'none',fillStyle:'#000',globalCompositeOperation:'source-over'
 };
 paintFogMask(ctx,s);
 assert.ok(calls.includes('polygon'));
 const fog=readFileSync(new URL('../src/breach-fog-mask.ts',import.meta.url),'utf8');
 assert.doesNotMatch(fog,/export function paintOccupiedRoomContext/);
 const three=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.doesNotMatch(three,/paintOccupiedRoomContext/);
});
test('3D fog stays ground-aligned and hides unobserved object details',()=>{
 const code=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(code,/this\.smoothFog\.renderOrder=1000;/);
 assert.match(code,/this\.exteriorKnownFog\.visible=clippedExteriorFog;/);
 assert.match(code,/exteriorKnownFogRects\(site\)/);
 assert.match(code,/wallOccludesFriendly/);
 assert.match(code,/transitionWallOpacity/);
 assert.match(code,/this\.observedDetails\.push/);
 assert.doesNotMatch(code,/roomFogRoofs|overheadFog/);
 assert.match(code,/if\(!omniscient&&!liveVisibility\(s,mark\.p\)\)continue;/);
});
