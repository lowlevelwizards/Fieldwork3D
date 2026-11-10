/** Roadmap 2 / Stage 6: actual Three.js construction, not snapshots of
 * source regexes alone. No WebGL renderer or browser is required.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {generateSite} from '../src/breach-site.ts';
import {activateSite} from '../src/breach-core.ts';
import {SiteMaterialLifetime} from '../src/rendering/site-material-lifetime.ts';
import {StaticSceneBatches} from '../src/rendering/breach-static-batcher.ts';
import {buildSiteWorld,finalizeStaticSiteBatches}
 from '../src/rendering/breach-site-scene-builder.ts';

function harness(){
 const root=new THREE.Group(),mats=[],siteMaterials=new SiteMaterialLifetime();
 const solidCache=new Map();
 const sharedBoxGeometries=new Set();
 const h={
  root,mats,siteMaterials,
  staticBatches:new StaticSceneBatches(),sharedBoxGeometries,
  walls:[],doors:new Map(),observedDoorOpen:new Map(),
  observedDoorGlass:new Map(),windowGlass:new Map(),
  architecturalOpenings:[],intelSurfaces:[],observedDetails:[],
  roofGroups:new Map(),roofMaterial:null,windowPaneMaterial:null,
  patinaRoomSurfaces:[],patinaWallSurfaces:[],
  sitePatinaTextures:[],sitePatinaMaterials:[],
  wallMaterials:new Set(),wearMaterials:new Map(),wearTextures:new Map(),
  wearBoost:1,currentWear:[],objectWear:[],
  coverGroups:new Map(),coverVisualStates:new Map(),
  solid(hex,roughness=.9,surface){
   const key=hex+':'+roughness+':'+(surface??'plain');
   if(!solidCache.has(key)) {
    const mat=new THREE.MeshStandardMaterial({color:hex,roughness});
    solidCache.set(key,mat);mats.push(mat);
   }
   return solidCache.get(key);
  },
  box(parent,x,y,z,w,height,d,material,cast=true){
   assert.ok([x,y,z,w,height,d].every(Number.isFinite));
   assert.ok(w>0&&height>0&&d>0,'boxes must have physical size');
   const geometry=new THREE.BoxGeometry(w,height,d);
   const mesh=new THREE.Mesh(geometry,material);
   mesh.position.set(x,y,z);mesh.castShadow=cast;
   mesh.receiveShadow=true;parent.add(mesh);
   return mesh;
  },
  plane(parent,x,z,w,d,y,material){
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material);
   mesh.position.set(x,y,z);mesh.rotation.x=-Math.PI/2;
   mesh.receiveShadow=true;parent.add(mesh);
   return mesh;
  },
  signMaterial(){return new THREE.MeshBasicMaterial({color:0xdde3cc});},
  groundOverlayMaterial(){return new THREE.MeshBasicMaterial({color:0x444444});},
  addSurfaceWear(parent,mark,x,y,z,surface){
   assert.ok(parent instanceof THREE.Object3D);
   assert.ok(Number.isFinite(mark.size));assert.equal(typeof surface,'string');
   const mesh=new THREE.Mesh(new THREE.PlaneGeometry(mark.size,mark.size*.7),
    new THREE.MeshBasicMaterial());
   mesh.position.set(x,y,z);parent.add(mesh);
  }
 };
 return h;
}
function fingerprint(h){
 const transforms=[];
 h.root.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  const p=node.position,r=node.rotation;
  const round=n=>Number(n.toFixed(3));
  transforms.push([
   node.geometry.type,
   ...[p.x,p.y,p.z,r.x,r.y,r.z].map(round),
   node instanceof THREE.InstancedMesh?node.count:1,
   !!node.castShadow
  ]);
 });
 return {
  transforms,
  wallCount:h.walls.length,
  wallIndices:h.walls.map(w=>w.index),
  roofIds:[...h.roofGroups.keys()].sort(),
  doorIds:[...h.doors.keys()].sort(),
  glassIds:[...h.windowGlass.keys()].sort(),
  coverIndices:[...h.coverGroups.keys()].sort((a,b)=>a-b),
  intel:h.intelSurfaces.map(x=>x.kind+':'+x.index),
  patina:[h.patinaRoomSurfaces.length,h.patinaWallSurfaces.length],
  detailCount:h.observedDetails.length
 };
}
test('generated site is built deterministically without mutating authoritative site',()=>{
 const site=generateSite(17,'small'),original=structuredClone(site);
 const a=harness(),b=harness();
 try{
  buildSiteWorld(site,a);buildSiteWorld(site,b);
  assert.deepEqual(site,original,'construction must be observational');
  assert.deepEqual(fingerprint(a),fingerprint(b),
   'same site must produce identical meshes, registration and transforms');
  assert.ok(a.root.children.length>0);
  assert.equal(a.roofGroups.size,site.rooms.length);
  assert.equal(a.coverGroups.size,site.cover.length);
  assert.equal(a.intelSurfaces.filter(x=>x.kind==='wall').length,site.walls.length);
  assert.equal(a.intelSurfaces.filter(x=>x.kind==='cover').length,site.cover.length);
  assert.equal(a.doors.size,site.doors.length);
  assert.equal(a.observedDoorOpen.size,site.doors.length);
  assert.ok(a.walls.length>=site.walls.length);
  finalizeStaticSiteBatches(a);finalizeStaticSiteBatches(b);
  assert.deepEqual(fingerprint(a),fingerprint(b),
   'static batching must preserve deterministic site layout');
 }finally{activateSite(null);}
});
test('site build preserves opening, glass, door and cover registration',()=>{
 const site=generateSite(91,'small'),h=harness();
 try{
  buildSiteWorld(site,h);
  assert.equal(h.architecturalOpenings.length,site.openings?.length??0);
  assert.equal(h.windowGlass.size,site.windows?.length??0);
  assert.equal(h.coverGroups.size,site.cover.length);
  for(const door of site.doors)assert.ok(h.doors.has(door.id));
  for(const door of site.doors)assert.ok(h.observedDoorOpen.has(door.id));
  assert.ok(h.observedDetails.every(d=>
   d.microKey.startsWith('micro:')&&d.fineKey.startsWith('fine:')));
 }finally{activateSite(null);}
});
test('legacy fallback remains available with its real doors and walls',()=>{
 activateSite(null);
 const h=harness();
 try{
  buildSiteWorld(null,h);
  assert.ok(h.root.children.length>0,'legacy floor and walls exist');
  assert.ok(h.walls.length>0,'legacy walls still appear');
  assert.ok(h.doors.size>0,'legacy door geometry still appears');
  assert.equal(h.observedDoorOpen.size,h.doors.size);
  assert.ok(fingerprint(h).transforms.length>80,'legacy scene is not empty');
 }finally{activateSite(null);}
});
test('construction and runtime have explicit ownership and site lifecycle',()=>{
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const builder=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
 assert.match(scene,/buildSiteWorld\(site,this\.siteBuildPort\(\)\)/);
 assert.match(scene,/if\(site\)finalizeStaticSiteBatches\(this\.siteBuildPort\(\)\)/);
 assert.match(scene,/this\.siteMaterials\.reset\(\)/);
 assert.match(scene,/this\.staticBatches\.clear\(\)/);
 assert.match(builder,/export function buildGeneratedSite/);
 assert.match(builder,/export function buildSiteWorld/);
 assert.match(builder,/buildSiteExterior\(site/);
 assert.match(builder,/buildSiteDoors\(site/);
 assert.match(builder,/buildSiteWindows\(site/);
 assert.match(builder,/renderFixtureVisual\(intact,visual,i,localCtx/);
 assert.doesNotMatch(scene,/private buildGenerated\(/);
 assert.doesNotMatch(scene,/planInteriorFragments\(site\)/);
 assert.doesNotMatch(scene,/renderFixtureVisual\(intact,visual/);
 assert.doesNotMatch(builder,/\bstepSession\(/);
 assert.doesNotMatch(builder,/\bnewSession\(/);
});
