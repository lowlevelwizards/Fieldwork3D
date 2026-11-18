/** G36 H1: original factory polymer handguard, caricatured as a single
 * six-corner molded shell. The broad flat roof, chamfered shoulders, long
 * graphic side planes and tucked floor do all the identity work.
 *
 * 3 stations ONLY: receiver/root, full-width midsection, blunt tapered nose.
 * No grooves, picatinny rail, bevel stacks, extra vent meshes or molded ribs.
 * The x/y/z endpoints are the P6 factory datums (mounting and poses unchanged).
 */
import * as THREE from 'three';

export const G36_LONG_FOREND_RINGS=Object.freeze([
 {x:3.75,roofY:1.35,bottomY:-1.88,halfDepth:1.45},
 {x:11.75,roofY:1.35,bottomY:-1.88,halfDepth:1.45},
 {x:13.45,roofY:.96,bottomY:-1.64,halfDepth:1.32}
]);

/** A deliberate chunky hexagon, not an eight-sided mechanical extrusion.
 * The raised shoulder is the widest point; floor tucks in but stays broad.
 * Long sides stay wide/near-flat so four atlas vents read at phone scale.
 */
const section=(r:typeof G36_LONG_FOREND_RINGS[number]):[number,number][]=>{
 const shoulderY=r.roofY-.155*(r.roofY-r.bottomY);
 const roofHalf=r.halfDepth*.76;
 const floorHalf=r.halfDepth*.84;
 return [
  [r.roofY,-roofHalf],[r.roofY,roofHalf],
  [shoulderY,r.halfDepth],[r.bottomY,floorHalf],
  [r.bottomY,-floorHalf],[shoulderY,-r.halfDepth]
 ];
};

export function addG36LongHandguard(root:THREE.Group,id:string,n:number,
 material:THREE.Material):THREE.Mesh{
 const positions:number[]=[],triangles:number[]=[],sides=6;
 for(const r of G36_LONG_FOREND_RINGS)
  for(const [y,z] of section(r))positions.push(r.x,y,z);
 for(let ring=0;ring<G36_LONG_FOREND_RINGS.length-1;ring++)
  for(let j=0;j<sides;j++){
   const a=ring*sides+j,b=ring*sides+(j+1)%sides;
   const c=(ring+1)*sides+j,d=(ring+1)*sides+(j+1)%sides;
   triangles.push(a,b,c,b,d,c);
  }
 // Flat, triangulated six-corner end caps, with no extrusion/bevel stage.
 for(let j=1;j<sides-1;j++)triangles.push(0,j+1,j);
 const last=(G36_LONG_FOREND_RINGS.length-1)*sides;
 for(let j=1;j<sides-1;j++)triangles.push(last,last+j,last+j+1);
 const indexed=new THREE.BufferGeometry();
 indexed.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 indexed.setIndex(triangles);
 // Each face has its own hard normals. Do not shade the mold like a pillow.
 const flat=indexed.toNonIndexed();indexed.dispose();
 flat.computeVertexNormals();
 const mesh=new THREE.Mesh(flat,material);
 mesh.name='family-handguard-'+id+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.g36LongHandguard=true;
 mesh.userData.g36FacetedMoldedShell=true;
 mesh.userData.g36HandguardArtVersion='h1-six-plane-original';
 mesh.userData.g36HandguardSectionSides=6;
 root.add(mesh);return mesh;
}
