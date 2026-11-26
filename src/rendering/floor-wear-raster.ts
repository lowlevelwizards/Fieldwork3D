/** Straight-alpha sRGB mask storage; composite in linear light, like the lit shader. */
import type {Room} from '../breach-site.ts';
import {FLOOR_WEAR_COLOR} from '../worldgen/floor-wear-plan.ts';
import type {WearMark} from '../worldgen/environment-wear.ts';
import {artRGB,artLuma,relativeArtColor} from './material-art-contrast.ts';
import {physicalMaskIndex} from './material-art-scale.ts';
import {wearPixels,wearVariant} from './pixel-decals.ts';
import {wearOpacityBucket,WEAR_ALPHA_BANDS} from './wear-opacity.ts';
import {SRGB_BYTE_TO_LINEAR as linear,linearToSRGBByte as encode} from './surface-color-space.ts';
const masks=new Map<string,Uint8Array>();
export function rasterFloorWear(out:Uint8Array,room:Room,inset:number,marks:readonly WearMark[],size:number,boost=1,baseColor?:number,height=size){
 const w=room.w-inset,d=room.h-inset,left=room.x+inset/2,top=room.y+inset/2;
 if(w<=0||d<=0)return out;
 for(const m of marks){
  if(m.roomId!==room.id||m.width<=0||m.depth<=0)continue;
  const variant=wearVariant(m.id),key=m.kind+':'+variant;
  let mask=masks.get(key);if(!mask){mask=wearPixels(m.kind,variant);masks.set(key,mask);}
  const raw=artRGB(FLOOR_WEAR_COLOR[m.kind]);
  const base=baseColor===undefined?undefined:artRGB(baseColor);
  const direction=m.kind==='mineral'||m.kind==='scratch'||m.kind==='scuff'?(base&&artLuma(base)>180?'dark':'light'):m.kind==='oil'||m.kind==='grease'||m.kind==='soot'?'dark':'auto';
  const color=base?relativeArtColor(base,raw,.8,m.kind==='mineral'?45:25,m.kind==='oil'?110:85,direction):raw;
  const rgb=color.map(c=>linear[c]);
  const c=Math.cos(m.rotation),s=Math.sin(m.rotation),hw=m.width/2,hd=m.depth/2;
  const rx=Math.abs(c)*hw+Math.abs(s)*hd,rz=Math.abs(s)*hw+Math.abs(c)*hd;
  const x0=Math.max(0,Math.floor((m.x-rx-left)/w*size)),x1=Math.min(size-1,Math.ceil((m.x+rx-left)/w*size));
  const y0=Math.max(0,Math.floor((m.y-rz-top)/d*height)),y1=Math.min(height-1,Math.ceil((m.y+rz-top)/d*height));
  const opacity=Math.min(1,WEAR_ALPHA_BANDS[wearOpacityBucket(m.opacity)]*boost);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const dx=left+(x+.5)*w/size-m.x,dz=top+(y+.5)*d/height-m.y;
   const u=(dx*c+dz*s)/m.width+.5,v=(-dx*s+dz*c)/m.depth+.5;
   if(u<0||u>=1||v<0||v>=1)continue;
   const alpha=mask[physicalMaskIndex(u,v,m.width,m.depth)+3]/255*opacity;
   if(alpha<=0)continue;
   const i=(y*size+x)*4,old=out[i+3]/255,combined=alpha+old*(1-alpha);
   for(let k=0;k<3;k++)out[i+k]=encode((rgb[k]*alpha+linear[out[i+k]]*old*(1-alpha))/combined);
   out[i+3]=Math.round(combined*255);
  }
 }
 return out;
}
