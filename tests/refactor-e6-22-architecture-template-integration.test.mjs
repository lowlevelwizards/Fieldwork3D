import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildArchitecturalOpenings,buildArchitecturalOpeningTemplate,
 architecturalOpeningVisualPieces} from '../src/rendering/breach-site-openings-builder.ts';
import {StaticVisualTemplateLibrary} from '../src/rendering/fieldwork-visual-template-library.ts';
import {releaseSiteSceneObjects} from '../src/rendering/site-scene-lifecycle.ts';
import {mapBoxPixelUV} from '../src/rendering/pixel-materials.ts';
import {shadowEligibleBox} from '../src/rendering/breach-shadow-controller.ts';

function opening(kind='wide',width=62,x=100,y=100){
 return {id:'opening-'+x+'-'+y,kind,
  a:{x:x-width/2,y},b:{x:x+width/2,y}};
}
function sceneHost({cache=null,material=null}={}){
 const root=new THREE.Group(),leases=[],views=[];
 const mat=material??new THREE.MeshStandardMaterial({color:0x334455});
 const host={
  root,visualTemplates:cache??undefined,
  registerVisualLease:lease=>leases.push(lease),
  box:(parent,x,y,z,w,h,d,material,cast=true)=>{
   const mesh=new THREE.Mesh(mapBoxPixelUV(
    new THREE.BoxGeometry(w,h,d),w,h,d),material);
   mesh.position.set(x,y,z);
   mesh.castShadow=cast&&shadowEligibleBox(w,h,d);
   mesh.receiveShadow=true;parent.add(mesh);return mesh;
  },
  registerArch:(opening,obj)=>views.push({opening,obj})
 };
 return {root,leases,views,host,mat};
}
function disposeScene(s,cache){
 releaseSiteSceneObjects(s.root,new Set(),cache?
  cache.sharedGeometries():new Set());
 for(const l of s.leases)l.release();
 s.mat.dispose();
}
function bounds(group){
 return new THREE.Box3().setFromObject(group);
}
test('E6.22 architecturally identical trim compiles once across sites and preserves owner visibility',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const site={openings:[
  opening('wide',62,100,100),opening('wide',62,250,100),
  opening('wide',62,400,100),opening('serving',62,550,100)
 ]};
 const first=sceneHost({cache});
 buildArchitecturalOpenings(site,first.host,first.mat);
 assert.equal(first.views.length,4);
 assert.equal(cache.stats().builds,2);
 assert.equal(cache.stats().hits,2);
 assert.equal(first.leases.length,4);
 const g0=first.views[0].obj,g1=first.views[1].obj;
 assert.notEqual(g0,g1);
 assert.equal(g0.children[0].geometry,g1.children[0].geometry);
 const legacy=sceneHost();
 buildArchitecturalOpenings(site,legacy.host,legacy.mat);
 for(let i=0;i<site.openings.length;i++){
  const before=bounds(legacy.views[i].obj),after=bounds(first.views[i].obj);
  assert.ok(before.min.distanceTo(after.min)<.001);
  assert.ok(before.max.distanceTo(after.max)<.001);
  assert.equal(first.views[i].obj.position.x,legacy.views[i].obj.position.x);
  assert.equal(first.views[i].obj.rotation.y,legacy.views[i].obj.rotation.y);
 }
 g0.visible=false;
 assert.equal(g1.visible,true);
 assert.equal(legacy.views[0].obj.visible,true);
 disposeScene(first,cache);disposeScene(legacy);
 const next=sceneHost({cache,material:new THREE.MeshStandardMaterial({color:0xccbb99})});
 buildArchitecturalOpenings(site,next.host,next.mat);
 assert.equal(cache.stats().builds,2);
 assert.equal(cache.stats().hits,6);
 assert.equal(next.views[0].obj.children[0].material,next.mat);
 disposeScene(next,cache);
 cache.clear();
 assert.equal(cache.stats().geometries,0);
});
test('E6.22 source recipe preserves every per-piece dimension, UV and shadow flag',()=>{
 for(const kind of ['wide','serving']){
  const recipe=architecturalOpeningVisualPieces(70,kind);
  const template=buildArchitecturalOpeningTemplate(70,kind);
  assert.equal(template.root.children.length,recipe.length);
  for(let i=0;i<recipe.length;i++){
   const mesh=template.root.children[i],p=recipe[i];
   assert.ok(mesh instanceof THREE.Mesh);
   assert.equal(mesh.position.x,p[0]);
   assert.equal(mesh.position.y,p[1]);
   assert.equal(mesh.position.z,p[2]);
   const dim=new THREE.Vector3();
   mesh.geometry.computeBoundingBox();
   mesh.geometry.boundingBox.getSize(dim);
   assert.ok(Math.abs(dim.x-p[3])<.0001);
   assert.ok(Math.abs(dim.y-p[4])<.0001);
   assert.ok(Math.abs(dim.z-p[5])<.0001);
   assert.equal(mesh.castShadow,p[6]&&shadowEligibleBox(p[3],p[4],p[5]));
   assert.equal(mesh.receiveShadow,true);
  }
  for(const g of template.ownedGeometries)g.dispose();
 }
});
test('E6.22 compiled architectural buffers survive site swaps until cache invalidation',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const site={openings:[opening('wide',64,120,200)]};
 const one=sceneHost({cache});
 buildArchitecturalOpenings(site,one.host,one.mat);
 const geo=one.views[0].obj.children[0].geometry;
 let disposed=0;
 geo.addEventListener('dispose',()=>disposed++);
 disposeScene(one,cache);
 assert.equal(disposed,0);
 const two=sceneHost({cache});
 buildArchitecturalOpenings(site,two.host,two.mat);
 assert.equal(two.views[0].obj.children[0].geometry,geo);
 assert.equal(cache.stats().builds,1);
 assert.equal(cache.stats().hits,1);
 cache.clear(); // live lease: deferred
 assert.equal(disposed,0);
 disposeScene(two,cache);
 assert.equal(disposed,1);
 assert.equal(cache.stats().geometries,0);
});
test('E6.22 cached serving counter never merges its independently shadowed finish slab',()=>{
 const cache=new StaticVisualTemplateLibrary();
 const site={openings:[opening('serving',60)]};
 const s=sceneHost({cache});
 buildArchitecturalOpenings(site,s.host,s.mat);
 const meshes=s.views[0].obj.children.filter(n=>n instanceof THREE.Mesh);
 assert.ok(meshes.length>=2);
 assert.ok(meshes.some(m=>m.castShadow===false));
 assert.ok(meshes.some(m=>m.castShadow===true));
 disposeScene(s,cache);cache.clear();
});
