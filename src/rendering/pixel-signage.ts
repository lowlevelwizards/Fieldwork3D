/** Semantic pixel signage patterns: tiny, intentionally abstract artwork. */
export type PixelSignKind='poster'|'picture'|'noticeboard'|'exit'|'package'|'form'|
 'menu'|'sale'|'business'|'wayfinding'|'safety';
const palettes:Record<PixelSignKind,[number,number,number,number]>={
 poster:[0x385b55,0xc8b18b,0xa1654a,0xede2c8],
 picture:[0x526a58,0xa1a77d,0x75614c,0xc4b18a],
 noticeboard:[0x665b46,0xc1aa7b,0xe3d6ac,0x47554e],
 exit:[0xa56a52,0xf0dfb2,0x37534d,0xc9b9a0],
 package:[0x977c55,0xdbbc80,0x66513c,0xeee0b9],
 form:[0xc7c1af,0xebe5d3,0x74796c,0xa8a797],
 menu:[0x343f3e,0xdbc595,0xa37c4b,0xf0dfb5],
 sale:[0x9c473a,0xe5d2a7,0xf0e6cc,0xdbab69],
 business:[0x3a6261,0xd6c69b,0xe4dcc2,0x597c78],
 wayfinding:[0x425c56,0xddceac,0xf0e6cd,0x75978f],
 safety:[0xb18a48,0xe5d8ad,0x3e4944,0xf5e3bd]
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
  }else if(['menu','sale','business','wayfinding','safety'].includes(kind)){
   color=margin?ink:base;
   if(y>7&&y<24&&x>5&&x<27)color=light;
   if(y>25&&y<28&&x>5&&x<27)color=accent;
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
 // Tiny built-in readable lettering, avoiding runtime font loading,
 // browser canvas allocation and non-deterministic rasterization.
 const words:Partial<Record<PixelSignKind,string>>={
  menu:'MENU',sale:'SALE',business:'OPEN',wayfinding:'ROOM',safety:'FIRE'};
 const glyphs:Record<string,readonly string[]>={
  A:['010','101','111','101','101'],E:['111','100','110','100','111'],
  F:['111','100','110','100','100'],I:['111','010','010','010','111'],
  L:['100','100','100','100','111'],M:['101','111','111','101','101'],
  N:['101','111','111','111','101'],O:['111','101','101','101','111'],
  P:['110','101','110','100','100'],R:['110','101','110','101','101'],
  S:['111','100','111','001','111'],U:['101','101','101','101','111']
 };
 const word=words[kind];
 if(word){
  const inkColor=palettes[kind][2];
  const start=Math.floor((32-(word.length*4-1))/2);
  for(let char=0;char<word.length;char++){
   const rows=glyphs[word[char]]??glyphs.O;
   for(let y=0;y<5;y++)for(let x=0;x<3;x++){
    if(rows[y][x]!=='1')continue;
    const i=((y+13)*32+start+char*4+x)*4;
    out[i]=(inkColor>>16)&255;out[i+1]=(inkColor>>8)&255;
    out[i+2]=inkColor&255;out[i+3]=255;
   }
  }
 }
 return out;
}
