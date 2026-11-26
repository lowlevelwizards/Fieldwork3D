/** Large, bounded physical tiles. No repeated isolated damage symbols.
 * All pixels retain 1 world unit pitch; strokes wrap at the tile boundary. */
import type {PixelSurface} from './pixel-recipes.ts';
export function materialTileSize(kind:PixelSurface){
 switch(kind){
  case 'grass':case 'scruffy-grass':case 'asphalt':case 'worn-asphalt':return 128;
  case 'concrete':case 'sealed-concrete':case 'earth':case 'packed-earth':case 'gravel':case 'carpet':case 'linoleum':case 'foliage':return 64;
  default:return 32;
 }
}
export function macroMaterialPixels(kind:PixelSurface,seed:number,size:number){
 const out=new Uint8Array(size*size*4).fill(255);
 let state=(seed+1)^0x41a7bca1;
 const rand=()=>{state=Math.imul(state^state>>>15,0x2c1b3c6d);state=Math.imul(state^state>>>12,0x297a2d39);return ((state^state>>>15)>>>0)/4294967296;};
 const wrap=(v:number)=>(v%size+size)%size;
 const put=(x:number,y:number,shade:number)=>{const i=(wrap(y)*size+wrap(x))*4;out[i]=out[i+1]=out[i+2]=Math.min(out[i],shade);};
 const patch=(cx:number,cy:number,rx:number,ry:number,shade:number)=>{
  const phase=rand()*6.28,skew=(rand()-.5)*.6;
  for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){
   const u=x/rx,v=y/ry,angle=Math.atan2(v,u);
   if((u+skew*v)**2+v*v<.79+.19*Math.sin(angle*3+phase)+.13*Math.cos(angle*5-phase))put(cx+x,cy+y,shade);
  }
 };
 const scattered=(count:number,min:number,max:number,shade:number,elongation=1)=>{
  for(let i=0;i<count;i++){
   const x=Math.floor(rand()*size),y=Math.floor(rand()*size),r=min+Math.floor(rand()*(max-min+1));
   patch(x,y,Math.max(1,Math.round(r*elongation)),r,shade+Math.floor(rand()*5));
  }
 };
 const density=size*size/4096;
 switch(kind){
  case 'grass':case 'scruffy-grass':{
   const rough=kind==='scruffy-grass';
   scattered(Math.round(5*density),7,19,rough?238:244,1.2);
   scattered(Math.round(9*density),3,7,rough?228:235);
   for(let i=0;i<Math.round(19*density);i++){
    const x=Math.floor(rand()*size),y=Math.floor(rand()*size),h=2+Math.floor(rand()*3),dir=rand()<.5?1:-1;
    for(let j=0;j<h;j++){put(x,y-j,rough?222:229);if(j<2)put(x+dir,y-j,rough?234:238);}
    put(x-dir,y,rough?236:241);
   }
   break;
  }
  case 'asphalt':case 'worn-asphalt':{
   const worn=kind==='worn-asphalt';
   scattered(Math.round(3*density),9,21,worn?234:245,1.4);
   scattered(Math.round(18*density),1,3,worn?229:238);
   // Crack networks belong to the surface condition, never the repeat tile.
   break;
  }
  case 'concrete':case 'sealed-concrete':{
   const sealed=kind==='sealed-concrete';
   scattered(7,4,13,sealed?247:239,1.35);
   scattered(24,1,2,sealed?245:231);
   // Real construction joints repeat, individual blemishes do not.
   for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(x%32===0||y%32===0)put(x,y,sealed?241:235);
   break;
  }
  case 'earth':case 'packed-earth':
   scattered(9,4,12,kind==='packed-earth'?232:237,1.35);scattered(19,1,3,227);break;
  case 'gravel':scattered(88,1,3,221);scattered(27,1,2,238);break;
  case 'carpet':scattered(55,1,2,239,1.6);scattered(8,4,8,247);break;
  case 'linoleum':scattered(29,1,2,241);scattered(6,3,5,249);break;
  case 'foliage':scattered(30,2,5,227);scattered(15,3,8,241);break;
 }
 return out;
}
