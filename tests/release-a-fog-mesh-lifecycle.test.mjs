import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildExteriorKnownFogGeometry,replaceTacticalFogGeometry}
 from '../src/rendering/breach-fog-mesh-composition.ts';
import {fogUvAt,exteriorKnownFogRects} from '../src/breach-fog-domain.ts';

const site=(minX,minY,maxX,maxY)=>({
 bounds:{minX,minY,maxX,maxY},seed:13,
 // U-shaped room modules: display geometry must use one shared footprint,
 // not clip a mesh independently from the fog canvas room classification.
 rooms:[
  {id:'a',x:minX+10,y:minY+10,w:40,h:20},
  {id:'b',x:minX+10,y:minY+30,w:20,h:70},
  {id:'c',x:maxX-30,y:minY+30,w:20,h:70}
 ]
});
const vec=attribute=>Array.from(attribute.array);
test('Release A4: Exterior Known fog geometry follows concealed rooms, not all bounds',()=>{
 const world=site(-85,-40,265,405);
 const rects=exteriorKnownFogRects(world);
 const geometry=buildExteriorKnownFogGeometry(world);
 const positions=geometry.getAttribute('position');
 const uv=geometry.getAttribute('uv');
 assert.equal(positions.count,rects.length*4);
 assert.equal(geometry.getIndex().count,rects.length*6);
 for(let i=0;i<rects.length;i++){
  const r=rects[i];
  const corners=[{x:r.x,y:r.y},{x:r.x,y:r.y+r.h},
   {x:r.x+r.w,y:r.y+r.h},{x:r.x+r.w,y:r.y}];
  for(let j=0;j<4;j++){
   const n=i*4+j,p=corners[j],coords=fogUvAt(p,world.bounds);
   assert.equal(positions.getX(n),p.x);
   assert.equal(positions.getY(n),1.05);
   assert.equal(positions.getZ(n),p.y);
   assert.ok(Math.abs(uv.getX(n)-coords.u)<1e-6);
   assert.ok(Math.abs(uv.getY(n)-coords.v)<1e-6);
  }
 }
 // Neither negative-origin site boundaries nor open exterior can acquire
 // a projected rectangular dark slab from a mesh spanning world.bounds.
 const covered=(x,y)=>rects.some(r=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h);
 assert.equal(covered(world.bounds.minX+1,world.bounds.minY+1),false);
 assert.equal(covered(world.bounds.maxX-1,world.bounds.maxY-1),false);
 assert.equal(covered(world.rooms[0].x+5,world.rooms[0].y+5),true);
 assert.deepEqual(fogUvAt({x:90,y:182.5},world.bounds),{u:.5,v:.5});
 geometry.dispose();
});
test('Release A4: repeated fog site switches dispose old geometry exactly once',()=>{
 const material=new THREE.MeshBasicMaterial();
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
 const exterior=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);
 const oldGround=ground.geometry,oldExterior=exterior.geometry;
 let disposedGround=0,disposedExterior=0;
 oldGround.addEventListener('dispose',()=>disposedGround++);
 oldExterior.addEventListener('dispose',()=>disposedExterior++);
 const bounds=replaceTacticalFogGeometry(ground,exterior,site(-70,-30,520,730));
 assert.deepEqual(bounds,{minX:-70,minY:-30,maxX:520,maxY:730});
 assert.equal(disposedGround,1);
 assert.equal(disposedExterior,1);
 assert.equal(ground.geometry.parameters.width,590);
 assert.equal(ground.geometry.parameters.height,760);
 assert.equal(exterior.geometry.getAttribute('position').count,
  exteriorKnownFogRects(site(-70,-30,520,730)).length*4);
 const previous=exterior.geometry;
 let siteDisposed=0;
 previous.addEventListener('dispose',()=>siteDisposed++);
 replaceTacticalFogGeometry(ground,exterior,null);
 assert.equal(siteDisposed,1);
 assert.equal(exterior.geometry.getAttribute('position').count,0);
 ground.geometry.dispose();exterior.geometry.dispose();material.dispose();
});
test('Release A4: null-site mask has no triangles or stale interior cutouts',()=>{
 const geometry=buildExteriorKnownFogGeometry(null);
 assert.equal(geometry.getAttribute('position').count,0);
 assert.equal(geometry.getIndex().count,0);
 geometry.dispose();
});
