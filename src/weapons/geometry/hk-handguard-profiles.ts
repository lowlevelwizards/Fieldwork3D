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
  {x:end,ry:ry*(early?0.89:0.91),rz:rz*(early?0.89:0.91)}
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

/** M16A1-style handguard openings, widened and drawn on actual flat sides.
 * Four simple dark quads per side, batched into just two meshes total.
 * They are art-only recesses, not physical cavities.
 */
const HK_VENT_MATERIAL=new THREE.MeshBasicMaterial({
 color:0x121a16,side:THREE.DoubleSide,depthWrite:false,
 polygonOffset:true,polygonOffsetFactor:-1
});
export function addHKHandguardOpenings(root:THREE.Group,
 start:number,end:number,early:boolean):THREE.Mesh[]{
 const rz=early?1.50:1.55;
 const xs=[0,1,2,3].map(i=>THREE.MathUtils.lerp(
  start+1.42,end-3.46,i/3));
 const width=early?1.04:1.10;
 const height=early?0.86:0.73;
 const result:THREE.Mesh[]=[];
 for(const side of [1,-1]){
  const z=side*(rz+.018),vertices:number[]=[],indices:number[]=[];
  for(const x of xs){
   const y=-.22,first=vertices.length/3;
   vertices.push(
    x-width/2,y-height/2,z,x+width/2,y-height/2,z,
    x+width/2,y+height/2,z,x-width/2,y+height/2,z);
   indices.push(first,first+1,first+2,first,first+2,first+3);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,HK_VENT_MATERIAL);
  mesh.name='family-art-hk-handguard-openings';
  mesh.userData.weaponPixelArt=true;
  mesh.userData.hkVentSide=side;mesh.userData.hkVentCount=xs.length;
  mesh.userData.hkFaceAligned=true;
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=3;
  root.add(mesh);result.push(mesh);
 }
 return result;
}
