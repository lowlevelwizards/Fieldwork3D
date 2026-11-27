/** BP5R: pixel-scale, non-volumetric backpack details.
 * One shared 64x64 RGBA atlas, no per-frame texture allocation, no change to
 * fabric/camo maps. One alpha-tested draw batch per backpack; no shadow caster.
 */
import * as THREE from 'three';
import {packRing,PACK_VOLUME_RINGS,type PackCut,type PackPoint} from './operator-backpack-geometry.ts';
type Tile={id:string;w:number;h:number;draw:(pixel:(x:number,y:number,tone?:number)=>void)=>void};
const row=(p:(x:number,y:number,tone?:number)=>void,y:number,a:number,b:number,tone=0)=>{for(let x=a;x<=b;x++)p(x,y,tone);};
const tiles:readonly Tile[]=[
 {id:'hydration',w:6,h:12,draw:p=>{row(p,9,1,4);p(4,8);}},
 {id:'panel-backing',w:12,h:10,draw:p=>{for(let y=1;y<9;y++){p(0,y);p(11,y);}}},
 {id:'panel-lid',w:10,h:4,draw:p=>{row(p,2,0,9,1);row(p,1,1,8);}},
 {id:'panel-pouch',w:5,h:5,draw:p=>{row(p,3,0,4,1);row(p,2,0,4,1);p(2,1);p(2,2);}},
 {id:'day-upper',w:8,h:4,draw:p=>{row(p,2,0,7);}},
 {id:'day-lower',w:9,h:7,draw:p=>{row(p,5,0,8);for(const y of [0,2,4])row(p,y,1,7,1);}},
 {id:'day-side',w:5,h:13,draw:p=>{for(let y=1;y<12;y++)p(2,y);}},
 {id:'assault-y',w:12,h:15,draw:p=>{
  for(let y=1;y<=7;y++)p(5,y);
  for(let i=0;i<=4;i++){p(5-i,7+i);p(6+i,7+i);}
  p(6,7);}},
 {id:'assault-lid',w:10,h:4,draw:p=>{row(p,2,1,8);}}
];
const atlasSize=64,cell=16;
let shared:THREE.DataTexture|undefined;
function atlas(){
 if(shared)return shared;
 const bytes=new Uint8Array(atlasSize*atlasSize*4);
 for(const [i,tile] of tiles.entries()){
  const ox=(i%4)*cell,oy=Math.floor(i/4)*cell;
  tile.draw((x,y,tone=0)=>{
   if(x<0||y<0||x>=tile.w||y>=tile.h)return;
   const k=((oy+y)*atlasSize+ox+x)*4;
   const color=tone===1?[105,110,92]:[49,55,48];
   bytes.set([...color,255],k);
  });
 }
 const texture=new THREE.DataTexture(bytes,atlasSize,atlasSize,THREE.RGBAFormat);
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
 texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 texture.name='Fieldwork backpack graphic atlas · one art pixel';
 shared=texture;return texture;
}
export type PackGraphic=Readonly<{tile:string;center:PackPoint;size:PackPoint;cut?:PackCut;face?:'rear'|'left'|'right';flat?:boolean}>;
/** Reuse the exact sculpt ring profile. Only the visible face receives a
 * graphic, never the concealed body-facing panel. UVs span physical art pixels.
 */
export function attachPackGraphics(root:THREE.Group,graphics:readonly PackGraphic[]){
 if(!graphics.length)return;
 const pos:number[]=[],uv:number[]=[],indices:number[]=[];
 for(const g of graphics){
  const i=tiles.findIndex(t=>t.id===g.tile);
  if(i<0)throw Error('Unknown backpack graphic '+g.tile);
  const t=tiles[i],ox=(i%4)*cell,oy=Math.floor(i/4)*cell;
  const [d,h,w]=g.size,[cx,cy,cz]=g.center;
  const rings=g.flat?[-.5,.5]:PACK_VOLUME_RINGS;
  const start=pos.length/3;
  for(const y of rings){
   const shape=packRing(d,w,y,g.cut??{});
   const side=g.face==='left'?-1:g.face==='right'?1:0;
   for(const s of [-1,1]){
    const x=side?(s<0?shape.rear:d*.5):shape.rear-.045;
    const z=side?side*(shape.half+.045):s*shape.half;
    pos.push(cx+x,cy+y*h,cz+z);
    // Half-texel inset prevents sampling an adjacent atlas cell.
    uv.push((ox+.01+(s+1)*.5*(t.w-.02))/atlasSize,
     (oy+.01+(y+.5)*(t.h-.02))/atlasSize);
   }
  }
  for(let n=0;n<rings.length-1;n++){
   const a=start+n*2,b=a+1,c=a+2,d=a+3;
   if(g.face==='left')indices.push(a,c,b,b,c,d);
   else indices.push(a,b,c,b,d,c);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingBox();
 const material=new THREE.MeshStandardMaterial({map:atlas(),color:0xffffff,roughness:.96,alphaTest:.5,flatShading:true});
 material.userData.fieldworkStudioSoftGear=true;
 const mesh=new THREE.Mesh(geo,material);mesh.name='pack-pixel-graphics';
 mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);
 root.userData.fieldworkPackGraphicTriangles=indices.length/3;
}
