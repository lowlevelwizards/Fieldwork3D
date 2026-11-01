/** Measures generated and actual masked wear visibility without GPU reads. */
import {wearPixels} from '../rendering/pixel-decals.ts';
import type {WearMark} from './environment-wear.ts';
import {WEAR_ALPHA_BANDS,wearOpacityBucket} from '../rendering/wear-opacity.ts';
export type WearDiagnostic={markCount:number;area:number;byKind:Record<string,number>;
 effectiveAlpha:number;lowVisibility:number};
export function summarizeWear(marks:readonly WearMark[]):WearDiagnostic{
 let area=0,weighted=0,lowVisibility=0;
 const byKind:Record<string,number>={};
 const alphas=new Map<string,number>();
 for(const m of marks){
  byKind[m.kind]=(byKind[m.kind]??0)+1;
  const a=m.width*m.depth;area+=a;
  let mask=alphas.get(m.kind);
  if(mask===undefined){
   const pixels=wearPixels(m.kind);
   let sum=0;for(let i=3;i<pixels.length;i+=4)sum+=pixels[i];
   mask=sum/(pixels.length/4*255);alphas.set(m.kind,mask);
  }
  const effective=mask*WEAR_ALPHA_BANDS[wearOpacityBucket(m.opacity)];
  weighted+=a*effective;
  if(effective<.025)lowVisibility++;
 }
 return {markCount:marks.length,area,byKind,
  effectiveAlpha:area?weighted/area:0,lowVisibility};
}
