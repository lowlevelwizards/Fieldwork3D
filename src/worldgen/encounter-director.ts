/** Scenario director: context determines population, functional anchors establish
 * a believable grouping, and the physical solver commits safe spawn points. */
import type {Site} from '../breach-site.ts';
import type {EncounterContext,EncounterPlan,EncounterPremise,EncounterActorSpec} from './encounter-types.ts';
import {chooseEncounterPremise} from './encounter-premises.ts';
import {chooseHostileBudget} from './encounter-population.ts';
import {composeEncounterGroups} from './encounter-groups.ts';
import {placeEncounterActors} from './encounter-placement.ts';
export function attachEncounterPlan(site:Site,context:EncounterContext={}):Site{
 if(site.training)return site;
 const seed=context.seed??site.seed;
 const premise:EncounterPremise=chooseEncounterPremise(site,context);
 const target=chooseHostileBudget(site,context,premise);
 const anchors=site.enemies;
 // All anchors were checked by the architectural circulation audit.
 // Repeated provisional positions are expanded around them by the solver.
 const provisional:EncounterActorSpec[]=Array.from({length:target},(_,i)=>({
  id:'hostile-'+i,groupId:'hostile-'+i,role:'sentry',
  activity:'watching',readiness:'attentive',
  position:{...anchors[i%anchors.length]},
  heading:site.enemyHeadings?.[i%anchors.length]??0,
  weaponProfile:'ordinary'
 }));
 const composition=composeEncounterGroups(site,provisional,premise,seed);
 const placement=placeEncounterActors(site,composition.actors,composition.groups,seed);
 const actors=placement.actors,rooms=site.rooms.filter(r=>r.kind==='room');
 const occupiedZones=new Set(actors.map(a=>a.zoneId).filter(Boolean)).size;
 const zones=new Set(rooms.map(r=>r.zoneId??r.id));
 const plan:EncounterPlan={
  version:1,seed,building:site.archetype??'house',
  scale:site.scale??'standard',premise,mission:context.mission??'clear',
  risk:context.risk??1,
  expectedOccupancy:site.identity?.capacity??actors.length,hostileBudget:target,
  groups:placement.groups,actors,
  diagnostics:{targetHostiles:target,placedHostiles:actors.length,
   rejected:placement.rejected,fallbacks:placement.fallbacks,
   occupiedZones,emptyZones:Math.max(0,zones.size-occupiedZones),
   notes:actors.length<target?['physical capacity reduced hostile count']:[]}
 };
 return {...site,enemies:actors.map(a=>({...a.position})),
  enemyHeadings:actors.map(a=>a.heading),encounter:plan};
}
