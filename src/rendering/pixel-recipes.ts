/** Structured integer-pixel material motifs. The blank pixel is white
 * so source colors remain exactly those authored in building palettes. */
export type PixelSurface =
 'wood'|'plaster'|'brick'|'concrete'|'tile'|'carpet'|'metal'|
 'fabric'|'asphalt'|'earth'|'gravel'|'grass'|'rubber'|'foliage'|'paper'|
 'linoleum'|'sealed-concrete'|'cinderblock'|'siding'|'panel'|
 'plastic'|'porcelain'|'door-wood'|'painted-wood'|'furniture-wood'|'rough-wood'|
 'painted-metal'|'industrial-steel'|'corrugated-metal'|'enamel-metal'|
 'scruffy-grass'|'worn-asphalt'|'packed-earth'|
 'woven-fabric'|'molded-plastic'|'tire-rubber';
export const OPERATOR_REFERENCE_HEIGHT=40;
export const TEXELS_PER_OPERATOR=40;
export const PIXEL_WORLD_SIZE=OPERATOR_REFERENCE_HEIGHT/TEXELS_PER_OPERATOR;
export const TILE_PIXELS=32;
export const TILE_WORLD_SIZE=TILE_PIXELS*PIXEL_WORLD_SIZE;
export const PIXEL_SURFACES:readonly PixelSurface[]=[
 'wood','plaster','brick','concrete','tile','carpet','metal',
 'fabric','asphalt','earth','gravel','grass','rubber','foliage','paper',
 'linoleum','sealed-concrete','cinderblock','siding','panel',
 'plastic','porcelain','door-wood','painted-wood','furniture-wood','rough-wood',
 'painted-metal','industrial-steel','corrugated-metal','enamel-metal',
 'scruffy-grass','worn-asphalt','packed-earth',
 'woven-fabric','molded-plastic','tire-rubber'
];
export const MATERIAL_RECIPE_VERSION=6;
const hash=(x:number,y:number,s:number)=>{
 let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s,1274126177);
 n=Math.imul(n^(n>>>13),1274126177);
 return (n^(n>>>16))>>>0;
};
import {manufacturedSpeck,grainStroke} from './pixel-detail-primitives.ts';
const mod=(n:number,m:number)=>((n%m)+m)%m;
export function pixelPattern(kind:PixelSurface,seed=0,size=32):Uint8Array{
 if(!Number.isInteger(size)||size<8||size>256||(size&(size-1))!==0)
  throw Error('Pixel tiles require power-of-two dimensions from 8 through 256');
 const out=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let shade=255;
  switch(kind){
   case 'wood':{
    const board=Math.floor(y/8),offset=(board%2)*16+mod(seed,7);
    const j=mod(x+offset,32),row=y%8;
    const tone=hash(board,Math.floor((x+offset)/32),seed)%4;
    shade=255-tone*3;
    if(row===0)shade=225;
    else if(row===1)shade=Math.min(shade,245);
    else if(j===0)shade=236;
    else if(row===4&&j>=4&&j<=12)shade=Math.min(shade,244);
    else if(row===6&&j>=20&&j<=27)shade=Math.min(shade,249);
    break;
   }
   case 'door-wood':{
    // Factory-finished panels: subtle *vertical* grain, no horizontal planks.
    const rib=(x+seed%3)%15;
    if(rib===0&&y>2&&y<29)shade=249;
    if(rib===7&&y>=9&&y<=19)shade=252;
    break;
   }
   case 'painted-wood':
    // Painted baseboards and casings are intentionally almost smooth.
    if(x===0&&seed%3===1)shade=252;
    break;
   case 'furniture-wood':{
    // Fine, short directional grain interrupted by broad plain surfaces.
    const line=(y+seed%5)%11;
    if(line===4&&x>4&&x<21)shade=248;
    if(line===7&&x>23&&x<30)shade=251;
    if(grainStroke(x,y,seed))shade=246;
    // Quiet directional second tone, not high-frequency noise.
    // Preserve broad clean tabletop surfaces between subtle grain runs.
    if(y%11===3&&x>=4&&x<=13)shade=Math.min(shade,250);
    break;
   }
   case 'rough-wood':{
    const board=Math.floor(y/6),seam=y%6===0;
    if(seam)shade=226;
    else if((x+seed+board*7)%23===0&&y%6<4)shade=242;
    break;
   }
   case 'brick':case 'cinderblock':{
    const row=Math.floor(y/(kind==='cinderblock'?16:8));
    if(y%(kind==='cinderblock'?16:8)===0||
       mod(x+(row%2)*8+seed%2,kind==='cinderblock'?32:16)===0)
      shade=kind==='cinderblock'?233:217;
    break;
   }
   case 'tile':{
    const row=y%8,col=x%8,tone=hash(Math.floor(x/8),Math.floor(y/8),seed)%4;
    shade=255-tone*3;
    if(row===0||col===0)shade=233;
    else if(row===1||col===1)shade=Math.min(shade,251);
    break;
   }
   case 'metal':case 'panel':case 'painted-metal':case 'industrial-steel':
   case 'corrugated-metal':case 'enamel-metal':{
    if(kind==='corrugated-metal')
      shade=x%8===0?231:x%8===1?248:x%8===7?252:255;
    else if(kind==='industrial-steel')
      shade=x%16===0?239:x%16===1?251:255;
    else if(kind==='painted-metal')
      shade=x%16===0?246:x%16===1?253:255;
    else if(kind==='enamel-metal')shade=x%16===0?251:255;
    else if(x%16===0)shade=kind==='panel'?237:249;
    break;
   }
   case 'siding':
    if(y%8===0)shade=241;
    break;
   case 'concrete':case 'sealed-concrete':{
    const sealed=kind==='sealed-concrete',row=y%32,col=x%32;
    if(row===0||col===0)shade=sealed?245:239;
    else if(row===1||col===1)shade=sealed?253:250;
    else if(!sealed&&col>5&&col<19&&row>7&&row<19)shade=250;
    else if(!sealed&&((col===6||col===25)&&(row===6||row===25)))shade=241;
    else if(sealed&&row>15&&row<24&&col>17&&col<28)shade=253;
    break;
   }
   case 'rubber':case 'tire-rubber':
    if(x%8===0&&y%8<2)shade=kind==='tire-rubber'?236:246;
    if(kind==='tire-rubber'&&x%8===5&&y%8===4)shade=243;
    break;
   case 'carpet':
    if((y%8===3&&x%8>=2&&x%8<=4)||(y%8===5&&x%8>=5&&x%8<=6))shade=251;
    break;
   case 'fabric':case 'woven-fabric':
    if(manufacturedSpeck(x,y,seed,kind==='woven-fabric'?10:16))
      shade=kind==='woven-fabric'?247:251;
    if(kind==='woven-fabric'&&y%9===3&&x%11>=3&&x%11<=5)
      shade=249; // tiny directional stitches: fade before silhouette scale
    break;
   case 'grass':case 'scruffy-grass':{
    // Four small, coherent blade clusters; intentionally empty between them.
    const cx=(5+seed%3),cy=7;
    const sparse=(x===cx&&y===cy)||(x===cx+1&&y===cy-2)||
      (x===24&&y===22)||(x===22&&y===23);
    if(sparse)shade=kind==='scruffy-grass'?227:236;
    else if((x===cx-1&&y===cy-1)||(x===23&&y===21))shade=246;
    if(kind==='scruffy-grass'&&x>=14&&x<=16&&y>=12&&y<=14)shade=239;
    break;
   }
   case 'earth':case 'packed-earth':
    if((x===6&&y===9)||(x===25&&y===21))shade=kind==='packed-earth'?237:245;
    if(kind==='packed-earth'&&y===16&&x>=8&&x<=14)shade=247;
    break;
   case 'gravel':{
    const stone=(x>=7&&x<=9&&y>=8&&y<=9)||
      (x>=23&&x<=25&&y>=21&&y<=22);
    if(stone)shade=226;
    break;
   }
   case 'foliage':{
    // Sparse leaf facets instead of dense camouflage-like noise.
    if((x===9&&y===8)||(x===10&&y===8)||(x===24&&y===23))shade=243;
    break;
   }
   case 'linoleum':
    if(seed%4===1&&x===0)shade=252;
    else if((x%16>=6&&x%16<=8&&y%16===7)||(x%16===12&&y%16>=11&&y%16<=12))shade=253;
    break;
   case 'plaster':
    if(manufacturedSpeck(x,y,seed,32))shade=252;
    break;
   case 'molded-plastic':
    if(x===0&&y>3&&y<29)shade=247;
    else if(x===1&&y>3&&y<29)shade=252;
    break;
   case 'asphalt':case 'worn-asphalt':
    if(manufacturedSpeck(x,y,seed,16))shade=kind==='worn-asphalt'?243:252;
    if(kind==='worn-asphalt'&&y===19&&x>=10&&x<=15)shade=241;
    break;
   case 'paper':case 'plastic':case 'porcelain':break;
  }
  const i=(y*size+x)*4;
  out[i]=shade;out[i+1]=shade;out[i+2]=shade;out[i+3]=255;
 }
 return out;
}
export function pixelRepeats(width:number,height:number):[number,number]{
 return [Math.max(0,width)/TILE_WORLD_SIZE,Math.max(0,height)/TILE_WORLD_SIZE];
}
