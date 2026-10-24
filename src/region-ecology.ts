import {
  regionAt, regionalHeight, regionalRiverX, REGION_LENGTH_KM,
  type VerdigrisRegion,
} from './region-model.ts';
import { seeded01 } from './vegetation-model.ts';

const clamp=(x:number,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(v:number)=>{const x=clamp(v,0,1);return x*x*(3-2*x);};
export type MacroBiome='alpine'|'conifer'|'mixed-forest'|'farmland'|'wetland'|'estuary';
export function macroBiome(southKm:number):MacroBiome{
  const r=regionAt(southKm);
  return {
    'Northline Peaks':'alpine',Timberline:'conifer',
    Cutwoods:'mixed-forest',Breadlands:'farmland',
    'Flooded Belt':'wetland','Verdigris City':'estuary',
  }[r] as MacroBiome;
}
export function temperatureC(southKm:number,altitudeM:number):number{
  const coastWarmth=clamp(southKm/REGION_LENGTH_KM)*11;
  return 5+coastWarmth-altitudeM*.0065;
}
export function snowCover(southKm:number,xKm:number,seed=0):number{
  const height=regionalHeight(xKm,southKm,seed);
  const t=temperatureC(southKm,height);
  return clamp((3-t)/9);
}
export function coastalInundation(southKm:number,xKm:number,seed=0):number{
  if(southKm<163)return 0;
  const elevation=regionalHeight(xKm,southKm,seed);
  const low=Math.max(0,1-(elevation-16)/30);
  return smooth((southKm-163)/17)*low;
}
export type Settlement={
  name:string; region:VerdigrisRegion;southKm:number;xKm:number;
  type:'outpost'|'village'|'town'|'industrial'|'port';
  altitudeM:number;wetRisk:number;roadKm:number;
};
const SITES=[
  ['North Watch',16,-1,'outpost'],
  ['Timber Depot',41,1,'industrial'],
  ['Millbridge',65,-1,'village'],
  ['Cutwood Crossing',86,1,'village'],
  ['South Acre',106,-1,'town'],
  ['Granary Junction',122,1,'industrial'],
  ['Reedmarket',141,-1,'village'],
  ['Raised Bank',156,1,'outpost'],
  ['Quay North',167,-1,'town'],
  ['Verdigris Port',178,1,'port'],
] as const;
/** Favor traversable terraces next to, not inside, the river: settlements
 * avoid frequently inundated valley floor and very steep uplands.
 * The road is an authored logistical corridor, not a simulated car system.
 */
export function settlementSites(seed=0):Settlement[]{
  return SITES.map(([name,km,side,type],i)=>{
    const drift=(seeded01(seed*61+i*11)-.5)*.9;
    const southKm=km+drift*.5;
    const river=regionalRiverX(southKm,seed);
    const floor=regionalHeight(river,southKm,seed);
    const xKm=river+side*(4.8+drift);
    const altitude=regionalHeight(xKm,southKm,seed);
    const risk=clamp(1-(altitude-floor)/40);
    return {name,region:regionAt(southKm),southKm,xKm,
      type,altitudeM:altitude,wetRisk:risk,
      roadKm:Math.abs(xKm-river)};
  });
}
export function roadCorridor(southKm:number,bank:-1|1,seed=0):number{
  const river=regionalRiverX(southKm,seed);
  const drift=.25*Math.sin(southKm*.34);
  return river+bank*(4.3+drift);
}
