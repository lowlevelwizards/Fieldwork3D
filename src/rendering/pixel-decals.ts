/** Tiny procedural decal masks. World-space sizing stays with the plane. */
import {PIXEL_WORLD_SIZE} from './pixel-recipes.ts';
export type WearTextureKind='dust'|'stain'|'scrape'|'scuff'|'oil'|'grease'|'rust'|'chip'|'crack'|'scratch'|'drip'|'mud'|'footprint'|'mineral'|'fade'|'soot'|'moss'|'paint-peel'|'fray'|'abrade';
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
  else if(kind==='scuff')a=(Math.abs(dy+dx*.35)<.08||Math.abs(dy-dx*.2-.23)<.055)&&
    Math.abs(dx)<.88&&hash(x,y,seed)>17?190:0;
  else if(kind==='oil'||kind==='grease')a=radius<(kind==='oil'?.58:.42)+jag&&
    hash(x,y,seed)>11?230:0;
  else if(kind==='rust'||kind==='paint-peel')a=radius<.64+jag&&
    hash(Math.floor(x/3),Math.floor(y/3),seed)>23?210:0;
  else if(kind==='chip')a=radius<.50+jag*.5&&
    hash(Math.floor(x/2),Math.floor(y/2),seed)>31?225:0;
  else if(kind==='crack')a=Math.abs(dx+Math.sin(y*.44+seed)*.15)<.048&&
    Math.abs(dy)<.91?230:0;
  else if(kind==='scratch')a=Math.abs(dy-dx*.32)<.043&&Math.abs(dx)<.88?215:0;
  else if(kind==='drip')a=Math.abs(dx)<(.045+.035*(dy>.46?1:0))&&
    dy>-.75&&dy<.85?170:0;
  else if(kind==='mud')a=radius<.7+jag&&hash(x,y,seed)>35?190:0;
  else if(kind==='footprint')a=((dx*dx/.20+dy*dy/.31)<1&&dy>-.2)||
    ((dx-.1)**2/.09+(dy+.51)**2/.055)<1?190:0;
  else if(kind==='mineral')a=Math.abs(dy+dx*.10)<.18&&
    Math.abs(dx)<.8?155:0;
  else if(kind==='fade')a=radius<.8+jag*.3?90:0;
  else if(kind==='soot')a=radius<.7+jag&&hash(x,y,seed)>24?140:0;
  else if(kind==='moss')a=dy>.17&&radius<.86+jag&&hash(x,y,seed)>35?180:0;
  // Individual loose fibres at textile seams, not a uniform dirt patch.
  else if(kind==='fray')a=
    ((Math.abs(dx)>.63&&Math.abs(dx)<.95&&Math.abs(dy)<.84)&&
     hash(Math.floor(x/2),y,seed)>53)?195:0;
  // Broad shallow rubbed fibres/paint, with uneven directional grain.
  else if(kind==='abrade')a=radius<.78+jag&&
    (Math.abs(dy+Math.sin(x*.49+seed)*.055)<.10||
     Math.abs(dy-.29+dx*.13)<.065)&&hash(x,y,seed)>29?165:0;
  const i=(y*size+x)*4;out[i]=out[i+1]=out[i+2]=255;out[i+3]=a;
 }
 return out;
}
export const wearTexelsForWorld=(worldSize:number)=>
 Math.max(1,Math.round(worldSize/PIXEL_WORLD_SIZE));
