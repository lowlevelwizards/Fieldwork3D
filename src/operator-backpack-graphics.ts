/** BP5R: pixel-scale, non-volumetric backpack details.
 * One shared 128x128 RGBA atlas, no per-frame texture allocation, no change to
 * fabric/camo maps. One alpha-tested draw batch per backpack; no shadow caster.
 */
import * as THREE from 'three';
import {packRing,PACK_VOLUME_RINGS,PACK_DETAIL_PIXEL,type PackCut,type PackPoint} from './operator-backpack-geometry.ts';
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
 {id:'assault-y',w:1,h:1,draw:p=>p(0,0)},
 {id:'assault-lid',w:10,h:4,draw:p=>{row(p,2,1,8);}},
 {id:'alice-lid',w:15,h:5,draw:p=>{row(p,1,1,13);for(const x of [3,11])for(let y=0;y<5;y++)p(x,y,1);}},
 {id:'alice-pocket',w:4,h:6,draw:p=>{row(p,4,0,3,1);row(p,3,0,3);p(1,2);p(2,2);}},
 {id:'bergen-side',w:4,h:12,draw:p=>{row(p,9,0,3);for(let y=1;y<9;y++)p(0,y,1);}},
 {id:'medical',w:1,h:1,draw:p=>p(0,0)},
 {id:'comms-upper',w:10,h:5,draw:p=>{row(p,3,0,9);for(let y=1;y<=2;y++)for(let x=3;x<=6;x++)p(x,y,1);}},
 {id:'civilian-arch',w:1,h:1,draw:p=>p(0,0)},
 {id:'civilian-pocket',w:8,h:5,draw:p=>{row(p,3,0,7);p(3,1,1);p(4,1,1);}},
 {id:'medical-mark',w:11,h:12,draw:p=>{for(let y=7;y<=10;y++)for(let x=3;x<=7;x++)p(x,y,2);for(let y=7;y<=10;y++)p(5,y,3);row(p,8,4,6,3);row(p,9,4,6,3);}}
];
const atlasSize=128,cell=16,columns=atlasSize/cell;
let shared:THREE.DataTexture|undefined;
function atlas(){
 if(shared)return shared;
 const bytes=new Uint8Array(atlasSize*atlasSize*4);
 for(const [i,tile] of tiles.entries()){
  const ox=(i%columns)*cell,oy=Math.floor(i/columns)*cell;
  tile.draw((x,y,tone=0)=>{
   if(x<0||y<0||x>=tile.w||y>=tile.h)return;
   const k=((oy+y)*atlasSize+ox+x)*4;
   const color=tone===3?[219,217,195]:tone===2?[71,76,65]:tone===1?[105,110,92]:[49,55,48];
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
  const t=tiles[i],ox=(i%columns)*cell,oy=Math.floor(i/columns)*cell;
  const [d,h,w]=g.size,[cx,cy,cz]=g.center;
  if(g.tile==='assault-y'){
   // A flat, mitered Y, sampled from the same solid atlas texel. The
   // diagonal edges are geometric graphics, not stair-stepped texture cells
   // or extruded zipper parts. Split only where the shell changes slope.
   const half=PACK_DETAIL_PIXEL*.46,join=-h*.015,tipY=h*.275,tipZ=w*.385;
   const offset=new THREE.Vector2(tipY-join,-tipZ).normalize().multiplyScalar(half);
   const shoulder=-h*.32,base=-h*.43;
   const v=(z:number,y:number)=>new THREE.Vector2(z,y);
   const outline=[
    v(-half,shoulder),v(half,shoulder),v(half,join-half*.35),
    v(tipZ+offset.x,tipY+offset.y),v(tipZ-offset.x,tipY-offset.y),
    v(0,join+half*1.45),v(-tipZ+offset.x,tipY-offset.y),
    v(-tipZ-offset.x,tipY+offset.y),v(-half,join-half*.35)
   ];
   const patch=(points:THREE.Vector2[])=>{
    const start=pos.length/3;
    for(const p of points){
     const shape=packRing(d,w,p.y/h,g.cut??{});
     pos.push(cx+shape.rear-.045,cy+p.y,cz+p.x);
     uv.push((ox+.5)/atlasSize,(oy+.5)/atlasSize);
    }
    for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(points,[])){
     const A=points[a],B=points[b],C=points[c];
     const cross=(B.x-A.x)*(C.y-A.y)-(B.y-A.y)*(C.x-A.x);
     if(cross>0)indices.push(start+a,start+b,start+c);
     else indices.push(start+a,start+c,start+b);
    }
   };
   patch(outline);
   patch([v(-half,base),v(half,base),v(half,shoulder),v(-half,shoulder)]);
   root.userData.fieldworkPackAngledY=true;
   continue;
  }
  if(g.tile==='medical'||g.tile==='civilian-arch'){
   // Constant-width angular path. Split at the fabric's actual slope
   // boundaries; each segment is a flat surface graphic, not hardware.
   const v=(z:number,y:number)=>new THREE.Vector2(z,y);
   const path=g.tile==='medical'?
    [v(-w*.38,-h*.31),v(-w*.38,h*.25),v(-w*.28,h*.37),v(w*.28,h*.37),v(w*.38,h*.25),v(w*.38,-h*.31),v(w*.29,-h*.39),v(-w*.29,-h*.39),v(-w*.38,-h*.31)]:
    [v(-w*.39,h*.02),v(-w*.39,h*.26),v(-w*.26,h*.37),v(w*.26,h*.37),v(w*.39,h*.26),v(w*.39,h*.02)];
   const half=PACK_DETAIL_PIXEL*.43;
   const polygon=path.map((_,i)=>{
    const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];
    const tangent=b.clone().sub(a).normalize();
    return new THREE.Vector2(-tangent.y,tangent.x).multiplyScalar(half);
   });
   const put=(p:THREE.Vector2)=>{
    const shape=packRing(d,w,p.y/h,g.cut??{});
    pos.push(cx+shape.rear-.052,cy+p.y,cz+THREE.MathUtils.clamp(p.x,-shape.half+.03,shape.half-.03));
    uv.push((ox+.5)/atlasSize,(oy+.5)/atlasSize);
   };
   for(let j=1;j<path.length;j++){
    const a=path[j-1],b=path[j],u=polygon[j-1],v=polygon[j];
    const quad=[a.clone().add(u),a.clone().sub(u),b.clone().sub(v),b.clone().add(v)];
    // Clip each polygon to ring bands before projection to avoid floating.
    const clip=(p:THREE.Vector2[],y:number,above:boolean)=>{
     const out:THREE.Vector2[]=[];
     for(let k=0;k<p.length;k++){
      const A=p[k],B=p[(k+1)%p.length],inside=(q:THREE.Vector2)=>above?q.y>=y:q.y<=y;
      if(inside(A))out.push(A);
      if(inside(A)!==inside(B))out.push(A.clone().lerp(B,(y-A.y)/(B.y-A.y)));
     }
     return out;
    };
    for(let k=1;k<PACK_VOLUME_RINGS.length;k++){
     const poly=clip(clip(quad,PACK_VOLUME_RINGS[k-1]*h,true),PACK_VOLUME_RINGS[k]*h,false);
     if(poly.length<3)continue;
     const start=pos.length/3;poly.forEach(put);
     for(const [a,b,c] of THREE.ShapeUtils.triangulateShape(poly,[])){
      const A=poly[a],B=poly[b],C=poly[c];
      if((B.x-A.x)*(C.y-A.y)-(B.y-A.y)*(C.x-A.x)>0)indices.push(start+a,start+b,start+c);
      else indices.push(start+a,start+c,start+b);
     }
    }
   }
   continue;
  }
  const rings=g.flat?[-.5,.5]:PACK_VOLUME_RINGS;
  const start=pos.length/3;
  for(const y of rings){
   const shape=packRing(d,w,y,g.cut??{});
   const side=g.face==='left'?-1:g.face==='right'?1:0;
   for(const s of [-1,1]){
    const x=side?(s<0?shape.rear:d*.5):shape.rear-(g.tile==='medical-mark'?.075:.045);
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
