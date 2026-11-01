/** Quantize wear opacity so each kind uses only a few shared GPU materials. */
export const WEAR_ALPHA_BANDS=[.06,.1,.15,.2] as const;
export function wearOpacityBucket(alpha:number):number{
 const normalized=Math.max(0,Math.min(1,Number.isFinite(alpha)?alpha:0));
 let best=0,dist=Infinity;
 for(let i=0;i<WEAR_ALPHA_BANDS.length;i++){
  const d=Math.abs(normalized-WEAR_ALPHA_BANDS[i]);if(d<dist){best=i;dist=d;}
 }
 return best;
}
