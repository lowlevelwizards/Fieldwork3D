/** Tiny procedural decal masks. World-space sizing stays with the plane. */
import {PIXEL_WORLD_SIZE} from './pixel-recipes.ts';
export type WearTextureKind='dust'|'stain'|'scrape'|'scuff';
const hash=(x:number,y:number,s:number)=>{
 let n=Math.imul(x+Math.imul(y,127)+Math.imul(s,19),1103515245);
 n^=n>>>13;return (n>>>0)%101;
};
export function wearPixels(kind:WearTextureKind,seed=0,size=32):Uint8Array{
 const out=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(x+.5-size/2)/(size/2),dy=(y+.5-size/2)/(size/2);
  const jag=(hash(Math.floor(x/4),Math.floor(y/4),seed)-50)/180;
  const radius=Math.hypot(dx*.83,dy*.91);
  let a=0;
  if(kind==='stain')a=radius<.70+jag?170:0;
  else if(kind==='dust')a=radius<.84+jag&&hash(x,y,seed+5)>17?100:0;
  else if(kind==='scrape')a=Math.abs(dy+dx*.18)<.12+jag*.35&&Math.abs(dx)<.9?210:0;
  else a=(Math.abs(dy+dx*.35)<.08||Math.abs(dy-dx*.2-.23)<.055)&&
    Math.abs(dx)<.88&&hash(x,y,seed)>17?190:0;
  const i=(y*size+x)*4;out[i]=out[i+1]=out[i+2]=255;out[i+3]=a;
 }
 return out;
}
export const wearTexelsForWorld=(worldSize:number)=>
 Math.max(1,Math.round(worldSize/PIXEL_WORLD_SIZE));
