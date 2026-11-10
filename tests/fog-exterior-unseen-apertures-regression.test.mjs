import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paintFogMemory,paintFogVisibility,UNKNOWN_FOG_COLOR}
  from '../src/breach-fog-mask.ts';
import {accessibleExteriorWall,exteriorBriefedAt}
  from '../src/breach-site-footprint.ts';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
import {doorBlocksSightRay} from '../src/breach-core.ts';

// Regress the precise case: publicly known windows and garage entrances,
// but no operator has seen any part of the interior.
const warehouse={
 seed:203,rooms:[{id:'warehouse',x:100,y:100,w:240,h:200,
   kind:'room',tone:0}],
 bounds:{minX:0,minY:0,maxX:450,maxY:450},
 windows:[{id:'w',x:100,y:165,width:40,vertical:true}],
 walls:[{a:{x:100,y:100},b:{x:100,y:145}},
        {a:{x:100,y:185},b:{x:100,y:300}}],
 doors:[{id:'loading',a:{x:200,y:100},b:{x:250,y:100},
   open:false,openFraction:0,kind:'shutter'}]
};
function recorder(){
 const calls=[];
 const ctx={
  canvas:{width:450,height:450},
  fillStyle:'',strokeStyle:'',lineWidth:1,filter:'none',
  globalCompositeOperation:'source-over',
  save(){},restore(){},setTransform(){},clearRect(...v){calls.push(['clear',...v]);},
  fillRect(...v){calls.push(['fillRect',this.globalCompositeOperation,this.fillStyle,...v]);},
  beginPath(){calls.push(['beginPath']);},moveTo(){},lineTo(){},closePath(){},
  rect(){},fill(){calls.push(['fill',this.globalCompositeOperation,this.fillStyle]);},
  stroke(){calls.push(['stroke',this.globalCompositeOperation,this.lineWidth]);}
 };
 return {ctx,calls};
}
test('exterior briefing keeps indoor floor concealed with no operator sight',()=>{
 const s={site:warehouse,seenGround:new Set(),doors:warehouse.doors,
   intel:{mode:'exterior-known'},operators:[]};
 const {ctx,calls}=recorder();
 paintFogMemory(ctx,s);
 paintFogVisibility(ctx,s);
 // The known exterior is still erased; every room is then re-covered.
 assert.ok(calls.some(c=>c[0]==='fillRect'&&
   c[1]==='destination-out'));
 assert.ok(calls.some(c=>c[0]==='fillRect'&&c[1]==='source-over'&&
   c[2]===UNKNOWN_FOG_COLOR&&c[3]===100&&c[4]===100&&
   c[5]===240&&c[6]===200));
 // No unconditional 11-unit wall/door/window erase path survives. Those
 // strips previously disclosed floor/shadows even without any teammate.
 assert.equal(calls.filter(c=>c[0]==='stroke').length,0);
 assert.equal(calls.filter(c=>c[0]==='fill'&&
   c[1]==='destination-out').length,0);
});
test('known outside walls and windows are *not* equivalent to floor sight',()=>{
 assert.equal(exteriorBriefedAt(warehouse,{x:88,y:165}),true);
 assert.equal(exteriorBriefedAt(warehouse,{x:111,y:165}),false);
 assert.equal(accessibleExteriorWall(warehouse,warehouse.walls[0]),true);
 const window=warehouse.windows[0];
 assert.equal(accessibleExteriorWall(warehouse,{
   a:{x:window.x,y:window.y-window.width/2},
   b:{x:window.x,y:window.y+window.width/2}}),true);
});
test('a closed garage shutter remains opaque to exterior LOS',()=>{
 const door=warehouse.doors[0];
 assert.equal(doorBlocksSightRay([door],{
   a:{x:225,y:75},b:{x:225,y:130}}),true);
 const closed=visionPolygon({x:225,y:75},Math.PI/2,100,
   [],[door],false,[]);
 const points=closed.slice(1);
 assert.ok(points.some(p=>Math.abs(p.x-225)<.001&&p.y<=100.1));
});
test('3D façade foreground stays while the interior fog no longer has slots',()=>{
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const fog=readFileSync(new URL('../src/breach-fog-mask.ts',import.meta.url),'utf8');
 assert.match(scene,/const knownFacade=wall.exterior/);
 const openings=readFileSync(new URL(
   '../src/rendering/breach-site-openings-builder.ts',import.meta.url),'utf8');
 assert.match(openings,/host\.promoteFacadeDetails\(frame\);/);
 assert.match(openings,/host\.promoteFacadeDetails\(leaf\);/);
 assert.match(openings,/if\(publicWindow\)\{[\s\S]*?host\.promoteFacadeDetails\(group\)/);
 assert.match(openings,/publicWindow=!opening\.interior&&accessibleExteriorWall\(site,edge\)/);
 assert.match(scene,/this\.exteriorKnownFog\.visible=clippedExteriorFog/);
 assert.doesNotMatch(fog,/ctx\.lineWidth=11|ctx\.stroke\(\)/);
});
