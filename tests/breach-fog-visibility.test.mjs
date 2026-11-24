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
test('E2.C1 reusable roof IDs match room occupancy and clear stale state',()=>{
 const s=scene([{x:150,y:150},{x:250,y:150}]);
 const ids=new Set(['stale']);
 assert.strictEqual(occupiedFogRooms(s,ids),ids);
 assert.deepEqual([...ids],occupiedFogRooms(s).map(r=>r.id));
 assert.deepEqual([...ids],['A','B']);
 // Room geometry, active life and current position are read on every call.
 s.operators[0].p={x:90,y:150};
 assert.strictEqual(occupiedFogRooms(s,ids),ids);
 assert.deepEqual([...ids],['B']);
 s.operators[1].health=0;
 occupiedFogRooms(s,ids);
 assert.deepEqual([...ids],[]);
 s.site=null;
 occupiedFogRooms(s,ids);
 assert.deepEqual([...ids],[]);
 const three=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(three,/private readonly occupiedRoofRoomIds=new Set<string>\(\)/);
 assert.match(three,/occupiedFogRooms\(s,this\.occupiedRoofRoomIds\)/);
 assert.doesNotMatch(three,/new Set\(occupiedFogRooms\(s\)\.map/);
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
 const fogMeshes=readFileSync(new URL(
  '../src/rendering/breach-fog-mesh-composition.ts',import.meta.url),'utf8');
 assert.match(code,/replaceTacticalFogGeometry\(this\.smoothFog,this\.exteriorKnownFog,site\)/);
 assert.match(fogMeshes,/exteriorKnownFogRects\(site\)/);
 assert.match(fogMeshes,/fogUvAt\(p,bounds\)/);
 assert.match(code,/wallOccludesFriendly/);
 assert.match(code,/resolveWallPresentation/);
 const wallPolicy=readFileSync(new URL('../src/rendering/breach-wall-presentation.ts',import.meta.url),'utf8');
 assert.match(wallPolicy,/transitionWallOpacity/);
 const builder=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
 assert.match(builder,/host\.observedDetails\.push/);
 assert.match(code,/for\(let i=0;i<this\.observedDetails\.length;i\+\+\)/);
 assert.doesNotMatch(code,/roomFogRoofs|overheadFog/);
 assert.match(code,/if\(!omniscient&&!this\.presentationSight\.query\(/);
});

test('E2.C2 shares one selected-squad snapshot across 3D presentation',()=>{
 const three=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const update=three.slice(three.indexOf('  update(s:Session,'),three.indexOf('  update(s:Session,')+40000);
 assert.match(update,/const squad=team\(s\)/);
 assert.match(update,/const selectedActor=squad\.find\(a=>a\.id===selected\)/);
 assert.match(update,/const shadowPoint=selectedActor\?\.p\?\?this\.view\.focus/);
 assert.match(update,/squad\.map\(a=>a\.p\)/);
 assert.match(update,/const selectedEndpoint=selectedActor\?\.plan\.at\(-1\)\?\.p/);
 assert.doesNotMatch(update,/team\(s\)\.find|team\(s\)\.map/);
});
