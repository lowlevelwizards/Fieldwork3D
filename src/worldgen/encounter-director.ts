/** Migration bridge. Builds 04–07 replace the legacy count and placement
 * while this stable plan remains the one source of session metadata. */
import type {Site} from '../breach-site.ts';
import type {EncounterContext,EncounterPlan,EncounterPremise} from './encounter-types.ts';
import {chooseEncounterPremise} from './encounter-premises.ts';
export function attachEncounterPlan(site:Site,context:EncounterContext={}):Site{
 if(site.training)return site;
 const premise:EncounterPremise=chooseEncounterPremise(site,context);
 const actors=site.enemies.map((position,i)=>({
   id:'hostile-'+i,groupId:'hostile-'+i,role:'sentry' as const,
   activity:'watching' as const,readiness:'attentive' as const,
   position:{...position},heading:site.enemyHeadings?.[i]??0,
   weaponProfile:'ordinary' as const
 }));
 const rooms=site.rooms.filter(r=>r.kind==='room');
 const plan:EncounterPlan={
   version:1,seed:context.seed??site.seed,building:site.archetype??'house',
   scale:site.scale??'standard',
   premise,mission:context.mission??'clear',risk:context.risk??1,
   expectedOccupancy:site.identity?.capacity??actors.length,
   hostileBudget:actors.length,
   groups:actors.map(a=>({id:a.groupId,purpose:'security' as const,
     members:[a.id]})),actors,
   diagnostics:{targetHostiles:actors.length,placedHostiles:actors.length,
     rejected:0,fallbacks:0,occupiedZones:0,emptyZones:rooms.length,notes:[]}
 };
 return {...site,encounter:plan};
}
