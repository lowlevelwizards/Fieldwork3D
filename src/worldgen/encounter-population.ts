/** Contextual armed population budgets independent of number of room cells.
 * Physical placement limits are handled separately by the spawn solver. */
import type {Site} from '../breach-site.ts';
import type {EncounterContext,EncounterPremise} from './encounter-types.ts';
import {encounterRng} from './encounter-rng.ts';
const modifiers:Record<EncounterPremise,number>={
 routine:0,'after-hours':-1.1,hideout:1.2,guarded:1.6,
 disturbance:.4,defensive:3.1,vacant:-1.9,incident:1.1
};
export function chooseHostileBudget(site:Site,context:EncounterContext,
 premise:EncounterPremise):number{
 const zones=new Set(site.rooms.filter(r=>r.kind==='room').map(r=>r.zoneId??r.id));
 const area=site.rooms.filter(r=>r.kind==='room')
   .reduce((sum,r)=>sum+r.w*r.h,0);
 const capacity=site.identity?.capacity??Math.max(1,zones.size);
 const activity=site.identity?.activity;
 const risk=context.risk??1;
 const mean=1.25+.20*zones.size+.22*Math.sqrt(area/18000)+
   .15*capacity+modifiers[premise]+
   (risk===3?1.2:risk===2?.45:0)+
   (activity==='busy'?.45:activity==='quiet'?-.35:0);
 const rng=encounterRng(context.seed??site.seed,2);
 // Broad overlapping bands and occasional credible upper-tail incidents.
 const variation=(rng()+rng()-1)*3.2+(rng()<.045?2:0);
 // A 2-hostile floor is a migration guard for existing clear/AI audit logic;
 // mission-specific sparse and zero-threat sites arrive with Build 13.
 return Math.max(2,Math.min(12,Math.round(mean+variation)));
}
