import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planWallSurface,selectWallEvents,wallSurfacePixels,bakedWallSurfacePixels,packedWallSurfacePixels,wallPackedFaceStart,WALL_PACKED_FACE_ROWS,WALL_EFFECTS} from '../src/worldgen/wall-surface-recipe.ts';
import {mapPackedWallUV,boxFaceVertexRanges} from '../src/rendering/pixel-materials.ts';
import {applyWallMaterialState} from '../src/rendering/breach-wall-presentation.ts';
const site={seed:23,archetype:'house',condition:'renovation',conditionLevel:100,
 walls:[{a:{x:0,y:0},b:{x:120,y:0}}],doors:[{id:'entry',a:{x:-20,y:0},b:{x:0,y:0}}],
 windows:[{id:'sill',x:60,y:0,width:20,vertical:false,sillHeight:24}],
 rooms:[{id:'r',x:-10,y:0,w:140,h:100,purpose:'bathroom',kind:'room'}],cover:[]};
const recipe=()=>planWallSurface(site,0,56);
const coverage=p=>p.filter((_,i)=>i%4===3&&p[i]>0).length;
test('physical anchors, exterior side and deterministic recipe',()=>{
 const r=recipe();
 assert.deepEqual(r,recipe());
 assert.equal(r.face,-1);
 assert.equal(r.events.find(e=>e.kind==='contact').cause,'door:entry');
 const runoff=r.events.find(e=>e.kind==='runoff');
 assert.equal(runoff.cause,'sill:sill');
 assert.equal(runoff.x,60);
 assert.ok(runoff.y-runoff.height/2>=56-24);
 assert.ok(r.events.every(e=>e.x>=0&&e.x<=r.length&&e.y>=0&&e.y<=r.height));
 const dry={...site,doors:[],windows:[],rooms:[{...site.rooms[0],purpose:'office'},{...site.rooms[0],y:-100,purpose:'office'}]};
 const d=planWallSurface(dry,0,56);
 assert.ok(!d.events.some(e=>['damp','runoff','fade','contact'].includes(e.kind)));
});
test('condition thresholds, isolated effects, fixed placement and bounded coverage',()=>{
 const r=recipe();
 for(const level of [0,25,50,75,100]){
  const events=selectWallEvents(r,level);
  assert.ok(events.length<=(level===0?0:level/25));
  assert.ok(events.every(e=>e.threshold<=level&&r.events.includes(e)));
 }
 const clean=wallSurfacePixels(r,0,128,64);
 assert.equal(clean.length,128*64*4);
 assert.equal(coverage(clean),0);
 assert.equal(coverage(wallSurfacePixels(r,100,128,64,'none')),0);
 const mask=wallSurfacePixels(r,100,128,64);
 assert.deepEqual(mask,wallSurfacePixels(r,100,128,64));
 assert.ok(coverage(mask)>0&&coverage(mask)<128*64*.5);
 for(const kind of WALL_EFFECTS){
  const p=wallSurfacePixels(r,100,128,64,kind);
  assert.equal(coverage(p)>0,r.events.some(e=>e.kind===kind));
 }
 const drip=wallSurfacePixels(r,100,128,64,'runoff');
 assert.ok(coverage(drip)>0);
 assert.ok(drip.slice(0,Math.floor(64*(56-24)/56)*128*4).every(x=>x===0),'runoff above sill');
});
test('baked finish preserves clean base color and structural alpha',()=>{
 const r=recipe(),plain=bakedWallSurfacePixels(r,0,128,64,'all',false);
 const base=[r.color>>16&255,r.color>>8&255,r.color&255,255];
 for(let i=0;i<plain.length;i+=4)assert.deepEqual([...plain.slice(i,i+4)],base);
 const aged=bakedWallSurfacePixels(r,100,128,64,'all',false);
 assert.notDeepEqual(aged,plain);
 assert.ok(aged.every((v,i)=>i%4!==3||v===255));
 assert.deepEqual(aged,bakedWallSurfacePixels(r,100,128,64,'all',false));
 assert.notDeepEqual(bakedWallSurfacePixels({...r,surface:'cinderblock'},0,128,64),plain);
});
test('packed standard map stays bounded, isolates faces and maps crown to top rows',()=>{
 const r=recipe(),width=128,stride=width*4;
 const clean=packedWallSurfacePixels(r,0,width,'all',false);
 const aged=packedWallSurfacePixels(r,100,width,'all',false);
 assert.equal(aged.length,width*64*4);
 assert.ok(aged.every((v,i)=>i%4!==3||v===255));
 const start=wallPackedFaceStart(r.face),other=wallPackedFaceStart(-r.face);
 assert.notDeepEqual(aged.slice(start*stride,(start+WALL_PACKED_FACE_ROWS)*stride),clean.slice(start*stride,(start+WALL_PACKED_FACE_ROWS)*stride));
 assert.deepEqual(aged.slice((other-1)*stride,(other+WALL_PACKED_FACE_ROWS+1)*stride),clean.slice((other-1)*stride,(other+WALL_PACKED_FACE_ROWS+1)*stride));
 assert.deepEqual(aged.slice((start-1)*stride,start*stride),aged.slice(start*stride,(start+1)*stride));
 assert.deepEqual(aged.slice((start+WALL_PACKED_FACE_ROWS)*stride,(start+WALL_PACKED_FACE_ROWS+1)*stride),aged.slice((start+WALL_PACKED_FACE_ROWS-1)*stride,(start+WALL_PACKED_FACE_ROWS)*stride));
 const g=new THREE.BoxGeometry(120,56,9);
 const positions=g.getAttribute('position').array.slice();
 mapPackedWallUV(g);
 assert.deepEqual(g.getAttribute('position').array,positions);
 const uv=g.getAttribute('uv'),pos=g.getAttribute('position');
 for(const [face,{start,count}] of boxFaceVertexRanges(g).entries())for(let i=start;i<start+count;i++){
  if(face<4){assert.equal(uv.getY(i),.5/64);continue;}
  assert.equal(uv.getX(i),pos.getX(i)>0?1:0);
  const expected=(wallPackedFaceStart(face===4?1:-1)+.5+(pos.getY(i)>0?0:28))/64;
  assert.equal(uv.getY(i),expected);
 }
 g.dispose();
});
test('standard material preserves W1 structural opacity and depth independent of surface pixels',()=>{
 const a=new THREE.MeshStandardMaterial({map:new THREE.DataTexture(packedWallSurfacePixels(recipe(),100,128),128,64)});
 applyWallMaterialState(a,{transparent:true,depthWrite:false,opacity:.38});
 assert.equal(a.opacity,.38);assert.equal(a.depthWrite,false);
 applyWallMaterialState(a,{transparent:true,depthWrite:true,opacity:1});
 assert.equal(a.depthWrite,true);assert.equal(a.opacity,1);
});
test('industrial finish has bold mortar and coherent lower band',()=>{
 const r={...recipe(),surface:'cinderblock',band:{top:38,color:0x52766d}};
 const pixels=bakedWallSurfacePixels(r,0,128,29);
 const colors=new Set();
 for(let i=0;i<pixels.length;i+=4)colors.add(pixels.slice(i,i+3).join(','));
 assert.ok(colors.size>=4,'Material structure or lower band missing');
 assert.notDeepEqual(pixels,bakedWallSurfacePixels({...r,band:undefined},0,128,29));
});
