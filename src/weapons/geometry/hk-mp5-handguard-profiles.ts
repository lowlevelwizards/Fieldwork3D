/** Big, quiet MP5 family fore-end forms. One shell, optional coarse SD bands.
 * The MP5K grip is authored as part of its factory handguard in the main builder.
 */
import * as THREE from 'three';
import {addFacetedTube} from './profile-primitives.ts';
const sides:readonly (readonly [number,number])[]=[
 [-1,-.64],[-1,.64],[-.66,1],[.66,1],
 [1,.64],[1,-.64],[.66,-1],[-.66,-1]
];
export function addMP5TropicalForearm(root:THREE.Group,id:string,n:number,
 start:number,end:number,compact:boolean,material:THREE.Material):THREE.Mesh{
 const cy=-.18,ry=compact?1.32:1.38,rz=compact?1.40:1.47;
 const rings=[{x:start,sy:ry,sz:rz},
  {x:end-(compact?.32:1.4),sy:ry,sz:rz},
  {x:end,sy:ry*(compact?.94:.90),sz:rz*(compact?.94:.90)}];
 const vertex=(r:typeof rings[number],i:number)=>{
  const [y,z]=sides[i];return [r.x,cy+y*r.sy,z*r.sz] as const;
 };
 const points:number[]=[];
 const face=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  points.push(...a,...b,...c);
 for(let r=0;r<2;r++)for(let j=0;j<8;j++){
  const k=(j+1)%8;
  const a=vertex(rings[r],j),b=vertex(rings[r+1],j),
   c=vertex(rings[r+1],k),d=vertex(rings[r],k);
  face(a,b,c);face(a,c,d);
 }
 for(let j=0;j<8;j++){
  const k=(j+1)%8;
  face([start,cy,0],vertex(rings[0],j),vertex(rings[0],k));
  face([end,cy,0],vertex(rings[2],k),vertex(rings[2],j));
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);
 mesh.name='family-handguard-'+id+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.hkMP5Forearm=compact?'k':'tropical';
 root.add(mesh);return mesh;
}
export function addMP5SDShroud(root:THREE.Group,id:string,n:number,
 start:number,end:number,material:THREE.Material,accent:THREE.Material):void{
 // A single thick cylinder with exactly three broad relief bands.
 const body=addFacetedTube(root,'handguard',id,n,start,end,1.68,material);
 body.position.y=-.18;
 body.userData.hkMP5SDShroud=true;
 // Bands protrude by .08 in radial depth. Clear, minimal and non-coplanar.
 for(const [i,x] of [start+1.12,start+2.55,start+3.98].entries()){
  const band=addFacetedTube(root,'handguard',id,n+i+1,
   x,x+.34,1.76,accent);
  band.position.y=-.18;band.userData.hkMP5SDBand=true;
 }
}
