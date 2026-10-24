/**
 * Verdigris macro geography — fixed north-to-south valley identity.
 * Coordinates: x in kilometres from the valley center, southKm from
 * Northline's northern edge (0) to Verdigris City (180).
 *
 * Deterministic bounded campaign seeds shift local details; they never
 * reverse the continental north->south drainage or swap regional identities.
 * This LOW resolution geography is independent of the 10 m hydrology testbed.
 */
export const REGION_LENGTH_KM=180;
export const REGION_HALF_WIDTH_KM=24;
export type VerdigrisRegion='Northline Peaks'|'Timberline'|'Cutwoods'
  |'Breadlands'|'Flooded Belt'|'Verdigris City';
export const REGIONS:{name:VerdigrisRegion;startKm:number;endKm:number}[]=[
  {name:'Northline Peaks',startKm:0,endKm:29},
  {name:'Timberline',startKm:29,endKm:61},
  {name:'Cutwoods',startKm:61,endKm:93},
  {name:'Breadlands',startKm:93,endKm:130},
  {name:'Flooded Belt',startKm:130,endKm:159},
  {name:'Verdigris City',startKm:159,endKm:180},
];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const smooth=(t:number)=>{const a=clamp(t,0,1);return a*a*(3-2*a);};
const seedPhase=(seed:number)=>Math.sin((seed|0)*.7387)*.63;
export function regionAt(southKm:number):VerdigrisRegion{
  const km=clamp(southKm,0,REGION_LENGTH_KM);
  return REGIONS.find(r=>km<r.endKm)?.name ?? 'Verdigris City';
}
export function regionalRiverX(southKm:number,seed=0):number{
  const km=clamp(southKm,0,REGION_LENGTH_KM);
  const variation=seed===0?0:seedPhase(seed)*.52*Math.sin(km*.39+seed*.007);
  return .95*Math.sin(km*.081)+.65*Math.sin(km*.145+.8)+variation;
}
export function regionalHeight(xKm:number,southKm:number,seed=0):number{
  const km=clamp(southKm,0,REGION_LENGTH_KM);
  // Monotonically falling floor elevation, from mountains to the estuary.
  const floor=16+1700*Math.pow(1-km/REGION_LENGTH_KM,2.1);
  const d=Math.abs(xKm-regionalRiverX(km,seed));
  const widening=3.2+4.3*smooth(km/REGION_LENGTH_KM);
  const flank=Math.max(0,d-widening);
  const relief=(170+1050*Math.pow(1-km/REGION_LENGTH_KM,1.7))
    *smooth(flank/(REGION_HALF_WIDTH_KM-widening));
  const slopeNoise=relief*.065*Math.sin(xKm*.71+km*.18+seedPhase(seed))
    *Math.sin(km*.31-xKm*.12);
  // Sediment-filled floodplain along the low river corridor; hillsides
  // transition upward outside its margins.
  return floor+relief+slopeNoise;
}
export function regionalFlowDirection(southKm:number,seed=0):number{
  // Always downhill south along the main course, irrespective of campaign
  // detail perturbations. Regional elevations are unmodified by erosion.
  const km=clamp(southKm,0,REGION_LENGTH_KM);
  return regionalHeight(regionalRiverX(km,seed),km,seed)
    -regionalHeight(regionalRiverX(Math.min(REGION_LENGTH_KM,km+.5),seed),
      Math.min(REGION_LENGTH_KM,km+.5),seed);
}
