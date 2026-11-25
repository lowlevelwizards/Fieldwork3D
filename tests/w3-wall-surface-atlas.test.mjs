import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planWallFaces,atlasWallStrip,atlasFaceStart,ATLAS_FACE_ROWS} from '../src/worldgen/wall-surface-recipe.ts';
import {planAtlasPages,buildWallAtlas,updateWallAtlas} from '../src/rendering/wall-surface-atlas.ts';
import {wallPatinaDimensions} from '../src/worldgen/condition-wall.ts';
import {mapAtlasWallUV,boxFaceVertexRanges} from '../src/rendering/pixel-materials.ts';
const site={seed:23,archetype:'house',condition:'renovation',conditionLevel:100,
 walls:Array.from({length:19},(_,i)=>({a:{x:0,y:i*200},b:{x:120+(i%3)*64,y:i*200}})),
 doors:[{id:'entry',a:{x:-20,y:0},b:{x:0,y:0}}],
 windows:[{id:'sill',x:60,y:0,width:20,vertical:false,sillHeight:24}],
 rooms:[{id:'r',x:-10,y:0,w:400,h:100,purpose:'bathroom',kind:'room'}],cover:[]};
test('interior wet-room finish and exterior siding are independent physical faces',()=>{
 const p=planWallFaces(site,0,56);
 assert.equal(p.front.surface,'tile');assert.equal(p.back.surface,'siding');
 assert.equal(p.front.face,1);assert.equal(p.back.face,-1);
 assert.ok(p.back.events.some(e=>e.kind==='runoff'));
 assert.ok(!p.front.events.some(e=>e.kind==='runoff'||e.kind==='fade'));
 assert.deepEqual(p,planWallFaces(site,0,56));
 const strip=atlasWallStrip(p,100,128);
 assert.equal(strip.length,128*64*4);
 assert.ok(strip.every((v,i)=>i%4!==3||v===255));
 for(const recipe of [p.front,p.back]){
  const start=atlasFaceStart(recipe.face),stride=128*4,end=start+ATLAS_FACE_ROWS;
  assert.deepEqual(strip.slice((start-1)*stride,start*stride),strip.slice(start*stride,(start+1)*stride));
  assert.deepEqual(strip.slice(end*stride,(end+1)*stride),strip.slice((end-1)*stride,end*stride));
 }
});
test('power-of-two pages use exactly the old byte budget and allocate no unused strips',()=>{
 const widths=Array.from({length:103},(_,index)=>({index,width:[64,128,256][index%3]}));
 const p=planAtlasPages(widths);
 assert.deepEqual(p.flatMap(x=>x.indices).sort((a,b)=>a-b),widths.map(x=>x.index));
 assert.ok(p.every(x=>x.indices.length<=32&&(x.indices.length&(x.indices.length-1))===0));
 assert.equal(p.reduce((n,x)=>n+x.width*x.indices.length*64*4,0),widths.reduce((n,x)=>n+x.width*64*4,0));
 assert.ok(p.length<widths.length/4);
});
test('atlas texture ownership and condition roundtrip preserve page IDs and upload once per page',()=>{
 const atlas=buildWallAtlas(site,56,100,'all',true);
 assert.equal(atlas.slots.size,site.walls.length);
 assert.ok(atlas.pages.length<site.walls.length);
 assert.equal(atlas.pages.reduce((n,t)=>n+t.image.data.byteLength,0),site.walls.reduce((n,w)=>n+wallPatinaDimensions(Math.hypot(w.b.x-w.a.x,w.b.y-w.a.y)).width*64*4,0));
 const snapshots=atlas.pages.map(t=>t.image.data.slice()),versions=atlas.pages.map(t=>t.version);
 assert.equal(updateWallAtlas(atlas.slots.values(),0,'all'),atlas.pages.length);
 assert.ok(atlas.pages.some((t,i)=>t.image.data.some((v,j)=>v!==snapshots[i][j])));
 atlas.pages.forEach((t,i)=>assert.equal(t.version,versions[i]+1));
 updateWallAtlas(atlas.slots.values(),100,'all');
 atlas.pages.forEach((t,i)=>{assert.deepEqual(t.image.data,snapshots[i]);assert.equal(t.version,versions[i]+2);t.dispose();});
});
test('atlas UV maps existing wall geometry to its own strip, never neighboring strips',()=>{
 const g=new THREE.BoxGeometry(120,56,9),positions=g.getAttribute('position').array.slice(),indices=g.index.array.slice();
 mapAtlasWallUV(g,64,256);
 assert.deepEqual(g.getAttribute('position').array,positions);assert.deepEqual(g.index.array,indices);
 const uv=g.getAttribute('uv'),pos=g.getAttribute('position');
 for(const [face,{start,count}] of boxFaceVertexRanges(g).entries())for(let i=start;i<start+count;i++){
  assert.ok(uv.getY(i)>64/256&&uv.getY(i)<128/256);
  if(face<4){assert.equal(uv.getY(i),64.5/256);continue;}
  assert.equal(uv.getX(i),pos.getX(i)>0?1:0);
  assert.equal(uv.getY(i),(64+atlasFaceStart(face===4?1:-1)+.5+(pos.getY(i)>0?0:23))/256);
 }
 g.dispose();
});

test('moss requires wet exposed mineral beside planting, rust requires exterior panel seam',()=>{
 const garden={id:'garden',kind:'garden',x:0,y:-60,w:180,h:60};
 const sample=Array.from({length:100},(_,seed)=>({...site,seed,archetype:'townhouse',exteriorZones:[garden]}));
 const damp=sample.find(s=>planWallFaces(s,0,56).back.events.some(e=>e.kind==='moss'));
 assert.ok(damp,'Moss never authored for eligible planted foundation');
 const p=planWallFaces(damp,0,56);
 assert.ok(p.back.events.some(e=>e.kind==='damp'));
 assert.ok(!p.front.events.some(e=>e.kind==='moss'));
 assert.ok(!planWallFaces({...damp,exteriorZones:[]},0,56).back.events.some(e=>e.kind==='moss'));
 assert.ok(!planWallFaces({...damp,archetype:'house'},0,56).back.events.some(e=>e.kind==='moss'));
 const industrial=sample.map(s=>({...s,archetype:'warehouse'})).find(s=>planWallFaces(s,0,56).back.events.some(e=>e.kind==='rust'));
 assert.ok(industrial,'No eligible panel corrosion');
 const pair=planWallFaces(industrial,0,56),rust=pair.back.events.find(e=>e.kind==='rust');
 assert.equal(rust.x%24,0);assert.ok(rust.cause.startsWith('panel-seam:'));
 assert.ok(!pair.front.events.some(e=>e.kind==='rust'));
 for(const [s,kind] of [[damp,'moss'],[industrial,'rust']]){
  const pair=planWallFaces(s,0,56);
  assert.notDeepEqual(atlasWallStrip(pair,100,128,kind),atlasWallStrip(pair,100,128,'none'));
  assert.deepEqual(atlasWallStrip(pair,0,128,kind),atlasWallStrip(pair,0,128,'none'));
 }
});

test('W3 doorway wear is visibly wider than W2 without changing clean finish or creating unanchored marks',()=>{
 const r=planWallFaces(site,0,56).front,contact=r.events.find(e=>e.kind==='contact');
 assert.ok(r.directional);assert.equal(contact.cause,'door:entry');assert.ok(contact.width>=24&&contact.height>=13);
 const strip=atlasWallStrip(planWallFaces(site,0,56),100,128,'contact');
 const clean=atlasWallStrip(planWallFaces(site,0,56),0,128,'contact');
 const count=strip.reduce((n,v,i)=>n+(i%4===0&&(v!==clean[i]||strip[i+1]!==clean[i+1]||strip[i+2]!==clean[i+2])?1:0),0);
 assert.ok(count>=20&&count<128*64*.20,'Contact wear should read as a localized mark');
 assert.deepEqual(atlasWallStrip(planWallFaces(site,0,56),0,128,'all'),clean);
});
