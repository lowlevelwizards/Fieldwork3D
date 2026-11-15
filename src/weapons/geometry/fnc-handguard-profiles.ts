/** FN FNC full-length polymer fore-end, visual geometry only.
 * Flat-sided octagonal profile with a modest tapered nose. Similar budget
 * to the proven HK fore-end, but a FNC-specific taller lower grip and
 * broad unbroken groove rather than G3 drum/three-hole geometry.
 */
import * as THREE from 'three';
type Ring=Readonly<{x:number;scale:number}>;
const rings:readonly Ring[]=[
 {x:3.45,scale:1},{x:11.65,scale:1},{x:13.55,scale:.88}
];
const yz:readonly (readonly [number,number])[]=[
 [-2.02,-.84],[-2.02,.84],[-1.46,1.46],
 [.48,1.46],[1.13,.80],[1.13,-.80],
 [.48,-1.46],[-1.46,-1.46]
];
const pt=(r:Ring,i:number):[number,number,number]=>{
 const [y,z]=yz[i];
 return [r.x,-.44+(y+.44)*r.scale,z*r.scale];
};
/** One actual 3D faceted body, not a flat panel stretched across Z. */
export function addFNCFacetedForearm(root:THREE.Group,
 material:THREE.Material):THREE.Mesh{
 const positions:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  positions.push(...a,...b,...c);
 for(let n=0;n<rings.length-1;n++)for(let i=0;i<8;i++){
  const j=(i+1)%8;
  const a=pt(rings[n],i),b=pt(rings[n+1],i),
   c=pt(rings[n+1],j),d=pt(rings[n],j);
  tri(a,b,c);tri(a,c,d);
 }
 for(let i=0;i<8;i++){
  const j=(i+1)%8;
  tri([rings[0].x,-.44,0],pt(rings[0],j),pt(rings[0],i));
  tri([rings[2].x,-.44,0],pt(rings[2],i),pt(rings[2],j));
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);
 mesh.name='family-handguard-fnc-p2-handguard-0';
 mesh.userData.fncLongGroovedHandguard=true;
 mesh.userData.fncFacetedHandguard=true;
 mesh.userData.fncCrossSectionFaces=8;
 mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
}
/** Two mirrored low-cost markings: a broad longitudinal molded recess
 * and TWO conspicuous upper ventilation windows per side. Geometry is
 * just flat quads on the actual flat side, not decorative layered cubes.
 */
export function addFNCForearmMarks(root:THREE.Group,material:THREE.Material):
 THREE.Mesh[]{
 const result:THREE.Mesh[]=[];
 for(const side of [-1,1] as const){
  const positions:number[]=[],indices:number[]=[];
  const quad=(x:number,y:number,w:number,h:number)=>{
   const first=positions.length/3,z=side*1.485;
   positions.push(
    x-w/2,y-h/2,z,x+w/2,y-h/2,z,
    x+w/2,y+h/2,z,x-w/2,y+h/2,z);
   if(side===1)indices.push(first,first+1,first+2,first,first+2,first+3);
   else indices.push(first,first+2,first+1,first,first+3,first+2);
  };
  quad(8.30,-.91,6.26,.23);
  quad(6.70,.20,1.20,.38);
  quad(10.15,.20,1.20,.38);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,material);
  mesh.name='family-handguard-fnc-p2-handguard-'+(side<0?1:2);
  mesh.userData.fncGrooveSide=side;
  mesh.userData.fncVentCount=2;
  mesh.userData.fncGrooveCount=1;
  mesh.userData.fncFaceAligned=true;
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=3;
  root.add(mesh);result.push(mesh);
 }
 return result;
}
