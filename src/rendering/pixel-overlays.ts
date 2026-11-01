/** Deliberate localized marks, not repeating grime applied as a material. */
export type PixelOverlay='dust'|'mud'|'tire';
export const overlayForZone=(condition:string|undefined,zone:string):PixelOverlay|null=>{
 // Temporarily disable broad condition tinting. Tire marks only where recently disturbed.
 if(condition==='disturbed'&&(zone==='parking'||zone==='driveway'))return 'tire';
 return null;
};
export function pixelOverlay(kind:PixelOverlay,size=32):Uint8Array{
 const out=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;
  const tire=kind==='tire'&&(x>=6&&x<=9||x>=22&&x<=25)&&(y%7<4);
  out[i]=out[i+1]=out[i+2]=255;out[i+3]=tire?70:0;
 }
 return out;
}
