/** V4: bounded, deterministic stylized stain mask.
 * A shared atlas and per-instance variant preserve the existing impact batch.
 * Pure alpha generation: no Canvas, no random state, no simulation changes.
 * Every nonzero texel lies inside the existing confined mark radius.
 */
export const STAIN_CELL=32,STAIN_VARIANTS=4,BLOOD_STYLE_COUNT=8;
const MATERIAL_STYLES=['wood','stone','metal','glass','dust'] as const;
export const STAIN_STYLE_COUNT=BLOOD_STYLE_COUNT+MATERIAL_STYLES.length*2;
const hash=(n:number)=>{
 n=Math.imul(n^(n>>>16),0x45d9f3b);
 n=Math.imul(n^(n>>>16),0x45d9f3b);
 return (n^(n>>>16))>>>0;
};
export function stainVariant(x:number,y:number):number{
 return hash(Math.imul(Math.round(x*16),73856093)^Math.imul(Math.round(y*16),19349663))%STAIN_VARIANTS;
}
/** Stable per-material pair, appended after unchanged V13 blood tiles. */
export function damageVariant(surface:string|undefined,x:number,y:number):number{
 const index=MATERIAL_STYLES.findIndex(s=>s===surface);
 return index<0?-1:BLOOD_STYLE_COUNT+index*2+stainVariant(x,y)%2;
}
export function damageRadius(surface:string|undefined,count=1):number{
 const base=surface==='stone'?5:surface==='wood'?4.8:surface==='metal'?3.8:surface==='glass'?4.2:4.6;
 return base*(1+.23*(Math.max(1,Math.min(4,count))-1));
}
export function damageTint(surface:string|undefined):number{
 // Tint represents the lighter exposed rim; mask luminance supplies the
 // dark pit. Keep large, distinct silhouettes rather than tiny linework.
 return surface==='wood'?0xc29b72:surface==='stone'?0xc6bba7:
 surface==='metal'?0xbac2c0:surface==='glass'?0xb8d6d7:0xb8ad98;
}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** A single grey+alpha texture represents both the dark core and chipped
 * rim; no lighting, secondary decals, or per-mark texture allocation. */
function damagePixel(v:number,x:number,y:number):[number,number]{
 const kind=Math.floor((v-BLOOD_STYLE_COUNT)/2),flip=v%2===0?1:-1;
 const angle=flip*.32,co=Math.cos(angle),si=Math.sin(angle);
 const u=x*co-y*si,w=x*si+y*co,r=Math.hypot(u,w),a=Math.atan2(w,u);
 let edge:number,core:number,d:number;
 if(kind===0){ // long angular split
  d=Math.abs(u)*.75+Math.abs(w)*1.9;
  edge=.70+.08*Math.cos(3*a);core=.36;
 }else if(kind===1){ // chipped masonry
  d=r;edge=.76+.07*Math.cos(5*a)+.05*Math.sin(3*a);core=.43;
 }else if(kind===2){ // compact dark impact and narrow bright rim
  d=Math.hypot(u*1.1,w*.93);edge=.65+.035*Math.cos(6*a);core=.48;
 }else if(kind===3){ // angular fracture star
  d=r;edge=.38+.37*Math.pow(Math.abs(Math.cos(a*2.5)),6);core=.27;
 }else{ // torn or scuffed soft surface
  d=r;edge=.78+.065*Math.cos(3*a)+.055*Math.sin(5*a);core=.49;
 }
 const alpha=r>.91?0:clamp((edge-d)*12+.5);
 const rim=clamp((d-core)*10+.5);
 const luminance=Math.round(255*(.13+.87*rim));
 return [luminance,Math.round(alpha*255)];
}
export function stainAlphaPixels():Uint8Array{
 const n=STAIN_CELL,out=new Uint8Array(n*n*STAIN_STYLE_COUNT*4);
 for(let v=0;v<STAIN_STYLE_COUNT;v++){
  const pool=v>=STAIN_VARIANTS&&v<BLOOD_STYLE_COUNT;
  const phase=hash(v+1)/4294967296*Math.PI*2;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const x=(i+.5)/n*2-1,y=(j+.5)/n*2-1,r=Math.hypot(x,y);
   const at=(j*n*STAIN_STYLE_COUNT+v*n+i)*4;
   if(v>=BLOOD_STYLE_COUNT){
    const [lum,alpha]=damagePixel(v,x,y);
    out[at]=out[at+1]=out[at+2]=lum;out[at+3]=alpha;continue;
   }
   const a=Math.atan2(y,x);
   const edge=pool?.78+.055*Math.sin(3*a+phase)+.045*Math.sin(5*a-phase):
    .69+.13*Math.sin(3*a+phase)+.065*Math.sin(5*a-phase)+.04*Math.cos(7*a+phase*2);
   let alpha=Math.max(0,Math.min(1,(edge-r)*n/3+.5));
   // Sparse secondary lobes stay within the same confined footprint.
   for(let k=0;k<(pool?0:1);k++){
    const angle=phase+k*2.399;
    const center=.76+.025*Math.sin(k+v);
    const d=Math.hypot(x-Math.cos(angle)*center,y-Math.sin(angle)*center);
    alpha=Math.max(alpha,Math.max(0,Math.min(1,(.13+.025*(k%2)-d)*n/3+.5))*.8);
   }
   if(r>.91)alpha=0;
   out[at]=out[at+1]=out[at+2]=255;out[at+3]=Math.round(alpha*255);
  }
 }
 return out;
}
