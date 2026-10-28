/**
 * Build 032: authoritative PLAYABLE coordinate system. Not the previous
 * 180 km fictional-scale atlas in region-model.ts (kept for laboratory
 * regression tests and historical experiments).
 *
 * Global coordinates: x east (+), southM south (+), height y up (metres).
 * Each independently loaded region covers x [-500,500] and local z
 * [-500,500]; its southM is index*1000 + localZ+500.
 */
export const PLAYABLE_REGION_SIZE_M=1000;
export const PLAYABLE_REGION_COUNT=6;
export const PLAYABLE_LENGTH_M=PLAYABLE_REGION_SIZE_M*PLAYABLE_REGION_COUNT;
export const PLAYABLE_HALF_WIDTH_M=PLAYABLE_REGION_SIZE_M/2;
export type PlayableRegionId='northline'|'timberline'|'cutwoods'|'breadlands'|'flooded-belt'|'verdigris-city';
export type PlayableRegion={
  id:PlayableRegionId;name:string;index:number;
  startSouthM:number;endSouthM:number;
  north:PlayableRegionId|null;south:PlayableRegionId|null;
  implemented:boolean;character:string;
};
const names=[
  {id:'northline',name:'Northline Peaks',character:'Alpine headwaters'},
  {id:'timberline',name:'Timberline',character:'Evergreen uplands'},
  {id:'cutwoods',name:'Cutwoods',character:'Mixed forest and upland valley'},
  {id:'breadlands',name:'Breadlands',character:'Fertile terraces and farmland'},
  {id:'flooded-belt',name:'Flooded Belt',character:'Broad wetlands and floodplain'},
  {id:'verdigris-city',name:'Verdigris City',character:'Coastal urban estuary'},
] as const;
export const PLAYABLE_REGIONS:readonly PlayableRegion[]=names.map((r,i)=>({
  ...r,index:i,startSouthM:i*1000,endSouthM:(i+1)*1000,
  north:i===0?null:names[i-1].id,
  south:i===names.length-1?null:names[i+1].id,
  implemented:r.id==='cutwoods',
}));
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const smooth=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
export function playableRegion(id:PlayableRegionId):PlayableRegion{
  const region=PLAYABLE_REGIONS.find(r=>r.id===id);
  if(!region)throw new Error('Unknown playable region');
  return region;
}
export function globalSouthM(id:PlayableRegionId,localZ:number):number{
  return playableRegion(id).startSouthM+PLAYABLE_HALF_WIDTH_M+localZ;
}
export function localSouthZ(id:PlayableRegionId,southM:number):number{
  return southM-playableRegion(id).startSouthM-PLAYABLE_HALF_WIDTH_M;
}
export function regionAtSouthM(southM:number):PlayableRegion{
  const index=clamp(Math.floor(southM/PLAYABLE_REGION_SIZE_M),0,5);
  return PLAYABLE_REGIONS[index];
}
export function regionRiverX(southM:number,seed=31):number{
  const s=clamp(southM,0,PLAYABLE_LENGTH_M);
  return 46*Math.sin(s/385+.31)+31*Math.sin(s/218+1.20)+
    9*Math.sin(s/93+(seed|0)*.023);
}
/** Fixed global edge samples preserve the same river floor for adjoining
 * regions. Headwaters are high; the south terminates at sea level. */
export function valleyFloorM(southM:number):number{
  const elevations=[520,450,330,240,130,55,0];
  const s=clamp(southM,0,PLAYABLE_LENGTH_M);
  const i=Math.min(5,Math.floor(s/1000));
  const t=(s-i*1000)/1000;
  return elevations[i]*(1-t)+elevations[i+1]*t;
}
function regionalRelief(southM:number):number{
  const s=clamp(southM/PLAYABLE_LENGTH_M,0,1);
  return 290*(1-s)+52;
}
const ridge=(x:number,z:number,seed:number)=>
  .5+.5*Math.sin(x/83+z/151+seed*.17)*
    Math.sin(x/143-z/109+seed*.09);
/** World-scale terrain with river incision, broad asymmetric ridges and
 * tributary gullies. All samples depend on GLOBAL south coordinate, not
 * per-region random numbers; neighbor boundaries join without seams. */
export function regionalHeightM(x:number,southM:number,seed=31):number{
  const s=clamp(southM,0,PLAYABLE_LENGTH_M);
  const center=regionRiverX(s,seed);
  const dx=x-center;
  const flank=Math.abs(dx);
  const band=36+16*Math.sin(s/280+.2)**2;
  const rise=smooth((flank-band)/260);
  const asymmetric=dx<0?1.12:.85;
  const underlying=valleyFloorM(s)+regionalRelief(s)*rise*asymmetric;
  const upland=rise*(7.5*Math.sin(x/48+s/95)+5.0*Math.sin(x/93-s/62));
  // Gullies are depressed side valleys that join the north-south floor;
  // they do not yet carry the microscopic 10m hydraulic water solver.
  const gullyCenter=110*Math.sin(s/137+seed*.04);
  const tributary=Math.exp(-Math.pow((s-(2500+gullyCenter))/21,2))*
    smooth((flank-50)/90)*12;
  const smaller=Math.exp(-Math.pow((s-(2800+68*Math.sin(x/115)))/29,2))*
    smooth((flank-70)/110)*6;
  const reliefDetail=rise*(ridge(x,s,seed)-.5)*8;
  // Carved narrow river bed exists in dry weather. Slight depression
  // (rather than an unnatural drawn stripe) is enough at 1km overview.
  const channel=2.0*Math.exp(-Math.pow(flank/12,2));
  return underlying+upland+reliefDetail-tributary-smaller-channel;
}
export function regionLocalHeightM(id:PlayableRegionId,x:number,z:number,seed=31):number{
  return regionalHeightM(x,globalSouthM(id,z),seed);
}
export function regionSlopeDegrees(id:PlayableRegionId,x:number,z:number,seed=31):number{
  const d=4;
  const a=(regionLocalHeightM(id,x+d,z,seed)-regionLocalHeightM(id,x-d,z,seed))/(2*d);
  const b=(regionLocalHeightM(id,x,z+d,seed)-regionLocalHeightM(id,x,z-d,seed))/(2*d);
  return Math.atan(Math.hypot(a,b))*180/Math.PI;
}
export function riverBedDepthM(x:number,southM:number,seed=31):number{
  return 2*Math.exp(-Math.pow((x-regionRiverX(southM,seed))/12,2));
}
