import {
  terrainHeight, valleyAxisX, localChannelProximity,
} from './terrain-model.ts';
import { visualMaterialWeights } from './surface-materials.ts';

/**
 * Build 030: a perennial, spatially continuous surface-cover property.
 *
 * Long-term drainage, exposure, slope and substrate determine what can
 * support low vegetation. This is not an hourly growth simulation. Rain
 * changes the *appearance* of the established surface, not its coverage.
 */
export type GroundCoverSample={
  coverage:number;
  longTermMoisture:number;
  slope:number;
  fertility:number;
  channelExposure:number;
};
const clamp=(x:number,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a:number,b:number,x:number)=>{
  const t=clamp((x-a)/(b-a));
  return t*t*(3-2*t);
};
const fract=(x:number)=>x-Math.floor(x);
function hash(x:number,z:number):number{
  return fract(Math.sin(x*127.1+z*311.7)*43758.5453123);
}
function noise(x:number,z:number):number{
  const i=Math.floor(x),j=Math.floor(z);
  const fx=fract(x),fz=fract(z);
  const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  const a=hash(i,j),b=hash(i+1,j),c=hash(i,j+1),d=hash(i+1,j+1);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
export function groundCoverAt(x:number,z:number):GroundCoverSample{
  const h=terrainHeight(x,z);
  const valleyY=terrainHeight(valleyAxisX(z),z);
  const aboveValley=Math.max(0,h-valleyY);
  // A fine gradient is measured against the *continuous* terrain, rather
  // than a neighboring hydrology cell's categorical water state.
  const d=.12;
  const sx=(terrainHeight(x+d,z)-terrainHeight(x-d,z))/(2*d);
  const sz=(terrainHeight(x,z+d)-terrainHeight(x,z-d))/(2*d);
  const slope=Math.atan(Math.hypot(sx,sz))*180/Math.PI;
  const weights=visualMaterialWeights(x,z);
  const fertility=
    weights.loam*.98+weights.clay*.55+weights.organic*.85+
    weights.sand*.24+weights.rock*.10;
  const channelExposure=localChannelProximity(x,z);
  const broad=noise(x*.67+16.2,z*.67-3.4);
  const fine=noise(x*1.73-7.9,z*1.73+11.3);
  // Geography-derived potential wetness is independent of present rainfall.
  // Lower drainage terraces are moister; ridge crests and sand are drier.
  const longTermMoisture=clamp(
    .23+.42*Math.exp(-aboveValley/.34)
      +.14*(broad-.5)+.05*weights.organic-.09*weights.sand,
    .04,.96);
  // Grass thrives on drained, consistently moist ground, but struggles
  // in permanently saturated channels, steep slopes and exposed rock.
  const enoughWater=smooth(.12,.38,longTermMoisture);
  const waterlogged=smooth(.76,.96,longTermMoisture);
  const stable=smooth(23,4,slope); // inverse slope response
  const bank=1-.96*smooth(.31,.87,channelExposure);
  const smallVariation=.86+.27*fine;
  const coverage=clamp(
    fertility*enoughWater*(1-.88*waterlogged)*
    (.22+.78*stable)*bank*smallVariation);
  return {coverage,longTermMoisture,slope,fertility,channelExposure};
}

/** Render choice only. Tiny blades exist in a preserved prototype but are
 * not appropriate to the 10 m landscape overview. */
export function showIndividualBlades(worldUnitsPerPixel:number):boolean{
  return Number.isFinite(worldUnitsPerPixel)&&worldUnitsPerPixel<=.0035;
}
