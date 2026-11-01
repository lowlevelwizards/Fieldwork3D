/**
 * Build 085–088: one seeded architectural description for rules and renderers.
 * Every wall is explicitly cut around a real Door; no visual-only shortcuts.
 */
import {type Pt,type Segment,type Door,type Obstacle} from './breach-core.ts';
import {applyArchetype} from './breach-archetypes.ts';
import {compileArchitecturalSite} from './worldgen/architectural-compiler.ts';
import {partitionMotelGuestUnits} from './worldgen/motel-suites.ts';
import {orientArchitecturalSite,type EntrySide} from './worldgen/site-orientation.ts';
import {buildingIdentity} from './worldgen/building-identity.ts';
import {measureSiteCompleteness,shouldTryAnotherLayout,preferCompleteCandidate} from './worldgen/site-completeness.ts';
import {attachEncounterPlan} from './worldgen/encounter-director.ts';
import type {EncounterContext,EncounterPlan} from './worldgen/encounter-types.ts';
export type Room={id:string;zoneId?:string;unitId?:string;x:number;y:number;w:number;h:number;
  kind:'room'|'hall';tone:number;purpose?:string};
export type BuildingArchetype='house'|'townhouse'|'apartment'|'retail'|'office'|'garage'|'warehouse'|'restaurant'|'motel'|'utility'|'clinic';
export type ExteriorZone={id:string;kind:'yard'|'patio'|'driveway'|'service'|'garden'|'parking';x:number;y:number;w:number;h:number};
export type WideOpening={id:string;a:Pt;b:Pt;kind:'arch'|'wide'|'serving'};
export type EnvironmentCondition='occupied'|'busy'|'neglected'|'vacant'|'renovation'|'disturbed';
export type WindowStyle='standard'|'tall'|'picture'|'bay'|'industrial'|
  'clerestory'|'awning'|'wire'|'storefront';
export type WindowTreatment='none'|'open-curtains'|'bars'|'boarded';
export type WindowOpening={
 id:string;x:number;y:number;width:number;vertical:boolean;
 /** Decorative family, never a substitute for the physical pane or sill. */
 style?:WindowStyle;
 interior?:boolean;sillHeight?:number;headHeight?:number;
 treatment?:WindowTreatment;
};
export type WorldBounds={minX:number;minY:number;maxX:number;maxY:number};
export type SiteScale='standard'|'expanded'|'small'|'medium'|'large';
export type Site={
  /** Nonpersistent authored practice map; ordinary missions never set this. */
  training?:boolean;
  /** Seed-derived population plan; site.enemies remains the compatibility view. */
  encounter?:EncounterPlan;
  /** Authored semantic programs bypass index-based purpose assignment. */
  programLocked?:boolean;
  identity?:import('./worldgen/building-identity.ts').BuildingIdentity;
  planFamily?:string;
  entrySide?:EntrySide;
  circulationStyle?:import('./worldgen/circulation-grammar.ts').CirculationStyle;
  scale?:SiteScale;
  /** Explicit playable world envelope; legacy maps default to 640 × 740. */
  bounds?:WorldBounds;
  seed:number;name:string;rooms:Room[];walls:Segment[];doors:Door[];
  /** Open hall-to-hall transitions need no obstructing door leaf. */
  openHallLinks?:number;
  archetype?:BuildingArchetype;
  windows?:WindowOpening[];
  enemyHeadings?:number[];
  scenarioStyle?:'routine'|'guarded'|'disrupted';
  condition?:EnvironmentCondition;
  /** Continuous appearance aging 0 (pristine) to 100 (decrepit); render-only. */
  conditionLevel?:number;
  dressing?:import('./worldgen/environment-dresser.ts').DecorativeDetail[];
  furnishingIssues?:{roomId:string;fixture:string;reason:string}[];
  wallDetails?:import('./worldgen/wall-dresser.ts').WallDetail[];
  openings?:WideOpening[];
  exteriorZones?:ExteriorZone[];
  structures?:{id:string;kind:string;x:number;y:number;w:number;h:number}[];
  cover:Obstacle[];entrance:Pt;spawn:Pt[];enemies:Pt[];
  objective:Pt;extract:Pt;roomCount:number;
  units?:{id:string;kind:'motel'|'apartment';roomIds:string[]}[];
  layout:'office'|'workshop'|'corridor'|'courtyard';
};
export const seeded=(seed:number)=>{
  let n=seed>>>0;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;
    return n/4294967296;};
};
/** Every live map now uses the building-specific architectural compiler,
 * regardless of scale. Older square-grid layouts are not in active rotation.
 */
export function generateSite(seed:number,scale:SiteScale='standard',
 onProgress?:(phase:'layout'|'furnishing'|'scoring',attempt:number)=>void,
 encounterContext:EncounterContext={}):Site{
 const kind=(['house','townhouse','apartment','retail','office',
  'garage','warehouse','restaurant','motel','utility','clinic'] as const)
  [(seed>>>0)%11];
 // Keep one semantic building identity and a reproducible sequence of
 // massing variants when a furniture arrangement blocks the critical route.
 const subtype=buildingIdentity(kind,seed,scale,0).subtype;
 let best:Site|undefined;
 let bestGrade:ReturnType<typeof measureSiteCompleteness>|undefined;
 let firstSuccess=-1;
 for(let attempt=0;attempt<6;attempt++){
  // One optional alternate after the first navigable map; do not multiply
  // full scene generation on every mobile load.
  if(firstSuccess>=0&&attempt>firstSuccess+1)break;
  try{
   onProgress?.('layout',attempt);
   const geometry=partitionMotelGuestUnits(
     compileArchitecturalSite(kind,seed+attempt*9973,scale,subtype));
   geometry.seed=seed;
   geometry.identity=buildingIdentity(kind,seed,scale,geometry.roomCount);
   onProgress?.('furnishing',attempt);
   const candidate=attachEncounterPlan(
     applyArchetype(orientArchitecturalSite(geometry,seed),seed),encounterContext);
   onProgress?.('scoring',attempt);
   const grade=measureSiteCompleteness(candidate);
   if(!bestGrade||preferCompleteCandidate(grade,bestGrade)){
    best=candidate;bestGrade=grade;
   }
   if(firstSuccess<0){
    firstSuccess=attempt;
    if(!shouldTryAnotherLayout(grade,scale))return candidate;
   }
   if(grade.score===0)return candidate;
  }catch{/* Retry a different authored physical grammar when disconnected. */}
 }
 if(best)return best;
 throw new Error('Cannot generate connected '+kind+' site for seed '+seed);
}
