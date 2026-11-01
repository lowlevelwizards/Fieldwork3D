/** Semantic pixel signage patterns: tiny, intentionally abstract artwork. */
export type PixelSignKind='poster'|'picture'|'noticeboard'|'exit'|'package'|'form';
const palettes:Record<PixelSignKind,[number,number,number,number]>={
 poster:[0x385b55,0xc8b18b,0xa1654a,0xede2c8],
 picture:[0x526a58,0xa1a77d,0x75614c,0xc4b18a],
 noticeboard:[0x665b46,0xc1aa7b,0xe3d6ac,0x47554e],
 exit:[0xa56a52,0xf0dfb2,0x37534d,0xc9b9a0],
 package:[0x977c55,0xdbbc80,0x66513c,0xeee0b9],
 form:[0xc7c1af,0xebe5d3,0x74796c,0xa8a797]
};
export const PIXEL_SIGN_KINDS=Object.keys(palettes) as PixelSignKind[];
const shade=(n:number,delta:number)=>{
 const clamp=(x:number)=>Math.max(0,Math.min(255,x));
 return (clamp((n>>16)+delta)<<16)|(clamp(((n>>8)&255)+delta)<<8)|clamp((n&255)+delta);
};
export function pixelSign(kind:PixelSignKind,variant=0):Uint8Array{
 const [base,accent,ink,light]=palettes[kind];
 const out=new Uint8Array(32*32*4);
 const band=3+Math.abs(variant%3);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const margin=x<3||x>28||y<3||y>28;
  let color=base;
  if(kind==='exit'){
   color=margin?accent:base;
   if(y>13&&y<19&&x>6&&x<24)color=light;
   if(x>=19&&x<26&&Math.abs(y-16)<=x-19)color=light;
  }else if(kind==='picture'){
   color=margin?ink:(y<16?accent:base);
   if(x>6&&x<25&&y>10&&y<23&&
       Math.abs(x-16)<Math.abs(y-23)*.9)color=ink;
  }else if(kind==='noticeboard'){
   color=margin?base:accent;
   if(x>6&&x<17&&y>7&&y<17)color=light;
   if(x>18&&x<27&&y>11&&y<23)color=light;
   if((x+y)%11===0&&y>6&&y<26)color=ink;
  }else{
   color=margin?base:light;
   if(y>=5&&y<5+band)color=accent;
   if(x>6&&x<26&&y>13&&y<23)color=accent;
   if(y>24&&y<29&&x>6&&x<23&&x%2<1)color=ink;
   if(kind==='form'&&(y%5===0)&&x>5&&x<27)color=ink;
  }
  if((x*31+y*17+variant*7)%67===0)color=shade(color,-5);
  const j=(y*32+x)*4;
  out[j]=(color>>16)&255;out[j+1]=(color>>8)&255;
  out[j+2]=color&255;out[j+3]=255;
 }
 return out;
}
