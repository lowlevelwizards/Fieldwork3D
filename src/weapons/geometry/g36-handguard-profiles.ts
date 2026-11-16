/** FT1.9C4: one genuine faceted G36 molded fore-end shell.
 * Three broad cross-section stations, eight facets each. Not a cut-and-paste
 * collection of cubes, and no dedicated vent/detail draw calls.
 * All measurements are exterior miniature art units, not real construction.
 */
import * as THREE from 'three';
export const G36_LONG_FOREND_RINGS=Object.freeze([
 {x:3.75,roofY:1.28,bottomY:-1.76,halfDepth:1.32},
 {x:10.81,roofY:1.38,bottomY:-1.95,halfDepth:1.44},
 {x:13.45,roofY:1.08,bottomY:-1.66,halfDepth:1.18}
]);
/** An octagonal YZ section with a flat broad roof, chamfered shoulders,
 * planar sides and a confident lower sweep. Both height and breadth taper.
 */
function section(top:number,bottom:number,half:number):[number,number][]{
 return [
  [top,-half*.55],[top,half*.55],
  [top-.37,half],[bottom+.34,half],
  [bottom,half*.55],[bottom,-half*.55],
  [bottom+.34,-half],[top-.37,-half]
 ];
}
export function addG36LongHandguard(root:THREE.Group,id:string,n:number,
 material:THREE.Material):THREE.Mesh{
 const pos:number[]=[],tri:number[]=[];
 const count=8;
 for(const ring of G36_LONG_FOREND_RINGS){
  for(const [y,z] of section(ring.roofY,ring.bottomY,ring.halfDepth))
   pos.push(ring.x,y,z);
 }
 for(let ring=0;ring<G36_LONG_FOREND_RINGS.length-1;ring++){
  for(let j=0;j<count;j++){
   const a=ring*count+j,b=ring*count+(j+1)%count,
    c=(ring+1)*count+j,d=(ring+1)*count+(j+1)%count;
   tri.push(a,b,c,b,d,c);
  }
 }
 // Closing end caps: back faces toward -X; muzzle-facing cap toward +X.
 for(let j=1;j<count-1;j++)tri.push(0,j+1,j);
 const last=(G36_LONG_FOREND_RINGS.length-1)*count;
 for(let j=1;j<count-1;j++)tri.push(last,last+j,last+j+1);
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geom.setIndex(tri);
 geom.computeVertexNormals();
 const mesh=new THREE.Mesh(geom,material);
 mesh.name='family-handguard-'+id+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.g36LongHandguard=true;
 mesh.userData.g36FacetedMoldedShell=true;
 root.add(mesh);
 return mesh;
}
