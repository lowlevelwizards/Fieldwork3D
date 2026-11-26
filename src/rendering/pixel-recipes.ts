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
import {ART_PIXEL,ART_OPERATOR_HEIGHT,ART_TILE_SIZE} from './material-art-scale.ts';
export const OPERATOR_REFERENCE_HEIGHT=ART_OPERATOR_HEIGHT;
export const TEXELS_PER_OPERATOR=ART_OPERATOR_HEIGHT/ART_PIXEL;
export const PIXEL_WORLD_SIZE=OPERATOR_REFERENCE_HEIGHT/TEXELS_PER_OPERATOR;
export const TILE_PIXELS=ART_TILE_SIZE;
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
export const MATERIAL_RECIPE_VERSION=8;
import {materialTileSize,macroMaterialPixels} from './material-art-macro.ts';
export {materialTileSize} from './material-art-macro.ts';
export function productionPixelPattern(kind:PixelSurface,seed=0){const size=materialTileSize(kind);return size===32?pixelPattern(kind,seed):macroMaterialPixels(kind,seed,size);}
const hash=(x:number,y:number,s:number)=>{
 let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s,1274126177);
 n=Math.imul(n^(n>>>13),1274126177);
 return (n^(n>>>16))>>>0;
};
import {grainStroke} from './pixel-detail-primitives.ts';
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
    shade=255-tone*5;
    if(row===0)shade=225;
    else if(row===1)shade=Math.min(shade,245);
    else if(j===0)shade=236;
    else if((row===3&&j>=3&&j<=12)||(row===4&&j>=9&&j<=19))shade=Math.min(shade,239);
    else if(row===6&&j>=20&&j<=27)shade=Math.min(shade,249);
    break;
   }
   case 'door-wood':{
    const rib=mod(x+seed,16);
    if((rib===3&&y%32>3&&y%32<27)||(rib===9&&y%32>12&&y%32<22))shade=237;
    else if(rib===4&&y%32>8&&y%32<24)shade=246;
    break;
   }
   case 'painted-wood':
    if(x%32===0&&seed%3===1)shade=247;
    break;
   case 'furniture-wood':{
    const row=y%32,col=x%32;
    if((row===4&&col>3&&col<21)||(row===17&&col>14&&col<29))shade=236;
    if((row===5&&col>6&&col<15)||(row===18&&col>18&&col<26))shade=245;
    if((row===24&&col>=8&&col<=12)||(row===25&&col>=7&&col<=10))shade=240;
    if(grainStroke(x,y,seed))shade=Math.min(shade,245);
    break;
   }
   case 'rough-wood':{
    const board=Math.floor(y/8),row=y%8,col=mod(x+board*11,32);
    shade=255-(hash(board,0,seed)%4)*4;
    if(row===0)shade=226;
    else if(row===1)shade=Math.min(shade,244);
    else if((row===4&&col>=3&&col<=16)||(row===6&&col>=19&&col<=28))shade=Math.min(shade,240);
    break;
   }
   case 'brick':case 'cinderblock':{
    const block=kind==='cinderblock',course=block?16:8,row=Math.floor(y/course),span=block?32:16;
    const col=mod(x+(row%2)*span/2,span),h=y%course;
    shade=255-(hash(Math.floor((x+(row%2)*span/2)/span),row,seed)%4)*(block?3:5);
    if(h===0||col===0)shade=block?233:217;
    else if(h===1||col===1)shade=Math.min(shade,block?248:240);
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
    const col=x%16,row=y%32;
    if(kind==='corrugated-metal'){
     const p=x%8;shade=p===0?219:p===1?233:p===2?245:p===6?252:p===7?255:254;
    }else if(kind==='industrial-steel'){
     shade=col===0?238:col===1?247:255;
     if(col===3&&(row===5||row===25))shade=242;
    }else if(kind==='painted-metal'){
     shade=col===0?235:col===1?247:255;
     if(col===3&&row===5)shade=247;
    }else if(kind==='enamel-metal')shade=col===0?251:255;
    else if(kind==='panel')shade=col===0?237:col===1?249:255;
    else if(col===0&&seed%3===1)shade=249;
    break;
   }
   case 'siding':{
    const row=y%8,board=Math.floor(y/8);
    shade=255-(hash(0,board,seed)%3)*2;
    if(row===0)shade=241;
    else if(row===1)shade=249;
    if(mod(x+board*11,32)===0)shade=Math.min(shade,248);
    break;
   }
   case 'concrete':case 'sealed-concrete':{
    const sealed=kind==='sealed-concrete',row=y%32,col=x%32;
    if(row===0||col===0)shade=sealed?245:239;
    else if(row===1||col===1)shade=sealed?253:250;
    else if(!sealed&&col>5&&col<19&&row>7&&row<19&&col+row>17&&col+row<33)shade=241;
    else if(!sealed&&((col===6||col===25)&&(row===6||row===25)))shade=241;
    else if(sealed&&row>15&&row<24&&col>17&&col<28&&col+row>38&&col+row<47)shade=247;
    break;
   }
   case 'rubber':
    if(x%16===0)shade=245;
    else if(x%16===1)shade=251;
    break;
   case 'tire-rubber':{
    const p=x%8,q=mod(y+Math.abs(p-4),8);
    if(q===0||q===1)shade=236;
    else if(p===0||p===7)shade=Math.min(shade,244);
    break;
   }
   case 'carpet':
    if((y%8===3&&x%8>=2&&x%8<=4)||(y%8===4&&x%8>=3&&x%8<=5))shade=239;
    break;
   case 'fabric':case 'woven-fabric':
    if(y%8===3&&x%8>=2&&x%8<=4)shade=kind==='woven-fabric'?232:244;
    if(kind==='woven-fabric'&&x%8===5&&y%8>=4&&y%8<=6)shade=243; // tiny directional stitches: fade before silhouette scale
    break;
   case 'grass':case 'scruffy-grass':{
    const scrub=kind==='scruffy-grass',col=x%32,row=y%32;
    const groups=[[6+mod(seed,3),9],[23,23],[19,5],[7,24]];
    for(const [cx,cy] of groups){
     const dx=col-cx,dy=row-cy;
     if((dx===0&&dy>=-3&&dy<=1)||(dx===-1&&dy>=-1&&dy<=1)||(dx===1&&dy===-2))shade=Math.min(shade,scrub?227:236);
     else if(Math.abs(dx)<=2&&dy>=0&&dy<=2)shade=Math.min(shade,246);
    }
    if(scrub&&((col>=12&&col<=18&&row>=13&&row<=17&&col+row>28)||(col>=16&&col<=21&&row>=16&&row<=19)))shade=Math.min(shade,227);
    break;
   }
   case 'earth':case 'packed-earth':{
    const col=x%32,row=y%32,packed=kind==='packed-earth';
    if((col>=3&&col<=9&&row>=5&&row<=8&&col+row>10)||(col>=20&&col<=25&&row>=22&&row<=25&&col+row<49))shade=packed?230:238;
    else if((col>=13&&col<=21&&row>=14&&row<=16)||(col>=23&&col<=27&&row===8))shade=packed?246:250;
    break;
   }
   case 'gravel':{
    const col=x%16,row=y%16;
    if((col>=2&&col<=5&&row>=3&&row<=5&&col+row>5)||(col>=9&&col<=13&&row>=10&&row<=12&&col+row<24))shade=220;
    else if((col>=3&&col<=4&&row===6)||(col===11&&row===13))shade=240;
    break;
   }
   case 'foliage':{
    const col=x%16,row=y%16;
    if((col>=4&&col<=8&&row>=4&&row<=6&&col+row>8)||(col>=10&&col<=13&&row>=10&&row<=12&&col+row<25))shade=227;
    else if((col===3&&row===5)||(col===8&&row===5)||(col===11&&row===13))shade=249;
    break;
   }
   case 'linoleum':
    if(seed%4===1&&x===0)shade=252;
    else if((x%16>=6&&x%16<=8&&y%16===7)||(x%16===12&&y%16>=11&&y%16<=12))shade=241;
    break;
   case 'plaster':
    if(x>=3&&x<=9&&y>=5&&y<=8&&x+y>10)shade=250;
    break;
   case 'molded-plastic':
    if(x===0&&y>3&&y<29)shade=237;
    else if(x===1&&y>3&&y<29)shade=247;
    break;
   case 'asphalt':case 'worn-asphalt':{
    const worn=kind==='worn-asphalt',col=x%32,row=y%32;
    if((col>=4&&col<=7&&row>=7&&row<=9)||(col>=23&&col<=26&&row>=21&&row<=23))shade=worn?234:245;
    if(worn&&((row===17&&col>=10&&col<=16)||(row===18&&col>=16&&col<=21)||(row===19&&col>=21&&col<=25)))shade=240;
    break;
   }
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
