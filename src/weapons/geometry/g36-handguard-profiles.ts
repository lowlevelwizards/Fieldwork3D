/** G36 P6: a confident molded polymer fore-end.
 * Flat roof, planar sides, flat floor; one purposeful forward descending nose.
 * No octagonal rounding, intermediate pillow/chamfer stations or vent meshes.
 */
import * as THREE from 'three';
export const G36_LONG_FOREND_RINGS=Object.freeze([
 {x:3.75,roofY:1.35,bottomY:-1.88,halfDepth:1.45},
 {x:11.75,roofY:1.35,bottomY:-1.88,halfDepth:1.45},
 {x:13.45,roofY:.96,bottomY:-1.64,halfDepth:1.32}
]);
const section=(r:typeof G36_LONG_FOREND_RINGS[number]):[number,number][]=>[
 [r.roofY,-r.halfDepth],[r.roofY,r.halfDepth],
 [r.bottomY,r.halfDepth],[r.bottomY,-r.halfDepth]
];
export function addG36LongHandguard(root:THREE.Group,id:string,n:number,
 material:THREE.Material):THREE.Mesh{
 const positions:number[]=[],triangles:number[]=[],sides=4;
 for(const r of G36_LONG_FOREND_RINGS)
  for(const [y,z] of section(r))positions.push(r.x,y,z);
 for(let ring=0;ring<G36_LONG_FOREND_RINGS.length-1;ring++)
  for(let j=0;j<sides;j++){
   const a=ring*sides+j,b=ring*sides+(j+1)%sides;
   const c=(ring+1)*sides+j,d=(ring+1)*sides+(j+1)%sides;
   triangles.push(a,b,c,b,d,c);
  }
 // Two end caps, no bevel.
 triangles.push(0,2,1,0,3,2);
 const last=(G36_LONG_FOREND_RINGS.length-1)*sides;
 triangles.push(last,last+1,last+2,last,last+2,last+3);
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geom.setIndex(triangles);
 // Never average normals across hard prism corners. Smooth normals create
 // precisely the pillow-shading the interpretive reset is meant to remove.
 const flat=geom.toNonIndexed();geom.dispose();flat.computeVertexNormals();
 const mesh=new THREE.Mesh(flat,material);
 mesh.name='family-handguard-'+id+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.g36LongHandguard=true;
 mesh.userData.g36FacetedMoldedShell=true;
 root.add(mesh);return mesh;
}
