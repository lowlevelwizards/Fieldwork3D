/** Bounded, repeating environment overlays: no per-frame decals. */
export type PixelOverlay='dust'|'mud'|'tire';
export const overlayForZone=(condition:string|undefined,zone:string):PixelOverlay|null=>{
 if(zone==='patio')return null;
 if(condition==='occupied')return null;
 if(condition==='disturbed')return zone==='parking'||zone==='driveway'?'tire':'mud';
 if(condition==='neglected'||condition==='vacant')
  return zone==='parking'||zone==='driveway'?'tire':'dust';
 if(condition==='renovation'&&zone==='service')return 'dust';
 if(condition==='busy'&&(zone==='parking'||zone==='driveway'))return 'tire';
 return null;
};
const hash=(x:number,y:number,n:number)=>(
 Math.imul(x+Math.imul(y,37)+Math.imul(n,73),1103515245)>>>13)%100;
export function pixelOverlay(kind:PixelOverlay,size=32):Uint8Array{
 const out=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const coarse=hash(Math.floor(x/3),Math.floor(y/3),11);
  const fine=hash(x,y,23);
  let a=0;
  if(kind==='tire'){
   const rail=x>=6&&x<=10||x>=21&&x<=25;
   if(rail&&(y%6<4||fine>90))a=85;
  }else if(kind==='mud'){
   if(coarse>57&&fine>25)a=100;
  }else if(coarse>77&&fine>60)a=65;
  const i=(y*size+x)*4;
  out[i]=out[i+1]=out[i+2]=255;
  out[i+3]=a;
 }
 return out;
}
