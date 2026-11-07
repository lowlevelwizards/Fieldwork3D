/** Big, quiet MP5 family fore-end forms. One shell, optional coarse SD bands.
 * The MP5K grip is authored as part of its factory handguard in the main builder.
 */
import * as THREE from 'three';
import {addFacetedTube,addCuboid} from './profile-primitives.ts';
const sides:readonly (readonly [number,number])[]=[
 [-1,-.64],[-1,.64],[-.66,1],[.66,1],
 [1,.64],[1,-.64],[.66,-1],[-.66,-1]
];
export function addMP5TropicalForearm(root:THREE.Group,id:string,n:number,
 start:number,end:number,compact:boolean,material:THREE.Material):THREE.Mesh{
 const cy=-.18;
 // The K stays as originally approved: one short, thick, slightly tapered
 // solid. The A3 gets a gently swollen tropical profile, not decorative ribs.
 // Only two extra cross-sections, all in ONE mesh with eight broad facets.
 const rings=compact?[
  {x:start,sy:1.32,sz:1.40},
  {x:end-.32,sy:1.32,sz:1.40},
  {x:end,sy:1.32*.94,sz:1.40*.94}
 ]:[
  {x:start,sy:1.32,sz:1.42},
  {x:start+(end-start)*.36,sy:1.54,sz:1.68},
  {x:start+(end-start)*.72,sy:1.51,sz:1.64},
  {x:end,sy:1.30,sz:1.42}
 ];
 const vertex=(r:typeof rings[number],i:number)=>{
  const [y,z]=sides[i];return [r.x,cy+y*r.sy,z*r.sz] as const;
 };
 const points:number[]=[];
 const face=(a:readonly number[],b:readonly number[],c:readonly number[])=>
  points.push(...a,...b,...c);
 for(let r=0;r<rings.length-1;r++)for(let j=0;j<8;j++){
  const k=(j+1)%8;
  const a=vertex(rings[r],j),b=vertex(rings[r+1],j),
   c=vertex(rings[r+1],k),d=vertex(rings[r],k);
  face(a,b,c);face(a,c,d);
 }
 for(let j=0;j<8;j++){
  const k=(j+1)%8;
  face([start,cy,0],vertex(rings[0],j),vertex(rings[0],k));
  face([end,cy,0],vertex(rings[rings.length-1],k),
   vertex(rings[rings.length-1],j));
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
 start:number,end:number,material:THREE.Material):void{
 // Broad faceted shroud with TWO large, same-material relief gestures.
 // This removes the old dotted-looking dark seams and one whole draw call.
 const body=addFacetedTube(root,'handguard',id,n,start,end,1.68,material);
 body.position.y=-.18;
 body.userData.hkMP5SDShroud=true;
 for(const [i,x] of [start+1.45,start+4.45].entries()){
  const band=addFacetedTube(root,'handguard',id,n+i+1,
   x,x+.80,1.78,material);
  band.position.y=-.18;band.userData.hkMP5SDBand=true;
 }
}

/** Full-size MP5 RAS-style rail: one block body, three broad mounting rails,
 * three coarse lower relief tabs. Fixed budget, no micromesh rail teeth. */
export function addMP5TriRail(root:THREE.Group,id:string,index:number,
 start:number,end:number,material:THREE.Material):void{
 const span=end-start,x=(end+start)/2;
 const body=addCuboid(root,'handguard',id,index,x,-.19,0,
  span,2.64,2.73,material);
 body.userData.hkMP5TriRailBody=true;
 for(const [i,y,z,w,h,d] of [
  [1,-.29,-1.54,span-.60,.59,.43],
  [2,-.29,1.54,span-.60,.59,.43],
  [3,-1.56,0,span-.60,.43,1.06]
 ] as const){
  const rail=addCuboid(root,'handguard',id,index+i,x,y,z,w,h,d,material);
  rail.userData.hkMP5TriRailSide=i;
 }
 for(let i=0;i<3;i++){
  const tab=addCuboid(root,'handguard',id,index+i+4,
   start+1.10+i*(span-2.20)/2,-1.79,0,.38,.22,1.14,material);
  tab.userData.hkMP5TriRailTooth=i;
 }
}

/** Early MP5 slim polymer: one straight narrow octagonal silhouette.
 * No decorative ribs, fins, or individually modeled hardware. */
export function addMP5SlimForearm(root:THREE.Group,id:string,n:number,
 start:number,end:number,material:THREE.Material):THREE.Mesh{
 const body=addFacetedTube(root,'handguard',id,n,start,end,1.20,material);
 body.position.y=-.18;
 body.userData.hkMP5SlimForearm=true;
 return body;
}
