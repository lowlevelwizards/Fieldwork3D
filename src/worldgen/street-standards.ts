/** ST1: dimensions in canonical tactical world units (20/m).
 * Art-direction standards, not a jurisdiction-specific engineering code.
 * Cropped sections explicitly retain the full nominal cross section.
 */
export const STREET_STANDARD_VERSION=1 as const;
export const STREET_DIMENSIONS={
 lane:{min:60,preferred:64,max:70},serviceLane:{min:50,preferred:56,max:60},
 sidewalk:{min:24,preferred:28,max:36},commercialSidewalk:{min:40,preferred:44,max:60},
 curb:3,verge:24,shoulder:20,propertyAccess:34,
 parallel:{width:52,length:120},parking:{width:56,length:114},
 loading:{width:66,length:144},aisle:{oneWay:90,twoWay:116},
 driveway:{single:64,double:112},industrialAccess:96,
 pedestrianClear:24,parkingEdge:6,paintWidth:2,curbCutMin:60
} as const;
export type StreetKind='residential'|'commercial'|'suburban'|'industrial'|'rural';
export type StreetSection={lanes:1|2;laneWidth:number;sidewalkWidth:number;vergeWidth:number;shoulderWidth:number};
export const STREET_SECTIONS:Readonly<Record<StreetKind,StreetSection>>={
 residential:{lanes:2,laneWidth:60,sidewalkWidth:28,vergeWidth:24,shoulderWidth:0},
 commercial:{lanes:2,laneWidth:64,sidewalkWidth:44,vergeWidth:0,shoulderWidth:0},
 suburban:{lanes:2,laneWidth:64,sidewalkWidth:28,vergeWidth:16,shoulderWidth:0},
 industrial:{lanes:2,laneWidth:70,sidewalkWidth:28,vergeWidth:0,shoulderWidth:0},
 rural:{lanes:1,laneWidth:56,sidewalkWidth:0,vergeWidth:0,shoulderWidth:20}
};
export function streetKindFor(archetype:string|undefined,seed:number):StreetKind{
 switch(archetype){
  case 'house':return (seed>>>0)%5===0?'rural':'residential';
  case 'townhouse':case 'apartment':return 'residential';
  case 'office':case 'restaurant':return 'commercial';
  case 'retail':case 'clinic':case 'motel':return 'suburban';
  case 'garage':case 'warehouse':case 'utility':return 'industrial';
  default:return 'residential';
 }
}
