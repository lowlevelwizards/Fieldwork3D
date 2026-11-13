/** C2: structural scene-composition parity; no browser or GPU required. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {generateSite} from '../src/breach-site.ts';
import {buildSiteWorld,finalizeStaticSiteBatches}
 from '../src/rendering/breach-site-scene-builder.ts';
import {composeBreachSiteRender}
 from '../src/rendering/breach-site-render-composition.ts';
import {applyWorldGraphicLighting}
 from '../src/breach-graphic-world-lighting.ts';
import {SiteMaterialLifetime}
 from '../src/rendering/site-material-lifetime.ts';
import {StaticSceneBatches}
 from '../src/rendering/breach-static-batcher.ts';
import {tacticalFogBounds,buildExteriorKnownFogGeometry,
 replaceTacticalFogGeometry}
 from '../src/rendering/breach-fog-mesh-composition.ts';
import {fogUvAt,exteriorKnownFogRects}
 from '../src/breach-fog-domain.ts';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
function harness(){
 const root=new THREE.Group(),mats=[];
 const siteMaterials=new SiteMaterialLifetime();
 const materialCache=new Map(),boxCache=new Map();
 const sharedBoxGeometries=new Set();
 const h={
  root,mats,siteMaterials,staticBatches:new StaticSceneBatches(),
  sharedBoxGeometries,walls:[],doors:new Map(),
  observedDoorOpen:new Map(),observedDoorGlass:new Map(),
  windowGlass:new Map(),architecturalOpenings:[],intelSurfaces:[],
  observedDetails:[],roofGroups:new Map(),roofMaterial:null,
  windowPaneMaterial:null,patinaRoomSurfaces:[],patinaWallSurfaces:[],
  sitePatinaTextures:[],sitePatinaMaterials:[],wallMaterials:new Set(),
  wearMaterials:new Map(),wearTextures:new Map(),wearBoost:1,
  currentWear:[],objectWear:[],coverGroups:new Map(),
  coverVisualStates:new Map(),
  solid(hex,roughness=.9,surface){
   const key=hex+':'+roughness+':'+(surface??'plain');
   let mat=materialCache.get(key);
   if(!mat){
    mat=new THREE.MeshStandardMaterial({color:hex,roughness});
    materialCache.set(key,mat);mats.push(mat);
   }
   return mat;
  },
  box(parent,x,y,z,w,height,d,material,cast=true){
   const key=w+','+height+','+d;
   let geometry=boxCache.get(key);
   if(!geometry){
    geometry=new THREE.BoxGeometry(w,height,d);
    boxCache.set(key,geometry);sharedBoxGeometries.add(geometry);
   }
   const mesh=new THREE.Mesh(geometry,material);
   mesh.position.set(x,y,z);mesh.castShadow=cast;
   mesh.receiveShadow=true;parent.add(mesh);
   return mesh;
  },
  plane(parent,x,z,w,d,y,material){
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);
   mesh.position.set(x,y,z);mesh.rotation.x=-Math.PI/2;
   mesh.receiveShadow=true;parent.add(mesh);return mesh;
  },
  signMaterial(){return new THREE.MeshBasicMaterial({color:0xdde3cc});},
  groundOverlayMaterial(){return new THREE.MeshBasicMaterial({color:0x444444});},
  addSurfaceWear(parent,mark,x,y,z){
   const mesh=new THREE.Mesh(
    new THREE.PlaneGeometry(mark.size,mark.size*.7),
    new THREE.MeshBasicMaterial());
   mesh.position.set(x,y,z);parent.add(mesh);
  }
 };
 return h;
}
function fingerprint(h){
 const meshTypes=[];
 h.root.traverse(node=>{
  if(node instanceof THREE.Mesh)
   meshTypes.push([node.geometry.type,node.material.type,
    node.castShadow,node.receiveShadow,node.visible,
    node instanceof THREE.InstancedMesh?node.count:1]);
 });
 return {
  meshTypes,doorIds:[...h.doors.keys()],
  intel:h.intelSurfaces.map(x=>x.kind+':'+x.index),
  details:h.observedDetails.length,
  walls:h.walls.length,roofIds:[...h.roofGroups.keys()],
  batches:h.staticBatches.stats()
 };
}

test('C2 first-paint generated site matches existing build -> batch -> grade composition',()=>{
 const site=generateSite(17,'small'),snapshot=structuredClone(site);
 const composed=harness(),legacy=harness();
 const result=composeBreachSiteRender(site,composed,true);
 buildSiteWorld(site,legacy);
 finalizeStaticSiteBatches(legacy);
 const oldStyle=applyWorldGraphicLighting(legacy.root);
 assert.equal(result.batched,true);
 assert.equal(result.graphicMaterials,oldStyle.materials);
 assert.deepEqual(fingerprint(composed),fingerprint(legacy));
 assert.deepEqual(site,snapshot,'composition must never mutate the authoritative site');
 assert.ok(composed.staticBatches.stats().original>0,
  'generated scene must exercise actual static instancing');
});

test('C2 legacy fallback remains unbatched; F1 opt-out does not re-grade materials',()=>{
 const legacy=harness();
 const result=composeBreachSiteRender(null,legacy,false);
 assert.equal(result.batched,false);
 assert.equal(result.graphicMaterials,0);
 assert.deepEqual(legacy.staticBatches.stats(),{original:0,instances:0,avoided:0});
 assert.ok(legacy.root.children.length>0);
 const graded=applyWorldGraphicLighting(legacy.root);
 assert.ok(graded.materials>0,'F1 grading remains independently available');
 assert.equal(applyWorldGraphicLighting(legacy.root).materials,0,
  'existing hooks must not be re-applied');
});

test('C2 tactical scene uses one rendering assembly for initial and replacement sites',()=>{
 assert.match(scene,/this\.composeSiteWorld\(this\.displayedSite\)/);
 assert.match(scene,/this\.composeSiteWorld\(site\)/);
 assert.equal((scene.match(/composeBreachSiteRender\(/g)||[]).length,1);
 assert.doesNotMatch(scene,/this\.buildWorld\(/);
 const siteSwap=scene.slice(scene.indexOf('  applySite(site:Site|null){'),
  scene.indexOf('  /** Scene lifecycle owns all resources'));
 assert.match(siteSwap,/this\.staticBatches\.clear\(\)/);
 assert.match(siteSwap,/releaseSiteSceneObjects\(this\.root,/);
 assert.match(siteSwap,/this\.root\.add\(this\.fogUnknown,this\.fogExplored\)/);
 assert.match(scene,/configureGraphicRendererOutput\(this\.renderer\)/);
 assert.match(scene,/applyStudioGraphicLighting\(object\.root,APPROVED_GRAPHIC_LIGHTING\)/);
});

test('C2 exterior-known 3D uses only the shared concealed footprint',()=>{
 const site=generateSite(31,'small');
 const bounds=tacticalFogBounds(site);
 const footprint=exteriorKnownFogRects(site);
 const geom=buildExteriorKnownFogGeometry(site,bounds);
 const pos=geom.getAttribute('position'),uv=geom.getAttribute('uv');
 const indices=geom.getIndex();
 assert.ok(footprint.length>0);
 assert.equal(pos.count,footprint.length*4);
 assert.equal(uv.count,pos.count);
 assert.equal(indices.count,footprint.length*6);
 for(let i=0;i<footprint.length;i++){
  const r=footprint[i];
  const corners=[
   {x:r.x,y:r.y},{x:r.x,y:r.y+r.h},
   {x:r.x+r.w,y:r.y+r.h},{x:r.x+r.w,y:r.y}
  ];
  for(let j=0;j<4;j++){
   const index=i*4+j,p=corners[j],mapped=fogUvAt(p,bounds);
   assert.ok(Math.abs(pos.getX(index)-p.x)<1e-5);
   assert.ok(Math.abs(pos.getY(index)-1.05)<1e-5);
   assert.ok(Math.abs(pos.getZ(index)-p.y)<1e-5);
   assert.ok(Math.abs(uv.getX(index)-mapped.u)<1e-5);
   assert.ok(Math.abs(uv.getY(index)-mapped.v)<1e-5);
  }
  assert.deepEqual(Array.from(indices.array.slice(i*6,i*6+6)),
   [i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3]);
 }
 geom.dispose();
 const empty=buildExteriorKnownFogGeometry(null);
 assert.equal(empty.getAttribute('position').count,0);
 assert.equal(empty.getIndex().count,0);
 empty.dispose();
});

test('C2 U-shaped open court is excluded, indoor modules stay concealed',()=>{
 const site={
  rooms:[
   {id:'N',x:100,y:100,w:240,h:40,kind:'room',tone:0},
   {id:'W',x:100,y:140,w:40,h:180,kind:'room',tone:0},
   {id:'E',x:300,y:140,w:40,h:180,kind:'room',tone:0}
  ],
  bounds:{minX:0,minY:0,maxX:450,maxY:450}
 };
 const geom=buildExteriorKnownFogGeometry(site,site.bounds);
 const pos=geom.getAttribute('position');
 const covered=(x,y)=>{
  for(let i=0;i<pos.count;i+=4){
   const left=Math.min(pos.getX(i),pos.getX(i+2));
   const right=Math.max(pos.getX(i),pos.getX(i+2));
   const top=Math.min(pos.getZ(i),pos.getZ(i+2));
   const bottom=Math.max(pos.getZ(i),pos.getZ(i+2));
   if(x>left&&x<right&&y>top&&y<bottom)return true;
  }
  return false;
 };
 assert.equal(covered(120,120),true);
 assert.equal(covered(120,240),true);
 assert.equal(covered(320,240),true);
 assert.equal(covered(220,230),false,'open court is public exterior');
 assert.equal(covered(390,230),false,'lawn outside building stays uncovered');
 geom.dispose();
});

test('C2 fog geometry swaps release old buffers but preserve material, nodes and render order',()=>{
 const material=new THREE.MeshBasicMaterial({
  transparent:true,depthTest:true,depthWrite:false});
 const smooth=new THREE.Mesh(new THREE.PlaneGeometry(7,9),material);
 const exterior=new THREE.Mesh(new THREE.BufferGeometry(),material);
 smooth.renderOrder=1000;exterior.renderOrder=1000;
 let smoothDisposed=0,exteriorDisposed=0,materialDisposed=0;
 smooth.geometry.addEventListener('dispose',()=>smoothDisposed++);
 exterior.geometry.addEventListener('dispose',()=>exteriorDisposed++);
 material.addEventListener('dispose',()=>materialDisposed++);
 const site=generateSite(23,'small'),bounds=tacticalFogBounds(site);
 assert.deepEqual(replaceTacticalFogGeometry(smooth,exterior,site),bounds);
 assert.equal(smoothDisposed,1);assert.equal(exteriorDisposed,1);
 assert.equal(smooth.position.x,(bounds.minX+bounds.maxX)/2);
 assert.equal(smooth.position.z,(bounds.minY+bounds.maxY)/2);
 assert.equal(smooth.position.y,1.05);
 assert.equal(smooth.material,material);assert.equal(exterior.material,material);
 assert.equal(smooth.renderOrder,1000);assert.equal(exterior.renderOrder,1000);
 assert.equal(materialDisposed,0);
 const firstSmooth=smooth.geometry,firstExterior=exterior.geometry;
 let firstSmoothDisposed=0,firstExteriorDisposed=0;
 firstSmooth.addEventListener('dispose',()=>firstSmoothDisposed++);
 firstExterior.addEventListener('dispose',()=>firstExteriorDisposed++);
 const fallback=tacticalFogBounds(null);
 assert.deepEqual(replaceTacticalFogGeometry(smooth,exterior,null),fallback);
 assert.equal(firstSmoothDisposed,1);assert.equal(firstExteriorDisposed,1);
 assert.equal(materialDisposed,0);
 assert.equal(exterior.geometry.getAttribute('position').count,0);
 smooth.geometry.dispose();exterior.geometry.dispose();material.dispose();
});

test('C2 fog helper is geometry-only, not a second disclosure or simulation owner',()=>{
 const helper=readFileSync(new URL(
  '../src/rendering/breach-fog-mesh-composition.ts',import.meta.url),'utf8');
 // The documentation can name excluded owners. Scan executable source.
 const code=helper.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 assert.doesNotMatch(code,/\bSession\b|\bliveVisibility\b|\bisSeen\b|\bposeOperator\b/);
 assert.doesNotMatch(code,/\bWebGLRenderer\b|\bpaintFogVisibility\b|\brequestAnimationFrame\b/);
 assert.match(scene,/paintFogMemory\(this\.fogMemoryContext,s,this\.fogDiagnostic\)/);
 assert.match(scene,/paintFogVisibility\(this\.fogContext,s\)/);
 assert.match(scene,/this\.fogTexture\.needsUpdate=true/);
});
