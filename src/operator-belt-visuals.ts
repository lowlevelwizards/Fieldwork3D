/** BT3R: continuous chamfered band; no overlapping segment boxes, inset
 * decorative strips or raised imitation stitching. Buckles own real volume.
 */
import * as THREE from 'three';
import {BELT_PROFILES,BELT_STYLES,type BeltStyle} from './operator-belt-profile.ts';
import {BELT_CENTER_Y,beltContactSegments,WAIST_CONTACT} from './operator-belt-frame.ts';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {TILE_WORLD_SIZE} from './rendering/pixel-recipes.ts';
import {gearMarkedMaterial} from './operator-gear-pixel-art.ts';
function piece(root:THREE.Group,material:THREE.Material,x:number,y:number,z:number,
 w:number,h:number,d:number,name='belt-detail'){
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,material,x,y,z),material);
 mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
export function beltBandGeometry(style:Exclude<BeltStyle,'no-belt'>){
 const segs=beltContactSegments(),p=BELT_PROFILES[style],war=style==='padded-belt';
 const pos:number[]=[],uv:number[]=[],uv1:number[]=[];
 const corners=WAIST_CONTACT.map(([x,z],i)=>{
  const prev=segs[(i+7)%8],next=segs[i],front=war&&i<2;
  const thick=front?.55:p.thickness;
  const nx=prev.normalX+next.normalX,nz=prev.normalZ+next.normalZ;
  const k=thick/(nx*next.normalX+nz*next.normalZ);
  const h=front?1.65:p.height,y=BELT_CENTER_Y+(war&&!front?.35:0);
  return {inner:[x,z],outer:[x+nx*k,z+nz*k],top:y+h/2,bottom:y-h/2};
 });
 type V=[number,number,number];
 const vertex=(i:number,outer:boolean,top:boolean):V=>{
  const c=corners[i],v=outer?c.outer:c.inner;return [v[0],top?c.top:c.bottom,v[1]];
 };
 const quad=(a:V,b:V,c:V,d:V,length:number,height:number,marked=false)=>{
  const coords=[[0,0],[length,0],[length,height],[0,height]];
  const vertices=[a,b,c,d];
  for(const j of [0,2,1,0,3,2]){
   pos.push(...vertices[j]);uv.push(coords[j][0]/TILE_WORLD_SIZE,coords[j][1]/TILE_WORLD_SIZE);
   uv1.push(marked?coords[j][0]/8:.999,marked?coords[j][1]/Math.ceil(p.height):.999);
  }
 };
 for(let i=0;i<8;i++){
  const j=(i+1)%8,L=segs[i].length,H=Math.max(corners[i].top-corners[i].bottom,corners[j].top-corners[j].bottom);
  // The ring has exactly four quads per section, sharing edges rather
  // than overlapping box faces. Winding is outward on all four surfaces.
  quad(vertex(i,true,false),vertex(j,true,false),vertex(j,true,true),vertex(i,true,true),L,H,true);
  quad(vertex(j,false,false),vertex(i,false,false),vertex(i,false,true),vertex(j,false,true),L,H);
  quad(vertex(i,false,true),vertex(i,true,true),vertex(j,true,true),vertex(j,false,true),p.thickness,L);
  quad(vertex(j,false,false),vertex(j,true,false),vertex(i,true,false),vertex(i,false,false),p.thickness,L);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('uv1',new THREE.Float32BufferAttribute(uv1,2));g.computeVertexNormals();
 return g;
}
export function createBeltSilhouettes(parent:THREE.Group,fabric:THREE.Material,
 dark:THREE.Material,hardware:THREE.Material):Record<string,THREE.Group>{
 const result:Record<string,THREE.Group>={};
 for(const style of BELT_STYLES){
  const root=new THREE.Group();root.name=style;root.visible=false;parent.add(root);result[style]=root;
  if(style==='no-belt')continue;
  const p=BELT_PROFILES[style],war=style==='padded-belt';
  const material=style==='battle-belt'?gearMarkedMaterial(fabric,'webbing',8,p.height):
   war?gearMarkedMaterial(fabric,'padding',8,p.height):fabric;
  const band=new THREE.Mesh(beltBandGeometry(style),material);band.name='continuous-belt-band';
  band.castShadow=true;band.receiveShadow=true;root.add(band);
  const fx=beltContactSegments()[0].x+(war?.55:p.thickness),y=BELT_CENTER_Y;
  if(style==='plain-belt'){
   // Broad rectangular metal frame; no subpixel buckle tongue.
   for(const side of [-1,1]){
    piece(root,hardware,fx+.26,y+side*.61,0,.52,.48,3.0,'leather-buckle-bar');
    piece(root,hardware,fx+.26,y,side*1.26,.52,.78,.48,'leather-buckle-side');
   }
  }else if(style==='duty-belt'){
   piece(root,dark,fx+.39,y,0,.78,2.1,3.6,'utility-buckle');
  }else{
   piece(root,dark,fx+.24,y,0,.48,1.9,3.5,'quick-release-base');
   for(const side of [-1,1])
    piece(root,hardware,fx+.69,y,side*.92,.62,1.7,1.48,'quick-release-half');
  }
 }
 return result;
}
