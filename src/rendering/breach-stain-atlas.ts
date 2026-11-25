/** V4: bounded, deterministic stylized stain mask.
 * A shared atlas and per-instance variant preserve the existing impact batch.
 * Pure alpha generation: no Canvas, no random state, no simulation changes.
 * Every nonzero texel lies inside the existing confined mark radius.
 */
export const STAIN_CELL=32,STAIN_VARIANTS=4,STAIN_STYLE_COUNT=8;
const hash=(n:number)=>{
 n=Math.imul(n^(n>>>16),0x45d9f3b);
 n=Math.imul(n^(n>>>16),0x45d9f3b);
 return (n^(n>>>16))>>>0;
};
export function stainVariant(x:number,y:number):number{
 return hash(Math.imul(Math.round(x*16),73856093)^Math.imul(Math.round(y*16),19349663))%STAIN_VARIANTS;
}
export function stainAlphaPixels():Uint8Array{
 const n=STAIN_CELL,out=new Uint8Array(n*n*STAIN_STYLE_COUNT*4);
 for(let v=0;v<STAIN_STYLE_COUNT;v++){
  const pool=v>=STAIN_VARIANTS;
  const phase=hash(v+1)/4294967296*Math.PI*2;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const x=(i+.5)/n*2-1,y=(j+.5)/n*2-1,r=Math.hypot(x,y);
   const a=Math.atan2(y,x);
   const edge=pool?.78+.055*Math.sin(3*a+phase)+.045*Math.sin(5*a-phase):
    .69+.13*Math.sin(3*a+phase)+.065*Math.sin(5*a-phase)+.04*Math.cos(7*a+phase*2);
   let alpha=Math.max(0,Math.min(1,(edge-r)*n/3+.5));
   // Sparse secondary lobes stay within the same confined footprint.
   for(let k=0;k<(pool?0:3);k++){
    const angle=phase+k*2.399;
    const center=.76+.025*Math.sin(k+v);
    const d=Math.hypot(x-Math.cos(angle)*center,y-Math.sin(angle)*center);
    alpha=Math.max(alpha,Math.max(0,Math.min(1,(.13+.025*(k%2)-d)*n/3+.5))*.8);
   }
   if(r>.91)alpha=0;
   const at=(j*n*STAIN_STYLE_COUNT+v*n+i)*4;
   out[at]=out[at+1]=out[at+2]=255;out[at+3]=Math.round(alpha*255);
  }
 }
 return out;
}
