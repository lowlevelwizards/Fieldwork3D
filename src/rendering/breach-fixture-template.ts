/** E6.23 — opt-in immutable, box-authored fixture model templates.
 * Only proven rigid, box-only fixture recipes are eligible. Tactical cover,
 * damage state, wear overlays and visibility remain owned by the site.
 * Artist variants and mutable/custom material recipes fail closed for now.
 */
import * as THREE from 'three';
import type {Obstacle} from '../breach-core.ts';
import {renderFixtureVisual,type FixtureVisualContext}
 from '../worldgen/fixture-visuals.ts';
import {mapBoxPixelUV} from './pixel-materials.ts';
import {shadowEligibleBox} from './breach-shadow-controller.ts';
import {consolidateStaticFixtureParts} from './breach-fixture-draw-batching.ts';
import {StaticVisualTemplateLibrary,type StaticVisualLease}
 from './fieldwork-visual-template-library.ts';

const RIGID_BOX_FAMILIES=new Set([
 'queue-stanchion','entry-bench','shoe-cubby','coat-rack',
 'diner-booth','bar-stool','public-bench','bar-counter',
 'reception-desk','transaction-counter','parts-counter',
 'target-plate','target-no-shoot','window-boards','half-wall',
 'porch-post','support-column','privacy-fence','iron-fence',
 'chain-link-fence','fence'
]);
// E6.24: separate opt-in for dense, static service/exterior prop silhouettes.
// Their visual recipes contain boxes only; no hinges, particles, animation,
// procedural cylinders or shared mutable pose/material state.
const SERVICE_BOX_FAMILIES=new Set([
 'toilet','bathtub','mailbox','screened-dumpster','vending-machine',
 'wayfinding-sign','trash-bin','bollard','utility-cabinet',
 'parking-block','parking-sign','street-lamp'
]);
type BaseSlot='wood'|'steel'|'olive'|'metal';
type Slot={base:BaseSlot}|{solid:true;hex:number;
 roughness:number|undefined;surface:Parameters<FixtureVisualContext['solid']>[2]};
type Palette={wood:THREE.Material;steel:THREE.Material;
 olive:THREE.Material;metal:THREE.Material};
function placeholder(slot:Slot):THREE.MeshStandardMaterial{
 const material=new THREE.MeshStandardMaterial();
 material.userData.fieldworkFixtureTemplateSlot=slot;
 return material;
}
function recipeKey(visual:Obstacle,index:number):string{
 return ['rigid-fixture:v1',visual.fixture??'crate',visual.w,visual.h,
  index%3].join(':');
}
/** Does not mutate a source cover, and does not cache authoring conditions
 * or a fixture family with procedural cylinders, instancing, or animation. */
export function rigidFixtureTemplateEligible(
 visual:Obstacle,includeService=false
):boolean{
 return (RIGID_BOX_FAMILIES.has(visual.fixture??'crate')||
  (includeService&&SERVICE_BOX_FAMILIES.has(visual.fixture??'crate')))&&
  visual.artCondition===undefined&&visual.artSurface===undefined&&
  visual.artVariant===undefined&&
  Number.isFinite(visual.w)&&Number.isFinite(visual.h)&&
  visual.w>0&&visual.h>0;
}
function makePrototype(visual:Obstacle,index:number){
 const root=new THREE.Group();
 const geometries=new Set<THREE.BufferGeometry>();
 const bySize=new Map<string,THREE.BufferGeometry>();
 const solidSlots=new Map<string,THREE.MeshStandardMaterial>();
 const base:Palette={
  wood:placeholder({base:'wood'}),steel:placeholder({base:'steel'}),
  olive:placeholder({base:'olive'}),metal:placeholder({base:'metal'})
 };
 const ctx:FixtureVisualContext={
  box:(parent,x,y,z,w,h,d,material,cast=true)=>{
   const key=[w,h,d].join(':');
   let geo=bySize.get(key);
   if(!geo){
    geo=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
    bySize.set(key,geo);geometries.add(geo);
   }
   const mesh=new THREE.Mesh(geo,material);
   mesh.position.set(x,y,z);
   mesh.castShadow=cast&&shadowEligibleBox(w,h,d);
   mesh.receiveShadow=true;
   parent.add(mesh);return mesh;
  },
  solid:(hex,roughness,surface)=>{
   const key=[hex,roughness??'',surface??''].join(':');
   let material=solidSlots.get(key);
   if(!material){
    material=placeholder({solid:true,hex,roughness,surface});
    solidSlots.set(key,material);
   }
   return material;
  }
 };
 renderFixtureVisual(root,visual,index,ctx,
  base.wood,base.steel,base.olive,base.metal);
 // The legacy scene batches these SAME rigid parts after authoring.
 // Perform the equivalent work once per model recipe, not per cover.
 consolidateStaticFixtureParts(root);
 const retained=new Set<THREE.BufferGeometry>();
 root.traverse(node=>{
  if(node instanceof THREE.Mesh)retained.add(node.geometry);
 });
 // The legacy batcher detaches source meshes and replaces them with merged
 // buffers. Do not retain the now-unreachable authoring boxes in every cached
 // recipe: only GPU buffers referenced by the final template are reusable.
 for(const geometry of geometries)
  if(!retained.has(geometry))geometry.dispose();
 return {root,ownedGeometries:[...retained]};
}
export function acquireRigidFixtureTemplate(
 cache:StaticVisualTemplateLibrary,visual:Obstacle,index:number,
 ctx:FixtureVisualContext,palette:Palette,includeService=false
):StaticVisualLease|null{
 if(!rigidFixtureTemplateEligible(visual,includeService))return null;
 const resolved=new Map<THREE.Material,THREE.Material>();
 return cache.acquire(recipeKey(visual,index),
  ()=>makePrototype(visual,index),{
   resolveMaterial:(original)=>{
    const prev=resolved.get(original);
    if(prev)return prev;
    const slot=original.userData.fieldworkFixtureTemplateSlot as Slot|undefined;
    if(!slot)throw Error('Fixture prototype material lacks a recipe slot');
    const material='base' in slot?palette[slot.base]:
     ctx.solid(slot.hex,slot.roughness,slot.surface);
    resolved.set(original,material);
    return material;
   }
  });
}

/** The owner-scoped fixture batcher expects direct child meshes. Adopt them
 * without transferring ownership of their shared GPU buffers. Releasing the
 * lease must still detach any remaining adopted visual nodes, even if a
 * caller releases before full site teardown. */
export function adoptRigidFixtureVisual(
 owner:THREE.Group,lease:StaticVisualLease
):StaticVisualLease{
 const adopted=[...lease.root.children];
 owner.add(...adopted);
 let released=false;
 return {root:lease.root,templateKey:lease.templateKey,release:()=>{
  if(released)return;
  released=true;
  for(const child of adopted)child.parent?.remove(child);
  lease.release();
 }};
}
