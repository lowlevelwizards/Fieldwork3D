/** Frozen MA0 wall artwork, lab only. No production dependency. */
import {selectWallEvents,type WallSurfaceRecipe,type WallEffect,type WallEffectFilter} from './worldgen/wall-surface-recipe.ts';
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
type RGB=[number,number,number];
const rgb=(hex:number):RGB=>[(hex>>>16)&255,(hex>>>8)&255,hex&255];
function mixWallColor(a:number,b:number,t:number){const c=tint(rgb(a),rgb(b),t);return (c[0]<<16)|(c[1]<<8)|c[2];}
const tint=(base:RGB,target:RGB,amount:number):RGB=>base.map((c,i)=>Math.round(c+(target[i]-c)*amount)) as RGB;
/** Sparse pixel stamps precomposed at build/slider time. Alpha is COLOR
 * coverage, never structural transparency. Row zero is the wall top. */
function wallSurfacePixels(recipe:WallSurfaceRecipe,level:number,width:number,height:number,filter:WallEffectFilter='all'){
 const out=new Uint8Array(width*height*4),base=rgb(recipe.color);
 for(const event of selectWallEvents(recipe,level,filter).reverse()){
  const strength=clamp((level-event.threshold+10)/35,.18,1);
  const bold=recipe.directional===true;
  const palette:Record<WallEffect,RGB>={
   fade:tint(base,[235,232,217],bold?.39:.26),contact:tint(base,[72,76,70],bold?.71:.5),
   chip:tint(base,[178,171,155],.75),damp:tint(base,[60,78,60],.74),
   runoff:tint(base,[63,82,68],.68),crack:tint(base,[65,67,61],.74),
   repair:tint(base,[231,222,199],.4),moss:tint(base,[65,89,52],.79),rust:tint(base,[139,71,37],.77),
   grease:tint(base,[112,89,50],.65),splash:tint(base,[87,109,105],.53),workgrime:tint(base,[67,65,61],.72)
  };
  const c=palette[event.kind];
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
   const step=Math.floor(u*5),edge=.12*(Math.abs(step)%3);
   let a=0;
   switch(event.kind){
    case 'fade':a=v<.68-edge?(bold?.39:.23):0;break;
    case 'contact':a=(Math.abs(v+.35)<(bold?.27:.18)&&Math.abs(u)<.84||Math.abs(v-.35)<(bold?.22:.13)&&u>-.45)?(bold?.82:.58):0;break;
    case 'chip':a=Math.abs(u)<.74-edge&&Math.abs(v)<.76&&(v>.05||Math.abs(u)<.32)?.85:0;break;
    case 'damp':a=v>-.48+edge&&Math.abs(u)<.95?(v>.48?.84:.60):0;break;
    case 'runoff':a=v>-.93&&((Math.abs(u+.42)<.24*(1.25-v*.45)&&v<.85)||(Math.abs(u-.38)<.20&&v<.32))?(bold?.87:.67):0;break;
    case 'crack':a=Math.abs(u-(Math.floor((v+1)*5)%3-1)*.23)<.14&&Math.abs(v)<.91?.86:0;break;
    case 'repair':a=Math.abs(u)<.82&&Math.abs(v)<.79?(bold?.80:.62):0;break;
    case 'moss':a=v>-.48+edge*2&&Math.abs(u)<.9&&(Math.abs(step)%3!==1||v>.45)?.85:0;break;
    case 'rust':a=v>-.85&&Math.abs(u)<(v<-.2?.64:.25+.15*(1-v))?.84:0;break;
    case 'grease':a=Math.abs(u)<.86-edge&&v>-.76+edge?(v>.25?.65:.39):0;break;
    case 'splash':a=(v>.1&&Math.abs(u)<.87-edge||v>-.72&&Math.abs(u+.44)<.13||v>-.5&&Math.abs(u-.31)<.15)?.54:0;break;
    case 'workgrime':a=Math.abs(u)<.88&&Math.abs(v)<.66-edge&&(Math.abs(v+.2)<.24||Math.abs(v-.35)<.21)?.76:0;break;
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
import {SRGB_BYTE_TO_LINEAR as srgbLinear,linearToSRGBByte as linearByte} from './rendering/surface-color-space.ts';
export function referenceWallPixels(recipe:WallSurfaceRecipe,level:number,width:number,height:number,filter:WallEffectFilter='all',patterned=true){
 const out=wallSurfacePixels(recipe,level,width,height,filter),base=rgb(recipe.color);
 const accent=recipe.band?tint(base,rgb(recipe.band.color),.62):base;
 // Use large physical modules instead of downsampling fine repeated tiles.
 // Mortar and joints are at least one output texel wide at packed resolution.
 const texelX=recipe.length/width,texelY=recipe.height/height;
 const mod=(n:number,d:number)=>((n%d)+d)%d;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*4,a=out[p+3]/255;
  const wx=(x+.5)/width*recipe.length,wy=(y+.5)/height*recipe.height;
  const physicalY=recipe.height-wy;
  const surface=recipe.surface;
  let shade=1;
  if(patterned){
   if(surface==='cinderblock'||surface==='brick'){
    const course=surface==='brick'?7:12,block=course*2,row=Math.floor(physicalY/course);
    if(mod(physicalY,course)<Math.max(texelY,1)||mod(wx+(row%2)*block/2,block)<Math.max(texelX,1))shade=.74;
    else if((Math.floor((wx+(row%2)*block/2)/block)+row*3)%5===0)shade=.92;
   }else if(surface==='tile'){
    if(mod(wx,10)<Math.max(1,texelX)||mod(physicalY,10)<Math.max(1,texelY))shade=.78;
   }else if(surface==='panel'){
    if(mod(wx,24)<Math.max(1,texelX))shade=.70;
   }else if(surface==='siding'){
    if(mod(physicalY,9)<Math.max(1,texelY))shade=.76;
   }else if(surface==='concrete'){
    if(mod(wx,48)<Math.max(1,texelX))shade=.83;
   }
  }
  const color=patterned&&recipe.band&&wy>=recipe.band.top?accent:base;
  for(let i=0;i<3;i++)out[p+i]=linearByte((srgbLinear[color[i]]*(1-a)+srgbLinear[out[p+i]]*a)*shade);
  out[p+3]=255;
 }
 return out;
}

