/** One 8-facet HK33/HK53 fore-end, with bold game-art side panels. */
import * as THREE from 'three';
const perimeter:readonly (readonly [number,number])[]=[
 [-1,-.64],[-1,.64],[-.66,1],[.66,1],
 [1,.64],[1,-.64],[.66,-1],[-.66,-1]
];
export function addHK556Forearm(root:THREE.Group,id:string,n:number,
 start:number,end:number,compact:boolean,material:THREE.Material):THREE.Mesh{
 const cy=-.19,ry=compact?1.52:1.38,rz=compact?1.50:1.39;
 const rings=[
  {x:start,y:ry,z:rz},
  {x:end-(compact?1.18:2.1),y:ry,z:rz},
  {x:end,y:ry*.92,z:rz*.92}
 ];
 const vertex=(r:typeof rings[number],i:number)=>{
  const [y,z]=perimeter[i];
  return [r.x,cy+y*r.y,z*r.z] as const;
 };
 const points:number[]=[];
 const triangle=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  points.push(...a,...b,...c);
 for(let k=0;k<2;k++)for(let j=0;j<8;j++){
  const q=(j+1)%8;
  const a=vertex(rings[k],j),b=vertex(rings[k+1],j),
   c=vertex(rings[k+1],q),d=vertex(rings[k],q);
  triangle(a,b,c);triangle(a,c,d);
 }
 for(let j=0;j<8;j++){
  const q=(j+1)%8;
  triangle([start,cy,0],vertex(rings[0],j),vertex(rings[0],q));
  triangle([end,cy,0],vertex(rings[2],q),vertex(rings[2],j));
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);
 mesh.name='family-handguard-'+id+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.hk556Forearm=compact?'compact':'long';
 root.add(mesh);return mesh;
}
