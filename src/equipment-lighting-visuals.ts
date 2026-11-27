import {windowCoveringSightSegments} from './breach-window-covering-optics.ts';
/** L1.3: shared, render-only fixture state and physically clipped footprints.
 * This computes NO observations, fog, or illumination authority. Both Canvas
 * and Three consume the same source topology, power revision and obstacles.
 */
import type {Pt} from './breach-core.ts';
import type {Session} from './breach-game.ts';
import {planSiteLighting,siteLightingTopology,
 type SiteLightTopology} from './equipment-site-lighting.ts';
import {buildIlluminationBlockers} from './equipment-light-field.ts';
import {lightRayDistance} from './equipment-weapon-light-beam.ts';

export const FIXTURE_POOL_RAYS=16;
export const FIXTURE_VISUAL_CAP=32;
export type FixtureVisualStatus='mains'|'backup'|'off'|'failed';
export type FixtureVisual={
 id:string;roomId:string;p:Pt;kind:SiteLightTopology['kind'];
 status:FixtureVisualStatus;intensity:number;range:number;height?:number;
 /** A physically stopped, counterclockwise radial fan; index 0 = origin. */
 footprint:readonly Pt[];
};
export type FixtureLightingVisuals={
 fixtures:readonly FixtureVisual[];
 activeCount:number;revision:number;
};
type Cache={
 site:NonNullable<Session['site']>;mode:Session['lightingMode'];
 powerIdentity:Session['sitePower'];
 powerRevision:number;objectRevision:number;
 doorSignature:string;visuals:FixtureLightingVisuals;
};
const snapshots=new WeakMap<Session,Cache>();
/** Cosmetic tint is a shared choice; light power and reach come from Session. */
export function fixtureVisualColor(f:FixtureVisual):number{
 if(f.status==='failed')return 0x65534b;
 if(f.status==='off')return 0x4a5552;
 if(f.status==='backup')return 0xc58e65;
 if(f.kind==='fluorescent')return 0xe1e7d4;
 if(f.kind==='worklight'||f.kind==='street')return 0xe7c48e;
 return 0xe4d5b5;
}
export function fixtureLightingVisuals(s:Session):FixtureLightingVisuals{
 const site=s.site;
 if(!site)return {fixtures:[],activeCount:0,revision:-1};
 const power=s.sitePower?.mode===s.lightingMode?s.sitePower:undefined;
 const powerRevision=power?.revision??-1;
 // Static fixtures do not depend on the simulation clock. A paused site
 // stays cached until power, physical blockers or authored mode changes.
 const objectRevision=s.objectRevision;
 // A replay seek or an interpolated door can change aperture without
 // advancing the world revision. Never reuse a polygon across that change.
 const doorSignature=s.doors.map(d=>d.id+':'+
  (d.openFraction??(d.open?1:0)).toFixed(4)+':'+
  (d.glassShattered?1:0)).join('|');
 const old=snapshots.get(s);
 if(old&&old.site===site&&old.mode===s.lightingMode&&
   old.powerIdentity===power&&old.powerRevision===powerRevision&&old.objectRevision===objectRevision&&
   old.doorSignature===doorSignature)return old.visuals;
 const program=planSiteLighting(site,s.lightingMode,power);
 const active=new Map(program.fixtures.map(f=>[f.id,f]));
 // Same opaque walls, door leaves and tall cover as sight/weapon lights.
 const blockers=buildIlluminationBlockers(site.walls,s.doors,s.coverState,windowCoveringSightSegments(s));
 const fixtures:FixtureVisual[]=[];
 let activeCount=0;
 for(const authored of siteLightingTopology(site).slice(0,FIXTURE_VISUAL_CAP)){
  const lit=active.get(authored.id);
  const status:FixtureVisualStatus=lit?
    lit.power==='backup'?'backup':'mains':
    authored.failed?'failed':'off';
  if(lit)activeCount++;
  const footprint:Pt[]=[{...authored.p}];
  if(lit)for(let i=0;i<FIXTURE_POOL_RAYS;i++){
   const angle=i*Math.PI*2/FIXTURE_POOL_RAYS;
   const distance=lightRayDistance(authored.p,angle,lit.range,blockers);
   footprint.push({x:authored.p.x+Math.cos(angle)*distance,
    y:authored.p.y+Math.sin(angle)*distance});
  }
  fixtures.push({id:authored.id,roomId:authored.roomId,p:authored.p,
   kind:authored.kind,status,height:authored.height,intensity:lit?.intensity??0,
   range:lit?.range??authored.range,footprint});
 }
 const visuals={fixtures,activeCount,revision:powerRevision};
 snapshots.set(s,{site,mode:s.lightingMode,powerIdentity:power,
  powerRevision,objectRevision,
  doorSignature,visuals});
 return visuals;
}
