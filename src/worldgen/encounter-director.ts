/** Migration bridge. Builds 04–07 replace the legacy count and placement
 * while this stable plan remains the one source of session metadata. */
import type {Site} from '../breach-site.ts';
import type {EncounterContext,EncounterPlan,EncounterPremise} from './encounter-types.ts';
import {chooseEncounterPremise} from './encounter-premises.ts';
import {chooseHostileBudget} from './encounter-population.ts';
import {encounterRng} from './encounter-rng.ts';
export function attachEncounterPlan(site:Site,context:EncounterContext={}):Site{
 if(site.training)return site;
 const premise:EncounterPremise=chooseEncounterPremise(site,context);
 const target=chooseHostileBudget(site,context,premise);
 // Migration safety: until the final spatial solver arrives in Build 07,
 // trim only validated legacy placements. Never invent an unvalidated point.
 const slots=site.enemies.map((position,i)=>({position,
   heading:site.enemyHeadings?.[i]??0,i}));
 const rng=encounterRng(context.seed??site.seed,3);
 const selected=slots.map(slot=>({...slot,sort:rng()}))
   .sort((a,b)=>a.sort-b.sort||a.i-b.i)
   .slice(0,Math.min(slots.length,Math.max(2,target)))
   .sort((a,b)=>a.i-b.i);
 const actors=selected.map(({position,heading},i)=>({
   id:'hostile-'+i,groupId:'hostile-'+i,role:'sentry' as const,
   activity:'watching' as const,readiness:'attentive' as const,
   position:{...position},heading,
   weaponProfile:'ordinary' as const
 }));
 const rooms=site.rooms.filter(r=>r.kind==='room');
 const plan:EncounterPlan={
   version:1,seed:context.seed??site.seed,building:site.archetype??'house',
   scale:site.scale??'standard',
   premise,mission:context.mission??'clear',risk:context.risk??1,
   expectedOccupancy:site.identity?.capacity??actors.length,
   hostileBudget:target,
   groups:actors.map(a=>({id:a.groupId,purpose:'security' as const,
     members:[a.id]})),actors,
   diagnostics:{targetHostiles:target,placedHostiles:actors.length,
     rejected:0,fallbacks:0,occupiedZones:0,emptyZones:rooms.length,
     notes:target>actors.length?['placement budget capped by legacy safe locations until Build 07']:[]}
 };
 return {...site,enemies:selected.map(s=>({...s.position})),
   enemyHeadings:selected.map(s=>s.heading),encounter:plan};
}
