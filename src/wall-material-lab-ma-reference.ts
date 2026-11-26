/** Frozen first MA artwork from 323088e; only used for lab comparison. */
import {selectWallEvents,type WallSurfaceRecipe,type WallEffect,type WallEffectFilter} from './worldgen/wall-surface-recipe.ts';
import {prepareWallArt,eventArtSeed} from './wall-material-lab-ma-art.ts';
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
type RGB=[number,number,number];
const rgb=(hex:number):RGB=>[(hex>>>16)&255,(hex>>>8)&255,hex&255];
const tint=(base:RGB,target:RGB,amount:number):RGB=>base.map((c,i)=>Math.round(c+(target[i]-c)*amount)) as RGB;
/** Sparse pixel stamps precomposed at build/slider time. Alpha is COLOR
 * coverage, never structural transparency. Row zero is the wall top. */
function wallSurfacePixels(recipe:WallSurfaceRecipe,level:number,width:number,height:number,filter:WallEffectFilter='all'){
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
import {SRGB_BYTE_TO_LINEAR as srgbLinear,linearToSRGBByte as linearByte} from './rendering/surface-color-space.ts';
export function maWallPixels(recipe:WallSurfaceRecipe,level:number,width:number,height:number,filter:WallEffectFilter='all',patterned=true){
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

