/** Visual-only G3 / G3A3 slim fore-end.
 * Eight broad flats, a single gently tapered nose, and flat central side
 * faces for intentional non-floating vent marks. One mesh per handguard.
 */
import * as THREE from 'three';

type CrossSection=readonly [number,number];
const perimeter:readonly CrossSection[]=[
 [-1,-.64],[-1,.64],[-.66,1],[.66,1],
 [1,.64],[1,-.64],[.66,-1],[-.66,-1]
];
type Ring={x:number;ry:number;rz:number};
export function addHKFacetedForearm(
 root:THREE.Group,id:string,index:number,start:number,end:number,
 early:boolean,material:THREE.Material):THREE.Mesh{
 const ry=early?1.50:1.52,rz=early?1.50:1.55;
 const rings:Ring[]=[
  {x:start,ry,rz},
  {x:end-2.53,ry,rz},
  {x:end,ry:ry*(early?.89:.91),rz:rz*(early?.89:.91)}
 ];
 const centerY=-.18;
 const point=(ring:Ring,i:number):[number,number,number]=>{
  const [uy,uz]=perimeter[i];
  return [ring.x,centerY+uy*ring.ry,uz*ring.rz];
 };
 const triangles:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  triangles.push(...a,...b,...c);
 for(let n=0;n<rings.length-1;n++){
  const rear=rings[n],front=rings[n+1];
  for(let j=0;j<perimeter.length;j++){
   const next=(j+1)%perimeter.length;
   const a=point(rear,j),b=point(front,j),
    c=point(front,next),d=point(rear,next);
   tri(a,b,c);tri(a,c,d);
  }
 }
 const rearCenter:[number,number,number]=[start,centerY,0];
 const frontCenter:[number,number,number]=[end,centerY,0];
 for(let j=0;j<perimeter.length;j++){
  const next=(j+1)%perimeter.length;
  tri(rearCenter,point(rings[0],j),point(rings[0],next));
  tri(frontCenter,point(rings[2],next),point(rings[2],j));
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(triangles,3));
 geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,material);
 mesh.name='family-handguard-'+id+'-'+index;
 mesh.castShadow=true;mesh.receiveShadow=true;
 root.add(mesh);return mesh;
}
