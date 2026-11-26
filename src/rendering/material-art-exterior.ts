/** One non-repeating condition map per major exterior surface. Existing
 * opaque geometry and lighting; no additional scene meshes or draw passes. */
import * as THREE from 'three';
import type {PixelSurface} from './pixel-recipes.ts';
import {productionPixelPattern,materialTileSize,TILE_WORLD_SIZE} from './pixel-recipes.ts';
type Point={x:number;y:number};
const clamp=(x:number,a=0,b=1)=>Math.max(a,Math.min(b,x));
const nextPow=(n:number)=>Math.min(256,Math.max(32,2**Math.ceil(Math.log2(n))));
export function exteriorAgePixels(kind:PixelSurface,w:number,d:number,seed:number,level:number){
 const width=nextPow(w),height=nextPow(d),tile=materialTileSize(kind),base=productionPixelPattern(kind,(seed>>>0)%4);
 const bytes=new Uint8Array(width*height*4),t=clamp((level-35)/65),severe=t*t;
 let state=seed|0;
 const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)|0;return (state>>>0)/4294967296;};
 const grass=kind==='grass'||kind==='scruffy-grass';
 const hard=kind==='asphalt'||kind==='worn-asphalt'||kind==='concrete'||kind==='sealed-concrete';
 const patches=Array.from({length:grass?8:5},(_,i)=>({
  x:w*(.08+.84*rnd()),y:d*(i<2?(i===0?.07:.93):.15+.7*rnd()),rx:Math.min(w*.22,10+rnd()*26),ry:Math.min(d*.23,6+rnd()*19),phase:rnd()*6.28
 }));
 const paths:Point[][]=[];
 if(hard&&level>=60){
  const horizontal=w>d,along=horizontal?w:d,across=horizontal?d:w;
  for(let j=0;j<Math.min(4,Math.max(1,Math.floor(along/100)));j++){
   const origin=along*(.16+.68*rnd()),start=rnd()<.5?0:across,dir=start===0?1:-1;
   const reach=across*(.38+.56*rnd()),pts:Point[]=[];
   let x=origin;
   for(let k=0;k<6;k++){
    x=clamp(x+(rnd()-.5)*Math.min(18,along*.09),2,along-2);
    const y=start+dir*reach*k/5;pts.push(horizontal?{x,y}:{x:y,y:x});
   }
   paths.push(pts);
   if(j%2===0){const a=pts[3],b=pts[4];paths.push([a,{x:clamp(b.x+8,0,w),y:clamp(b.y-9,0,d)},{x:clamp(b.x+19,0,w),y:clamp(b.y-12,0,d)}]);}
  }
 }
 const dist=(x:number,y:number,a:Point,b:Point)=>{
  const dx=b.x-a.x,dy=b.y-a.y,f=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1));
  return (x-a.x-dx*f)**2+(y-a.y-dy*f)**2;
 };
 for(let iy=0;iy<height;iy++)for(let ix=0;ix<width;ix++){
  const x=(ix+.5)*w/width,y=(iy+.5)*d/height;
  const p=(iy*width+ix)*4,i=((Math.floor(y)%tile)*tile+Math.floor(x)%tile)*4;
  let r=base[i],g=r,b=r,weight=0;
  for(const q of patches){
   const rx=q.rx*(.6+.4*t),ry=q.ry*(.6+.4*t),u=(x-q.x)/rx,v=(y-q.y)/ry;
   const shape=u*u+v*v,edge=.78+.19*Math.sin(Math.atan2(v,u)*3+q.phase);
   if(shape<edge)weight=Math.max(weight,shape<edge*.65?1:.45);
  }
  if(grass){
   r-=Math.round(8*weight*severe);g-=Math.round(57*weight*severe);b-=Math.round(44*weight*severe);
  }else{
   const dark=Math.round(45*weight*severe);r-=dark;g-=dark;b-=dark;
  }
  if(paths.length){
   let fracture=false;const thickness=Math.max(.8,w/width*.55,d/height*.55);
   for(const path of paths)for(let j=1;j<path.length;j++)if(dist(x,y,path[j-1],path[j])<thickness*thickness)fracture=true;
   if(fracture){const ink=Math.round(70*clamp((level-60)/40));r-=ink;g-=ink;b-=ink;}
  }
  bytes[p]=Math.max(0,r);bytes[p+1]=Math.max(0,g);bytes[p+2]=Math.max(0,b);bytes[p+3]=255;
 }
 return {width,height,bytes};
}
export function exteriorAgeMaterial(base:THREE.Material,kind:PixelSurface,w:number,d:number,seed:number,level:number,origin?:Point){
 if(!(base instanceof THREE.MeshStandardMaterial)||level<50)return;
 const {width,height,bytes}=exteriorAgePixels(kind,w,d,seed,level);
 const texture=new THREE.DataTexture(bytes,width,height);
 texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestMipmapLinearFilter;
 texture.generateMipmaps=true;texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
 texture.repeat.set(TILE_WORLD_SIZE/w,TILE_WORLD_SIZE/d);
 if(origin)texture.offset.set(-origin.x/w,-origin.y/d);
 texture.needsUpdate=true;
 const material=base.clone();delete material.userData.fieldworkR718WorldGraphic;material.map=texture;
 return {material,texture};
}
