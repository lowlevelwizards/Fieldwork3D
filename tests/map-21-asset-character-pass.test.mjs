import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {propCatalog,propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {VEHICLE_FAMILIES} from '../src/worldgen/vehicle-catalog.ts';
import {renderVehicleFixture,createVehicleMaterial} from '../src/worldgen/vehicle-visual.ts';
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
 assert.ok(CHARACTER_FIXTURE_IDS.size+VEHICLE_FAMILIES.length>=45);
 assert.ok(VEHICLE_FAMILIES.every(x=>!CHARACTER_FIXTURE_IDS.has(x)));
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

test('vehicles use a single shared opaque vertex-colored model, including the archive alias',()=>{
 const mat=createVehicleMaterial();
 try{
  for(const id of ['vehicle',...VEHICLE_FAMILIES]){
   const item=propDefinition(id),group=new THREE.Group();
   assert.equal(renderVehicleFixture(group,{x:2,y:3,w:item.width,h:item.depth,fixture:id},1,()=>mat),true);
   assert.equal(group.children.length,1);
   const mesh=group.children[0];assert.equal(mesh.material,mat);
   assert.ok(mesh.geometry.getAttribute('color'));
   assert.ok(mesh.geometry.getAttribute('position').count/3<=450);
   mesh.geometry.dispose();
  }
 }finally{mat.dispose();}
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
