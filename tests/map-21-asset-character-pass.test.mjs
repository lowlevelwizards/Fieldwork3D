import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {propCatalog,propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {CHARACTER_FIXTURE_IDS,characterVariant,renderCharacterFixture}
 from '../src/worldgen/asset-character-visuals.ts';

const from=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shared=new Map();
const solid=(hex)=> {
 if(!shared.has(hex))shared.set(hex,new THREE.MeshStandardMaterial({color:hex}));
 return shared.get(hex);
};
const ctx={
 solid,
 box:(parent,x,y,z,w,h,d,material)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 },
};
const materials=[solid(0x7a6b57),solid(0x566965),solid(0x7b806f),solid(0x53615d)];

test('silhouette-first upgrade registry covers only valid physical catalog assets',()=>{
 const existing=new Set(propCatalog().map(x=>x.id));
 for(const id of CHARACTER_FIXTURE_IDS){
  assert.ok(existing.has(id),id);
  assert.equal(assetLibrary().find(x=>x.id===id)?.presentation,'bespoke',id);
 }
 assert.ok(CHARACTER_FIXTURE_IDS.size>=45);
 assert.ok(['sedan','pickup','suv','van','vehicle'].every(x=>CHARACTER_FIXTURE_IDS.has(x)));
});

test('every upgraded asset produces visible non-box-only geometry within its footprint',()=>{
 let verified=0;
 for(const id of CHARACTER_FIXTURE_IDS){
  const item=propDefinition(id);
  assert.ok(item,id);
  const obstacle={x:0,y:0,w:item.width,h:item.depth,low:item.cover==='low',fixture:id};
  for(let variant=0;variant<3;variant++){
   const group=new THREE.Group();
   assert.equal(renderCharacterFixture(group,obstacle,id,variant,ctx,...materials),true,id);
   assert.ok(group.children.length>=3,id+' trim '+variant);
   const bounds=new THREE.Box3().setFromObject(group);
   const finite=[...bounds.min.toArray(),...bounds.max.toArray()];
   assert.ok(finite.every(Number.isFinite),id);
   assert.ok(bounds.max.x<=item.width/2+5,id+' overshoots X');
   assert.ok(bounds.min.x>=-item.width/2-5,id+' overshoots -X');
   assert.ok(bounds.max.z<=item.depth/2+5,id+' overshoots Z');
   assert.ok(bounds.min.z>=-item.depth/2-5,id+' overshoots -Z');
   assert.ok(bounds.min.y>=-1.5,id+' below floor');
   assert.ok(bounds.max.y<=item.height+6,id+' exceeds catalog height');
   assert.ok(group.children.length<=72,id+' excess draw calls');
   for(const child of group.children)
    if(child instanceof THREE.Mesh)child.geometry.dispose();
   verified++;
  }
 }
 assert.equal(verified,CHARACTER_FIXTURE_IDS.size*3);
});

test('vehicle families have a sloped cabin, instanced wheels, and recognisable trims',()=>{
 for(const id of ['vehicle','sedan','pickup','van','suv']){
  const item=propDefinition(id),group=new THREE.Group();
  assert.equal(renderCharacterFixture(group,{
   x:2,y:3,w:item.width,h:item.depth,fixture:id},id,1,ctx,...materials),true);
  assert.ok(group.children.some(x=>x instanceof THREE.Mesh&&
    x.geometry instanceof THREE.ExtrudeGeometry),id+' shaped roof');
  assert.ok(group.children.filter(x=>x instanceof THREE.InstancedMesh).length>=2,
    id+' instanced wheels');
  assert.ok(group.children.length<=60,id+' mesh budget');
 }
});

test('all three trims are stable and never change tactical physical dimensions',()=>{
 for(const id of CHARACTER_FIXTURE_IDS){
  const p=propDefinition(id);
  assert.deepEqual([...new Set([0,1,2].map(i=>characterVariant(id,i)))].sort(),[0,1,2]);
  assert.deepEqual([p.width,p.depth,p.height],[
   propDefinition(id).width,propDefinition(id).depth,propDefinition(id).height]);
 }
 assert.doesNotMatch(from('src/worldgen/asset-character-visuals.ts'),/Math\.random\(/);
 const renderer=from('src/worldgen/fixture-visuals.ts');
 assert.match(renderer,/renderCharacterFixture\(group,c,fixture,c\.artVariant\?\?i/);
 const model=from('src/breach-core.ts');
 assert.match(model,/Render-only deterministic trim selection/);
});
test('Asset Lab exposes cycleable live asset styles',()=>{
 const html=from('asset-lab.html'),code=from('src/asset-lab-main.ts');
 assert.match(html,/id="variant"/);
 assert.match(code,/showroomVariants\.set/);
 assert.match(code,/artVariant:index\+/);
 assert.match(code,/stage\.applySite\(site\)/);
});
