/** G36 H3: one solid graphic six-sided polymer fore-end.
 * Two closed hexagonal end planes, each tilted across its HEIGHT;
 * zero internal rims, cavity, mounting lugs, recesses or ornamental meshes.
 * Factory datums, side vent atlas, and support-hand contacts are unchanged.
 */
import * as THREE from 'three';

type End=Readonly<{roofX:number;floorX:number;roofY:number;floorY:number;halfDepth:number}>;
export const G36_H3_ENDS=Object.freeze([
 Object.freeze({roofX:4.35,floorX:3.75,roofY:1.35,floorY:-1.88,halfDepth:1.50}),
 Object.freeze({roofX:12.94,floorX:13.45,roofY:1.28,floorY:-1.80,halfDepth:1.42})
] as const);
export const G36_H3_VENT_CENTERS=Object.freeze([6.175,7.8919,9.6088,11.3257]);
export const G36_H3_VENT_SIZE=Object.freeze({length:1.28,height:.42,centerY:.2372});

/** Roof / right shoulder / right floor / left floor / left shoulder:
 * six points total, with ONE uninterrupted long side on each flank.
 */
export function g36H3Section(end:End):readonly (readonly [number,number,number])[]{
 const shoulderY=end.roofY-.155*(end.roofY-end.floorY);
 const roofHalf=end.halfDepth*.76;
 const floorHalf=end.halfDepth*.84;
 const yz:readonly (readonly [number,number])[]=[
  [end.roofY,-roofHalf],[end.roofY,roofHalf],
  [shoulderY,end.halfDepth],[end.floorY,floorHalf],
  [end.floorY,-floorHalf],[shoulderY,-end.halfDepth]
 ];
 // Each end is a SINGLE planar slanted face, not a series of bevel rings.
 return yz.map(([y,z])=>{
  const t=(y-end.floorY)/(end.roofY-end.floorY);
  return [end.floorX+(end.roofX-end.floorX)*t,y,z] as const;
 });
}
export function addG36H3FactoryHandguard(root:THREE.Group,id:string,n:number,
 material:THREE.Material):THREE.Mesh{
 const points=G36_H3_ENDS.flatMap(g36H3Section);
 const coords=points.flatMap(v=>v);
 const indices:number[]=[];
 for(let i=0;i<6;i++){
  const j=(i+1)%6;
  indices.push(i,j,i+6,j,j+6,i+6);
 }
 // Solid single-piece end caps: four triangles each, NO cavity interior.
 for(let j=1;j<5;j++)indices.push(0,j+1,j);
 for(let j=1;j<5;j++)indices.push(6,6+j,6+j+1);
 const indexed=new THREE.BufferGeometry();
 indexed.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
 indexed.setIndex(indices);
 const geo=indexed.toNonIndexed();indexed.dispose();
 geo.computeVertexNormals();
 const shell=new THREE.Mesh(geo,material);
 shell.name='family-handguard-'+id+'-'+n;
 shell.castShadow=true;shell.receiveShadow=true;
 shell.userData.g36LongHandguard=true;
 shell.userData.g36FacetedMoldedShell=true;
 shell.userData.g36HandguardArtVersion='h3-six-sided-solid';
 shell.userData.g36HandguardSectionSides=6;
 shell.userData.g36HandguardStations=2;
 shell.userData.g36SolidFrontCap=true;
 root.add(shell);
 return shell;
}
