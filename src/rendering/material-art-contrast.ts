/** Local-substrate-relative color. Values are bounded sRGB luminance
 * deltas; final displayed contrast is evaluated in the lit lab. */
export type ArtRGB=[number,number,number];
export const artRGB=(hex:number):ArtRGB=>[(hex>>>16)&255,(hex>>>8)&255,hex&255];
export const artHex=(rgb:ArtRGB)=> (rgb[0]<<16)|(rgb[1]<<8)|rgb[2];
export const artLuma=(c:ArtRGB)=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const byte=(x:number)=>Math.max(0,Math.min(255,Math.round(x)));
export function relativeArtColor(base:ArtRGB,target:ArtRGB,amount:number,minDelta:number,maxDelta:number,direction:'light'|'dark'|'auto'='auto'):ArtRGB{
 const mixed=base.map((v,i)=>v+(target[i]-v)*amount) as ArtRGB;
 const lum=artLuma(base),delta=artLuma(mixed)-lum;
 const sign=direction==='light'?1:direction==='dark'?-1:delta>=0?1:-1;
 const desired=sign*Math.max(minDelta,Math.min(maxDelta,Math.abs(delta)));
 return mixed.map(v=>byte(v+desired-delta)) as ArtRGB;
}
