/** W2 audition: static architecture is a material plus a sparse set of
 * anchored finish events. No tactical state, time or mutable RNG. */
import type {Site} from '../breach-site.ts';
import {wallExposure} from './wear-exposure.ts';
import {wallPixelSurface} from './pixel-surface-selection.ts';
import {buildingTheme} from './building-palettes.ts';
import {pixelPattern,TILE_PIXELS,TILE_WORLD_SIZE,type PixelSurface} from '../rendering/pixel-recipes.ts';
export const WALL_EFFECTS=['fade','contact','chip','damp','runoff','crack','repair'] as const;
export type WallEffect=typeof WALL_EFFECTS[number];
export type WallEffectFilter='all'|'none'|WallEffect;
export type WallAudition={effect:WallEffectFilter;composition?:'shader'|'baked'|'packed'};
export type SurfaceEvent={kind:WallEffect;cause:string;x:number;y:number;width:number;height:number;threshold:number;priority:number};
export type WallSurfaceRecipe={length:number;height:number;face:-1|1;color:number;surface:PixelSurface;events:SurfaceEvent[]};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const hash=(n:number)=>((Math.imul(n^(n>>>16),0x45d9f3b)>>>0)/4294967295);
const random=(seed:number,salt:number)=>hash(Math.imul(seed+salt,0x9e3779b1));
/** Physical local x follows segment a->b, y increases down from crown.
 * This pilot paints one eligible broad face; W3 packs independent faces. */
export function planWallSurface(site:Site,index:number,height:number):WallSurfaceRecipe{
 const w=site.walls[index],dx=w.b.x-w.a.x,dy=w.b.y-w.a.y;
 const length=Math.hypot(dx,dy)||1,seed=site.seed^Math.imul(index+1,65161);
 const exposure=wallExposure(site,index);
 const surface=wallPixelSurface(site.archetype),color=buildingTheme(site.archetype,site.seed).wall;
 const mx=(w.a.x+w.b.x)/2,my=(w.a.y+w.b.y)/2,nx=-dy/length,ny=dx/length;
 const roomAt=(side:number)=>site.rooms.find(r=>mx+nx*9*side>r.x+1&&mx+nx*9*side<r.x+r.w-1&&my+ny*9*side>r.y+1&&my+ny*9*side<r.y+r.h-1);
 const wet=(side:number)=>['bathroom','restroom','laundry','utility'].includes(roomAt(side)?.purpose??'');
 const face:-1|1=exposure.exterior?exposure.side:wet(1)?1:wet(-1)?-1:random(seed,1)<.5?-1:1;
 const events:SurfaceEvent[]=[];
 const add=(kind:WallEffect,cause:string,x:number,y:number,width:number,h:number,threshold:number,priority:number)=>{
  if(width<=0||h<=0)return;
  events.push({kind,cause,x:clamp(x,0,length),y:clamp(y,0,height),width:Math.min(length,width),height:Math.min(height,h),threshold,priority});
 };
 const project=(x:number,y:number)=>({along:((x-w.a.x)*dx+(y-w.a.y)*dy)/length,distance:Math.abs((x-w.a.x)*nx+(y-w.a.y)*ny)});
 const ends=[0,length];
 const nearest=(x:number)=>ends.reduce((a,b)=>Math.abs(a-x)<Math.abs(b-x)?a:b);
 const edge=random(seed,2)<.5?0:length;
 if(exposure.exterior&&random(seed,3)<.65)add('fade','exposed-coating',length*.5,height*.21,length*.85,height*.4,20,20);
 for(const door of site.doors){
  // Door gaps are real. A mark must lie on the adjacent solid segment, not across it.
  for(const p of [door.a,door.b]){
   const pos=project(p.x,p.y);
   if(pos.distance>6||Math.abs(nearest(pos.along)-pos.along)>8)continue;
   const at=nearest(pos.along),inset=at===0?1:-1;
   add('contact','door:'+door.id,at+inset*5,height*.78,10,7,12,100);
   if(random(seed,7)<.65)add('chip','jamb:'+door.id,at+inset*2,height*.88,5,9,47,92);
   break;
  }
 }
 if(exposure.exterior||wet(face)){
  if(random(seed,4)<(wet(face)?.85:.55))add('damp','moisture-base',length*(.2+.6*random(seed,5)),height-5,Math.min(length,22+random(seed,6)*18),13,30,80);
 }
 if(exposure.exterior)for(const window of site.windows??[]){
  if(window.interior||window.vertical!==(Math.abs(dy)>Math.abs(dx)))continue;
  const pos=project(window.x,window.y);
  if(pos.distance>5)continue;
  // The compiler cuts wall segments around openings. Runoff can only reach
  // adjacent solid wall beside a sill; no painting across an empty aperture.
  const sill=window.sillHeight??14;
  if(sill<=3||pos.along+window.width/2<-8||pos.along-window.width/2>length+8)continue;
  const x=clamp(pos.along,2,Math.max(2,length-2));
  const y=height-sill;
  add('runoff','sill:'+window.id,x,y+Math.min(sill/2,8),6,Math.min(sill,16),30,90);
 }
 if(['plaster','brick','cinderblock','concrete'].includes(surface)&&random(seed,8)<.32)
  add('crack','edge-stress',edge+(edge===0?1:-1)*5,height*.22,12,20,65,50);
 if(site.condition==='renovation'&&random(seed,9)<.45)
  add('repair','renovation',length*(.22+.56*random(seed,10)),height*.45,17,18,22,95);
 return {length,height,face,color,surface,events:events.sort((a,b)=>b.priority-a.priority||a.cause.localeCompare(b.cause))};
}
export function selectWallEvents(recipe:WallSurfaceRecipe,level:number,filter:WallEffectFilter='all'){
 const cap=level<=0?0:level<=25?1:level<=50?2:level<=75?3:4;
 const used=new Set<string>();
 return recipe.events.filter(event=>level>=event.threshold&&(filter==='all'||filter===event.kind)&&!used.has(event.cause)&&!!used.add(event.cause)).slice(0,cap);
}
type RGB=[number,number,number];
const rgb=(hex:number):RGB=>[(hex>>>16)&255,(hex>>>8)&255,hex&255];
const tint=(base:RGB,target:RGB,amount:number):RGB=>base.map((c,i)=>Math.round(c+(target[i]-c)*amount)) as RGB;
/** Sparse pixel stamps precomposed at build/slider time. Alpha is COLOR
 * coverage, never structural transparency. Row zero is the wall top. */
export function wallSurfacePixels(recipe:WallSurfaceRecipe,level:number,width:number,height:number,filter:WallEffectFilter='all'){
 const out=new Uint8Array(width*height*4),base=rgb(recipe.color);
 for(const event of selectWallEvents(recipe,level,filter).reverse()){
  const strength=clamp((level-event.threshold+10)/35,.18,1);
  const palette:Record<WallEffect,RGB>={
   fade:tint(base,[235,232,217],.26),contact:tint(base,[72,76,70],.5),
   chip:tint(base,[178,171,155],.75),damp:tint(base,[75,93,76],.64),
   runoff:tint(base,[83,97,85],.58),crack:tint(base,[65,67,61],.74),
   repair:tint(base,[231,222,199],.4)
  };
  const c=palette[event.kind];
  for(let py=0;py<height;py++)for(let px=0;px<width;px++){
   const wx=(px+.5)/width*recipe.length,wy=(py+.5)/height*recipe.height;
   const u=(wx-event.x)/Math.max(1,event.width/2),v=(wy-event.y)/Math.max(1,event.height/2);
   if(Math.abs(u)>1||Math.abs(v)>1)continue;
   const step=Math.floor(u*5),edge=.12*(Math.abs(step)%3);
   let a=0;
   switch(event.kind){
    case 'fade':a=v<.68-edge?.23:0;break;
    case 'contact':a=(Math.abs(v+.35)<.18&&Math.abs(u)<.84||Math.abs(v-.35)<.13&&u>-.45)?.58:0;break;
    case 'chip':a=Math.abs(u)<.74-edge&&Math.abs(v)<.76&&(v>.05||Math.abs(u)<.32)?.85:0;break;
    case 'damp':a=v>-.48+edge&&Math.abs(u)<.95?(v>.48?.7:.48):0;break;
    case 'runoff':a=v>-.93&&((Math.abs(u+.42)<.24*(1.25-v*.45)&&v<.85)||(Math.abs(u-.38)<.20&&v<.32))?.67:0;break;
    case 'crack':a=Math.abs(u-(Math.floor((v+1)*5)%3-1)*.23)<.14&&Math.abs(v)<.91?.86:0;break;
    case 'repair':a=Math.abs(u)<.82&&Math.abs(v)<.79?.62:0;break;
   }
   if(!a)continue;
   a*=strength;const p=(py*width+px)*4,old=out[p+3]/255,next=a+old*(1-a);
   for(let i=0;i<3;i++)out[p+i]=Math.round((c[i]*a+out[p+i]*old*(1-a))/next);
   out[p+3]=Math.round(next*255);
  }
 }
 return out;
}

// Same finite texture budget as the mask pilot. Linear-light mixing
// mirrors StandardMaterial; retain metric tile sampling, including mirrored
// back-face coordinates and bottom-origin base tile vs top-origin finish.
const srgbLinear=Float64Array.from({length:256},(_,i)=>{
 const v=i/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);
});
const linearByte=(v:number)=>Math.round(255*(v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055));
export function bakedWallSurfacePixels(recipe:WallSurfaceRecipe,level:number,width:number,height:number,filter:WallEffectFilter='all',patterned=true){
 const out=wallSurfacePixels(recipe,level,width,height,filter),base=rgb(recipe.color);
 const tile=patterned?pixelPattern(recipe.surface):null;
 const mod=(v:number)=>((v%TILE_PIXELS)+TILE_PIXELS)%TILE_PIXELS;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*4,a=out[p+3]/255;
  const wx=(x+.5)/width*recipe.length,wy=(y+.5)/height*recipe.height;
  const tx=mod(Math.floor((recipe.face===1?wx:recipe.length-wx)/TILE_WORLD_SIZE*TILE_PIXELS));
  const ty=mod(Math.floor((recipe.height-wy)/TILE_WORLD_SIZE*TILE_PIXELS));
  const q=(ty*TILE_PIXELS+tx)*4;
  for(let i=0;i<3;i++)out[p+i]=linearByte((srgbLinear[base[i]]*(1-a)+srgbLinear[out[p+i]]*a)*(tile?srgbLinear[tile[q+i]]:1));
  out[p+3]=255;
 }
 return out;
}

/** Packed StandardMaterial pilot. Same RGBA8 budget as the legacy 64-row
 * mask: two 29-row faces with one-row duplicated gutters, plus edge swatch.
 * The lowered vertical resolution is an explicit audition tradeoff. */
export const WALL_PACKED_ROWS=64;
export const WALL_PACKED_FACE_ROWS=29;
export const wallPackedFaceStart=(face:-1|1)=>face===1?3:34;
export function packedWallSurfacePixels(recipe:WallSurfaceRecipe,level:number,width:number,filter:WallEffectFilter='all',patterned=true){
 const out=new Uint8Array(width*WALL_PACKED_ROWS*4),base=rgb(recipe.color);
 for(let p=0;p<out.length;p+=4){out.set(base,p);out[p+3]=255;}
 for(const face of [1,-1] as const){
  const pixels=bakedWallSurfacePixels({...recipe,face},level,width,WALL_PACKED_FACE_ROWS,face===recipe.face?filter:'none',patterned);
  const rowBytes=width*4,start=wallPackedFaceStart(face);
  out.set(pixels,start*rowBytes);
  out.set(pixels.subarray(0,rowBytes),(start-1)*rowBytes);
  out.set(pixels.subarray(pixels.length-rowBytes),(start+WALL_PACKED_FACE_ROWS)*rowBytes);
 }
 return out;
}
