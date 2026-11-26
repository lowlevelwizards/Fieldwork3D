/** W2 audition: static architecture is a material plus a sparse set of
 * anchored finish events. No tactical state, time or mutable RNG. */
import {prepareWallArt,eventArtSeed} from './wall-weathering-art.ts';
import type {Site} from '../breach-site.ts';
import type {FixtureWallResidue} from './wall-story-residue.ts';
import {wallExposure} from './wear-exposure.ts';
import {wallPixelSurface} from './pixel-surface-selection.ts';
import {buildingTheme} from './building-palettes.ts';
import type {PixelSurface} from '../rendering/pixel-recipes.ts';
export const WALL_EFFECTS=['fade','contact','chip','damp','runoff','crack','repair','moss','rust','grease','splash','workgrime'] as const;
export type WallEffect=typeof WALL_EFFECTS[number];
export type WallEffectFilter='all'|'none'|WallEffect;
export type WallAudition={effect:WallEffectFilter;atlas?:boolean;story?:boolean};
/** Production default: W6 fixture story plus eligible W3 effects. Explicit historical
 * comparison modes remain available for Map Lab and controlled A/B. */
export function resolveWallSurfaceMode(mode:string|null):WallAudition|undefined{
 if(mode==='legacy')return undefined;
 if(mode==='packed'||mode==='integrated')return {effect:'all'};
 if(mode==='atlas'||mode==='compiled'||mode==='separate'||mode==='unified')return {effect:'all',atlas:true};
 return {effect:'all',atlas:true,story:true};
}
export type SurfaceEvent={kind:WallEffect;cause:string;x:number;y:number;width:number;height:number;threshold:number;priority:number};
export type WallSurfaceRecipe={length:number;height:number;face:-1|1;color:number;surface:PixelSurface;band?:{color:number;top:number};directional?:boolean;artSeed?:number;events:SurfaceEvent[]};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const hash=(n:number)=>((Math.imul(n^(n>>>16),0x45d9f3b)>>>0)/4294967295);
const random=(seed:number,salt:number)=>hash(Math.imul(seed+salt,0x9e3779b1));
/** Physical local x follows segment a->b, y increases down from crown.
 * This pilot paints one eligible broad face; W3 packs independent faces. */
export function planWallSurface(site:Site,index:number,height:number,requestedFace?:-1|1,story?:FixtureWallResidue):WallSurfaceRecipe{
 const w=site.walls[index],dx=w.b.x-w.a.x,dy=w.b.y-w.a.y;
 const length=Math.hypot(dx,dy)||1,seed=site.seed^Math.imul(index+1,65161);
 const exposure=wallExposure(site,index);
 let surface=wallPixelSurface(site.archetype);const theme=buildingTheme(site.archetype,site.seed);let color=theme.wall;
 // A coherent building-wide accent, not a random color for each wall.
 let band=['garage','utility','warehouse','clinic','retail'].includes(site.archetype??'')||site.archetype==='house'&&site.seed%3===0?{color:theme.door,top:height*.67}:undefined;
 const mx=(w.a.x+w.b.x)/2,my=(w.a.y+w.b.y)/2,nx=-dy/length,ny=dx/length;
 const roomAt=(side:number)=>site.rooms.find(r=>mx+nx*9*side>r.x+1&&mx+nx*9*side<r.x+r.w-1&&my+ny*9*side>r.y+1&&my+ny*9*side<r.y+r.h-1);
 const wet=(side:number)=>['bathroom','restroom','laundry','utility'].includes(roomAt(side)?.purpose??'');
 const face:-1|1=requestedFace??(exposure.exterior?exposure.side:wet(1)?1:wet(-1)?-1:random(seed,1)<.5?-1:1);
 const exposed=exposure.exterior&&(requestedFace===undefined||face===exposure.side);
 if(requestedFace!==undefined){
  const room=roomAt(face),kind=site.archetype??'house',purpose=room?.purpose??'';
  if(exposed){
   surface=['house','motel'].includes(kind)?'siding':['townhouse','apartment'].includes(kind)?'brick':kind==='warehouse'?'panel':['garage','utility'].includes(kind)?'cinderblock':'plaster';
   color=surface==='brick'?mixWallColor(theme.wall,0x9c6d55,.58):mixWallColor(theme.wall,theme.trim,.18);
   band=undefined;
  }else if(wet(face)||['kitchen','exam','treatment'].includes(purpose)){
   surface='tile';color=theme.tile;band=undefined;
  }else{
   surface=['garage','utility'].includes(kind)&&['bay','workshop','service','maintenance','storage','equipment'].includes(purpose)?'cinderblock':kind==='warehouse'&&['loading','storage','packing','aisle'].includes(purpose)?'panel':'plaster';
   band=room&&(['clinic','garage','warehouse','retail','utility'].includes(kind)||room.kind==='hall')?{color:theme.door,top:height*.67}:undefined;
  }
 }
 const events:SurfaceEvent[]=[];
 const add=(kind:WallEffect,cause:string,x:number,y:number,width:number,h:number,threshold:number,priority:number)=>{
  if(width<=0||h<=0)return;
  events.push({kind,cause,x:clamp(x,0,length),y:clamp(y,0,height),width:Math.min(length,width),height:Math.min(height,h),threshold,priority});
 };
 const project=(x:number,y:number)=>({along:((x-w.a.x)*dx+(y-w.a.y)*dy)/length,distance:Math.abs((x-w.a.x)*nx+(y-w.a.y)*ny)});
 const ends=[0,length];
 const nearest=(x:number)=>ends.reduce((a,b)=>Math.abs(a-x)<Math.abs(b-x)?a:b);
 const edge=random(seed,2)<.5?0:length;
 if(exposed&&random(seed,3)<.65)add('fade','exposed-coating',length*.5,height*.21,length*.85,height*.4,20,20);
 for(const door of site.doors){
  // Door gaps are real. A mark must lie on the adjacent solid segment, not across it.
  for(const p of [door.a,door.b]){
   const pos=project(p.x,p.y);
   if(pos.distance>6||Math.abs(nearest(pos.along)-pos.along)>8)continue;
   const at=nearest(pos.along),inset=at===0?1:-1;
   add('contact','door:'+door.id,at+inset*(requestedFace===undefined?5:8),height*.78,requestedFace===undefined?14:24,requestedFace===undefined?9:13,12,100);
   if(random(seed,7)<.65)add('chip','jamb:'+door.id,at+inset*2,height*.88,7,12,47,92);
   break;
  }
 }
 if(exposed||wet(face)){
  if(random(seed,4)<(wet(face)?.85:.55))add('damp','moisture-base',length*(.2+.6*random(seed,5)),height-(requestedFace===undefined?7:9),Math.min(length,requestedFace===undefined?30+random(seed,6)*24:44+random(seed,6)*24),requestedFace===undefined?18:24,30,80);
 }
 // W3 only: require an exposed mineral foundation beside a planted zone
 // and a pre-existing moisture event. No vegetation on dry internal paint.
 if(requestedFace!==undefined&&exposed&&['brick','cinderblock','concrete'].includes(surface)){
  const damp=events.find(e=>e.kind==='damp');
  const adjacentGarden=(site.exteriorZones??[]).find(zone=>{
   if(zone.kind!=='yard'&&zone.kind!=='garden')return false;
   const x=mx+nx*face*12,y=my+ny*face*12;
   return x>=zone.x-4&&x<=zone.x+zone.w+4&&y>=zone.y-4&&y<=zone.y+zone.h+4;
  });
  if(damp&&adjacentGarden&&random(seed,12)<.7)
   add('moss','moisture:'+adjacentGarden.id,damp.x,height-4,Math.min(damp.width,22),9,65,83);
 }
 // A panel seam is actual ferrous cladding in this finish recipe.
 // Begin corrosion on that seam, not arbitrarily in a plaster field.
 if(requestedFace!==undefined&&exposed&&surface==='panel'&&length>=30&&random(seed,13)<.65){
  const seam=Math.max(24,Math.min(Math.floor((length-2)/24)*24,Math.round(length*.45/24)*24));
  add('rust','panel-seam:'+seam,seam,height*.79,12,22,50,85);
 }
 if(exposed)for(const window of site.windows??[]){
  if(window.interior||window.vertical!==(Math.abs(dy)>Math.abs(dx)))continue;
  const pos=project(window.x,window.y);
  if(pos.distance>5)continue;
  // The compiler cuts wall segments around openings. Runoff can only reach
  // adjacent solid wall beside a sill; no painting across an empty aperture.
  const sill=window.sillHeight??14;
  if(sill<=3||pos.along+window.width/2<-8||pos.along-window.width/2>length+8)continue;
  const x=clamp(pos.along,2,Math.max(2,length-2));
  const y=height-sill;
  add('runoff','sill:'+window.id,x,y+Math.min(sill/2,8),requestedFace===undefined?6:11,Math.min(sill,16),30,90);
 }
 if(['plaster','brick','cinderblock','concrete'].includes(surface)&&random(seed,8)<.32)
  add('crack','edge-stress',edge+(edge===0?1:-1)*5,height*.22,15,24,65,50);
 if(site.condition==='renovation'&&random(seed,9)<.45)
  add('repair','renovation',length*(.22+.56*random(seed,10)),height*.45,17,18,22,95);
 if(requestedFace!==undefined&&story)for(const event of story.get(index)?.get(face)??[])add(event.kind,event.cause,event.x,event.y,event.width,event.height,event.threshold,event.priority);
 return {length,height,face,color,surface,band,directional:requestedFace!==undefined,artSeed:seed^face,events:events.sort((a,b)=>b.priority-a.priority||a.cause.localeCompare(b.cause))};
}
export function selectWallEvents(recipe:WallSurfaceRecipe,level:number,filter:WallEffectFilter='all'){
 const cap=level<=0?0:level<=25?1:level<=50?2:level<=75?3:4;
 const used=new Set<string>();
 return recipe.events.filter(event=>level>=event.threshold&&(filter==='all'||filter===event.kind)&&!used.has(event.cause)&&!!used.add(event.cause)).slice(0,cap);
}
type RGB=[number,number,number];
const rgb=(hex:number):RGB=>[(hex>>>16)&255,(hex>>>8)&255,hex&255];
function mixWallColor(a:number,b:number,t:number){const c=tint(rgb(a),rgb(b),t);return (c[0]<<16)|(c[1]<<8)|c[2];}
const tint=(base:RGB,target:RGB,amount:number):RGB=>base.map((c,i)=>Math.round(c+(target[i]-c)*amount)) as RGB;
/** Sparse pixel stamps precomposed at build/slider time. Alpha is COLOR
 * coverage, never structural transparency. Row zero is the wall top. */
export function wallSurfacePixels(recipe:WallSurfaceRecipe,level:number,width:number,height:number,filter:WallEffectFilter='all'){
 const out=new Uint8Array(width*height*4),base=rgb(recipe.color);
 for(const event of selectWallEvents(recipe,level,filter).reverse()){
  const progress=clamp((level-event.threshold+10)/(110-event.threshold),.18,1);
  const strength=.38+.62*progress;
  const palette:Record<WallEffect,readonly [RGB,RGB,RGB]>={
   fade:[[225,222,202],[238,232,210],[247,241,220]],
   contact:[[158,151,132],[105,102,87],[67,69,61]],
   chip:[[224,213,188],[173,158,134],[113,104,88]],
   damp:[[201,195,164],[96,112,88],[60,80,63]],
   runoff:[[158,160,128],[86,108,91],[53,78,68]],
   crack:[[220,208,184],[108,104,91],[61,59,51]],
   repair:[[217,211,195],[238,226,205],[175,166,146]],
   moss:[[128,146,79],[87,116,62],[50,76,43]],
   rust:[[190,123,75],[148,78,39],[90,52,35]],
   grease:[[175,151,91],[132,105,60],[88,69,42]],
   splash:[[225,229,209],[125,155,148],[91,115,110]],
   workgrime:[[177,164,140],[100,96,79],[62,61,55]]
  };
  const colors=palette[event.kind].map((p,i)=>tint(base,p,i===2?.84:i===0?.69:.77));
  const shape=prepareWallArt(event.kind,eventArtSeed(event,recipe.artSeed),progress,recipe.length/width/Math.max(1,event.width/2),recipe.height/height/Math.max(1,event.height/2));
  // Visit only the physical stamp rectangle, rather than every texel
  // in every strip for each sparse event.
  const rx=Math.max(1,event.width/2),ry=Math.max(1,event.height/2);
  const x0=Math.max(0,Math.floor((event.x-rx)/recipe.length*width));
  const x1=Math.min(width,Math.ceil((event.x+rx)/recipe.length*width));
  const y0=Math.max(0,Math.floor((event.y-ry)/recipe.height*height));
  const y1=Math.min(height,Math.ceil((event.y+ry)/recipe.height*height));
  for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++){
   const wx=(px+.5)/width*recipe.length,wy=(py+.5)/height*recipe.height;
   const u=(wx-event.x)/Math.max(1,event.width/2),v=(wy-event.y)/Math.max(1,event.height/2);
   if(Math.abs(u)>1||Math.abs(v)>1)continue;
   const {coverage,tone}=shape(u,v);
   let a=coverage;const color=colors[tone];
   if(!a)continue;
   a*=strength;const p=(py*width+px)*4,old=out[p+3]/255,next=a+old*(1-a);
   for(let i=0;i<3;i++)out[p+i]=Math.round((color[i]*a+out[p+i]*old*(1-a))/next);
   out[p+3]=Math.round(next*255);
  }
 }
 return out;
}

// Same finite texture budget as the mask pilot. Linear-light mixing
// mirrors StandardMaterial; retain metric tile sampling, including mirrored
// back-face coordinates and bottom-origin base tile vs top-origin finish.
import {SRGB_BYTE_TO_LINEAR as srgbLinear,linearToSRGBByte as linearByte} from '../rendering/surface-color-space.ts';
export function bakedWallSurfacePixels(recipe:WallSurfaceRecipe,level:number,width:number,height:number,filter:WallEffectFilter='all',patterned=true){
 const out=wallSurfacePixels(recipe,level,width,height,filter),base=rgb(recipe.color);
 const accent=recipe.band?tint(base,rgb(recipe.band.color),.62):base;
 // Use large physical modules instead of downsampling fine repeated tiles.
 // Mortar and joints are at least one output texel wide at packed resolution.
 const texelX=recipe.length/width,texelY=recipe.height/height;
 const mod=(n:number,d:number)=>((n%d)+d)%d;
  const cell=(ix:number,iy:number)=>hash(Math.imul(ix+41,374761393)^Math.imul(iy+17,668265263)^recipe.color);
  const seam=(p:number,spacing:number,thickness:number,texel:number)=>{
   const d=Math.min(mod(p,spacing),spacing-mod(p,spacing));
   return clamp((thickness/2+texel/2-d)/texel);
  };

 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*4,a=out[p+3]/255;
  const wx=(x+.5)/width*recipe.length,wy=(y+.5)/height*recipe.height;
  const physicalY=recipe.height-wy;
  const surface=recipe.surface;
  const paint=patterned&&recipe.band&&wy>=recipe.band.top?accent:base;
  // Quiet, coherent material modules instead of noise or identical flat grids.
  // Keep the old strip footprint; sample a physical seam at fractional coverage.
  let shade=1,color=paint;
  const broad=cell(Math.floor(wx/32),Math.floor(physicalY/20));
  if(patterned){
   if(surface==='brick'||surface==='cinderblock'){
    const brick=surface==='brick',course=brick?7:12,block=course*2,row=Math.floor(physicalY/course),shift=(row%2)*block/2;
    const index=Math.floor((wx+shift)/block),v=cell(index,row);
    const body=brick?tint(paint,[163,84,53],.38):tint(paint,[137,148,146],.38);
    color=tint(body,v<.32?(brick?[125,64,44]:[108,121,120]):(brick?[195,120,81]:[189,195,188]),v<.32?.19:v>.76?.24:.07);
    const joint=Math.max(seam(physicalY,course,.9,texelY),seam(wx+shift,block,.8,texelX));
    color=tint(color,brick?[171,157,135]:[119,126,123],joint*.75);
    // Lower edge gives the block one readable course shadow, not a double outline.
    shade=1-.09*seam(physicalY-1.35,course,.7,texelY);
   }else if(surface==='tile'){
    const v=cell(Math.floor(wx/10),Math.floor(physicalY/10));
    color=tint(paint,[227,235,228],.12+v*.12);
    const joint=Math.max(seam(wx,10,.55,texelX),seam(physicalY,10,.55,texelY));
    color=tint(color,[134,146,143],joint*.47);
   }else if(surface==='panel'){
    color=tint(paint,[97,128,137],.23);
    const n=cell(Math.floor(wx/24),0);
    shade=1+(n-.5)*.09;
    shade-=.25*seam(wx,24,1.15,texelX);
    shade+=.11*seam(wx-1.6,24,.8,texelX);
    // Sparse fasteners only at panel edges; no pervasive speckle.
    if(mod(wx+2,24)<1.2&&Math.min(Math.abs(physicalY-5),Math.abs(physicalY-(recipe.height-5)))<texelY*.55)shade*=.78;
   }else if(surface==='siding'){
    const row=Math.floor(physicalY/9),v=cell(0,row);
    shade=1+(v-.5)*.10-.23*seam(physicalY,9,1.1,texelY)+.07*seam(physicalY-2,9,.65,texelY);
    if(seam(wx+(row%3)*19,57,.65,texelX)>.6)shade*=.91;
   }else if(surface==='concrete'){
    color=tint(paint,[142,149,148],.30);
    shade=1+(broad-.5)*.09-.19*seam(wx,48,.85,texelX);
    if(Math.abs(mod(wx+12,48)-24)<1.1&&Math.abs(mod(physicalY+9,28)-14)<texelY*.55)shade*=.84;
   }else if(surface==='plaster'){
    // Restrained large paint fields. Keep clinically clean finishes calm.
    shade=1+(broad-.5)*.035;
    if(recipe.band&&Math.abs(wy-recipe.band.top)<texelY*.35)shade*=.98;
   }
  }
  for(let i=0;i<3;i++)out[p+i]=linearByte((srgbLinear[color[i]]*(1-a)+srgbLinear[out[p+i]]*a)*shade);
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

/** Independent W3 front/back face authorship. Both use a common local
 * physical x direction, and effects never cross the segment boundary. */
export function planWallFaces(site:Site,index:number,height:number,story?:FixtureWallResidue){
 return {front:planWallSurface(site,index,height,1,story),back:planWallSurface(site,index,height,-1,story)};
}
export type WallFacePair=ReturnType<typeof planWallFaces>;
/** 64 rows per strip, guards aligned to four-pixel mip blocks.
 * Edge swatch rows 0..1; +Z rows 4..27; -Z rows 36..59.
 * No neighboring-strip sampling through mip level 5. At very coarse
 * levels ordinary mip filtering necessarily averages whole strips. */
export const ATLAS_FACE_ROWS=24;
export const atlasFaceStart=(face:-1|1)=>face===1?4:36;
export function atlasWallStrip(pair:WallFacePair,level:number,width:number,filter:WallEffectFilter='all',patterned=true){
 const out=new Uint8Array(width*64*4),base=rgb(pair.front.color),stride=width*4;
 for(let p=0;p<out.length;p+=4){out.set(base,p);out[p+3]=255;}
 for(const recipe of [pair.front,pair.back]){
  const pixels=bakedWallSurfacePixels(recipe,level,width,ATLAS_FACE_ROWS,filter,patterned),start=atlasFaceStart(recipe.face);
  out.set(pixels,start*stride);
  for(let y=recipe.face===1?2:start-4;y<start;y++)out.set(pixels.subarray(0,stride),y*stride);
  for(let y=start+ATLAS_FACE_ROWS;y<start+ATLAS_FACE_ROWS+4;y++)out.set(pixels.subarray(pixels.length-stride),y*stride);
 }
 return out;
}
