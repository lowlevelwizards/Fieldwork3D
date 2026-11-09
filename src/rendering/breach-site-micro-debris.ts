/** Procedural static site micro-debris builder.
 * Returns meshes; the active TacticalScene3D retains lifetime/ownership.
 * Material creation is supplied by the scene's cache.
 */
import * as THREE from 'three';
import type {Site} from '../breach-site.ts';
import type {PixelSurface} from './pixel-materials.ts';
import {planMicroDebris,type DebrisKind} from '../worldgen/micro-debris.ts';
export function buildSiteMicroDebrisMeshes(site:Site,
 solid:(color:number,roughness:number,surface:PixelSurface)=>THREE.Material
):THREE.InstancedMesh[]{
 const debris=planMicroDebris(site);
 const kinds:readonly DebrisKind[]=['stone','leaf','weed','flake'];
 const colors={stone:0x908f80,leaf:0x8f825d,weed:0x60774d,flake:0xc4b9a3};
 const result:THREE.InstancedMesh[]=[];
 const obj=new THREE.Object3D();
 for(const kind of kinds){
  const picks=debris.filter(d=>d.kind===kind);
  if(!picks.length)continue;
  const geometry=new THREE.BoxGeometry(1,1,1);
  const material=solid(colors[kind],1,kind==='weed'?'foliage':
   kind==='stone'?'gravel':'paper');
  const mesh=new THREE.InstancedMesh(geometry,material,picks.length);
  mesh.castShadow=false;mesh.receiveShadow=false;
  picks.forEach((d,i)=>{
   obj.position.set(d.x,kind==='weed'?.5:-1.02,d.y);
   obj.rotation.set(0,d.angle,0);
   obj.scale.set(kind==='weed'?.6:d.size,kind==='weed'?d.size*1.2:.32,
    kind==='weed'?.6:d.size*.55);
   obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.frustumCulled=false;
  result.push(mesh);
 }
 return result;
}
