/**
 * Build 085–088: one seeded architectural description for rules and renderers.
 * Every wall is explicitly cut around a real Door; no visual-only shortcuts.
 */
import {type Pt,type Segment,type Door,type Obstacle} from './breach-core.ts';
import {applyArchetype} from './breach-archetypes.ts';
import {compileArchitecturalSite} from './worldgen/architectural-compiler.ts';
import {orientArchitecturalSite,type EntrySide} from './worldgen/site-orientation.ts';
export type Room={id:string;zoneId?:string;x:number;y:number;w:number;h:number;
  kind:'room'|'hall';tone:number;purpose?:string};
export type BuildingArchetype='house'|'townhouse'|'apartment'|'retail'|'office'|'garage'|'warehouse'|'restaurant'|'motel'|'utility'|'clinic';
export type ExteriorZone={id:string;kind:'yard'|'patio'|'driveway'|'service'|'garden'|'parking';x:number;y:number;w:number;h:number};
export type WideOpening={id:string;a:Pt;b:Pt;kind:'arch'|'wide'};
export type EnvironmentCondition='occupied'|'busy'|'neglected'|'vacant'|'renovation'|'disturbed';
export type WindowStyle='standard'|'tall'|'picture'|'bay'|'industrial';
export type WindowTreatment='none'|'open-curtains'|'bars'|'boarded';
export type WindowOpening={
 id:string;x:number;y:number;width:number;vertical:boolean;
 /** Decorative family, never a substitute for the physical pane or sill. */
 style?:WindowStyle;
 treatment?:WindowTreatment;
};
export type WorldBounds={minX:number;minY:number;maxX:number;maxY:number};
export type SiteScale='standard'|'expanded';
export type Site={
  /** Authored semantic programs bypass index-based purpose assignment. */
  programLocked?:boolean;
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
  dressing?:import('./worldgen/environment-dresser.ts').DecorativeDetail[];
  furnishingIssues?:{roomId:string;fixture:string;reason:string}[];
  wallDetails?:import('./worldgen/wall-dresser.ts').WallDetail[];
  openings?:WideOpening[];
  exteriorZones?:ExteriorZone[];
  cover:Obstacle[];entrance:Pt;spawn:Pt[];enemies:Pt[];
  objective:Pt;extract:Pt;roomCount:number;
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
export function generateSite(seed:number,scale:SiteScale='standard'):Site{
 const kind=(['house','townhouse','apartment','retail','office',
  'garage','warehouse','restaurant','motel','utility','clinic'] as const)
  [(seed>>>0)%11];
 // Keep one semantic building identity and a reproducible sequence of
 // massing variants when a furniture arrangement blocks the critical route.
 for(let attempt=0;attempt<6;attempt++){
  const geometry=compileArchitecturalSite(kind,seed+attempt*9973,scale);
  geometry.seed=seed;
  try{return applyArchetype(orientArchitecturalSite(geometry,seed),seed);}
  catch{/* Retry a different architectural grammar, not the old grid. */}
 }
 throw new Error('Cannot generate connected '+kind+' site for seed '+seed);
}
