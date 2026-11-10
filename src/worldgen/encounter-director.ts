/** Scenario director: context determines population, functional anchors establish
 * a believable grouping, and the physical solver commits safe spawn points. */
import type {Site} from '../breach-site.ts';
import type {EncounterContext,EncounterPlan,EncounterPremise,EncounterActorSpec} from './encounter-types.ts';
import {chooseEncounterPremise} from './encounter-premises.ts';
import {chooseEncounterProfile} from './encounter-profiles.ts';
import {chooseHostileBudget} from './encounter-population.ts';
import {planCivilians,civilianBudget} from './encounter-civilians.ts';
import {hostileMinimumForContract} from './encounter-population-contract.ts';
import {composeEncounterGroups} from './encounter-groups.ts';
import {placeEncounterActors} from './encounter-placement.ts';
import {assignEncounterActivities} from './encounter-activities.ts';
import {assignEncounterRoutines} from './encounter-routines.ts';
import {assignEncounterRoles,assignObjectiveSecurity}
 from './encounter-roles.ts';
import {assignExteriorOccupants} from './encounter-exteriors.ts';
import {stabilizeEncounterReachability} from './encounter-reachability.ts';
export function attachEncounterPlan(site:Site,context:EncounterContext={}):Site{
 if(site.training)return site;
 const seed=context.seed??site.seed;
 // Default Quick Play and Map Lab use the same seed-selected mission as
 // newSession; explicit Campaign contracts still override that mission.
 const missions=['clear','intel','rescue','hold','capture'] as const;
 const mission=context.mission??missions[(site.seed>>>0)%missions.length];
 const resolved={...context,mission};
 const premise:EncounterPremise=chooseEncounterPremise(site,resolved);
 const profile=chooseEncounterProfile(premise,seed,mission,
   context.enableIncidentIntent?context.incidentId:undefined);
 const target=chooseHostileBudget(site,resolved,premise);
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
 const placement=placeEncounterActors(site,composition.actors,composition.groups,
   seed,profile);
 const spatial=stabilizeEncounterReachability(site,
   assignExteriorOccupants(site,assignEncounterRoles(site,
     placement.actors,placement.groups,premise,mission,seed,false),premise,seed));
 // Unsafe spawn fallback is worse than rejecting a seed. The outer
 // architectural generator can retry a different layout if necessary.
 if(spatial.actors.length<hostileMinimumForContract({
    mission,premise,risk:context.risk??1
   })||
   (mission==='capture'&&!spatial.actors.some(a=>a.role==='target')))
  throw new Error('no safe, mission-complete encounter population');
 const actors=assignEncounterRoutines(site,
   assignEncounterActivities(site,
     assignObjectiveSecurity(site,spatial.actors,mission),premise,seed),seed);
 // Neutral placement is separate from armed encounter groups and never
 // increases the hostileBudget or creates a red actor.
 const neutralBudget=civilianBudget(site,seed,premise,mission,
   context.civilianPolicy);
 const neutrals=planCivilians(site,actors,seed,premise,mission,
   context.civilianPolicy);
 const rooms=site.rooms.filter(r=>r.kind==='room');
 const occupiedZones=new Set(actors.map(a=>a.zoneId).filter(Boolean)).size;
 const zones=new Set(rooms.map(r=>r.zoneId??r.id));
 const plan:EncounterPlan={
  version:1,seed,building:site.archetype??'house',
  scale:site.scale??'standard',premise,profile,mission,
  incidentIntentId:context.enableIncidentIntent?context.incidentId:undefined,
  risk:context.risk??1,
  expectedOccupancy:site.identity?.capacity??actors.length,hostileBudget:target,
  groups:placement.groups.map(g=>({...g,
    members:g.members.filter(id=>actors.some(a=>a.id===id))}))
    .filter(g=>g.members.length>0),actors,neutrals,
  diagnostics:{targetHostiles:target,placedHostiles:actors.length,
   rejected:placement.rejected,fallbacks:placement.fallbacks+spatial.rehomed,
   occupiedZones,emptyZones:Math.max(0,zones.size-occupiedZones),
   notes:['encounter profile: '+profile,
     'civilian population: requested '+neutralBudget+', placed '+neutrals.length,
     ...(neutralBudget>0&&!neutrals.length?
       ['no civilian placement met physical clearance and route constraints']:[]),
     ...(actors.length<target?['physical capacity reduced hostile count']:[]),
     ...(spatial.rehomed?['repositioned unreachable hostile positions']:[])]}
 };
 return {...site,enemies:actors.map(a=>({...a.position})),
  enemyHeadings:actors.map(a=>a.heading),encounter:plan};
}
