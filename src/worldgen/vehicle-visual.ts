/** Common live/preview path; site owns material and template leases. */
import * as THREE from 'three';
import type {Obstacle} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
import {vehicleFamily,vehicleRecipe,vehicleRecipeKey,VEHICLE_CONFIGURATIONS} from './vehicle-catalog.ts';
import {buildVehicleGeometry} from './vehicle-model.ts';
import type {StaticVisualTemplateLibrary,StaticVisualLease} from '../rendering/fieldwork-visual-template-library.ts';
export function createVehicleMaterial(){
 return new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.86,metalness:0});
}
function visualRecipe(c:Obstacle,index:number){
 const family=vehicleFamily(c.fixture??'');
 if(!family)return null;
 // Ordinary legacy cars remain civilian/cargo/box by default.
 // Explicit art variants select configurations for preview/new authored vehicles.
 const recipe=vehicleRecipe(family,c.artVariant??Math.abs(index)*VEHICLE_CONFIGURATIONS[family].length);
 const condition=c.artCondition==='used'?'used':c.artCondition==='neglected'||c.artCondition==='vacant'?'weathered':'clean';
 const dimensions:[number,number,number]=[c.w,c.h,propDefinition(c.fixture??family)?.height??33];
 return {recipe:{...recipe,condition} as const,dimensions};
}
function makeMesh(c:Obstacle,index:number,material:THREE.MeshStandardMaterial){
 const visual=visualRecipe(c,index);
 if(!visual)return null;
 const mesh=new THREE.Mesh(buildVehicleGeometry(visual.recipe,visual.dimensions),material);
 mesh.position.set(c.x,0,c.y);mesh.castShadow=true;mesh.receiveShadow=true;
 return mesh;
}
export function renderVehicleFixture(group:THREE.Group,c:Obstacle,index:number,material?:()=>THREE.MeshStandardMaterial):boolean{
 if(!vehicleFamily(c.fixture??''))return false;
 const mesh=makeMesh(c,index,material?.()??createVehicleMaterial());
 if(!mesh)return false;
 group.add(mesh);return true;
}
export function acquireVehicleTemplate(cache:StaticVisualTemplateLibrary,c:Obstacle,index:number,material:()=>THREE.MeshStandardMaterial):StaticVisualLease|null{
 const visual=visualRecipe(c,index);
 if(!visual)return null;
 const mat=material();
 const key=vehicleRecipeKey(visual.recipe,...visual.dimensions);
 const lease=cache.acquire(key,()=>{
  const root=new THREE.Group();
  const mesh=makeMesh({...c,x:0,y:0},index,mat)!;
  root.add(mesh);
  return {root,ownedGeometries:[mesh.geometry]};
 },{resolveMaterial:()=>mat});
 // Adopted fixture children are local to their cover owner. Match the
 // uncached rendering path for callers with nonzero local offsets as well.
 for(const child of lease.root.children)child.position.set(c.x,0,c.y);
 return lease;
}
