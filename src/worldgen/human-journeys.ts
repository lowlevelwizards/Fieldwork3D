/** Bounded human-use journeys through actual furnished sites.
 * Call only in inspections, not during candidate construction or each frame.
 * A role stop is chosen from physically passable samples within the room.
 * Results are advisory, never automatically declare a site unplayable.
 */
import type {Site,BuildingArchetype,Room} from '../breach-site.ts';
import type {Pt} from '../breach-core.ts';
export type JourneyRule={name:string;stops:readonly string[]};
export type JourneyIssue={name:string;from:string;to:string;
 reason:'missing-function'|'blocked-destination'|'unreachable'};
export type JourneyAudit={checkedLegs:number;issues:JourneyIssue[];
 inspected:readonly string[]};
const profiles:Record<BuildingArchetype,readonly JourneyRule[]>={
 house:[{name:'resident',stops:['living','kitchen','bedroom']}],
 townhouse:[{name:'resident',stops:['living','kitchen','bedroom']}],
 apartment:[{name:'resident',stops:['living','kitchen','bedroom']}],
 retail:[{name:'customer',stops:['sales','checkout']},
         {name:'restock',stops:['stockroom','sales']}],
 office:[{name:'visitor',stops:['reception','office']},
         {name:'staff',stops:['office','meeting']}],
 garage:[{name:'customer',stops:['waiting','reception']},
         {name:'mechanic',stops:['parts','bay']}],
 warehouse:[{name:'shipping',stops:['loading','storage','packing']}],
 restaurant:[{name:'patron',stops:['dining','restroom']},
             {name:'kitchen staff',stops:['pantry','kitchen']}],
 motel:[{name:'guest',stops:['reception','guest']}],
 utility:[{name:'maintenance',stops:['service','equipment','control']}],
 clinic:[{name:'patient',stops:['reception','waiting','exam']},
         {name:'clinical staff',stops:['supply','exam']}]
};
export function humanJourneyRules(kind:BuildingArchetype):readonly JourneyRule[]{
 return profiles[kind];
}
function roomSamples(room:Room):Pt[]{
 const result:Pt[]=[];
 for(const dy of [.5,.3,.7])for(const dx of [.5,.3,.7])
  result.push({x:room.x+room.w*dx,y:room.y+room.h*dy});
 return result;
}
export function inspectHumanJourneys(site:Pick<Site,'archetype'|'rooms'|'spawn'>,
 canStand:(p:Pt)=>boolean,canReach:(a:Pt,b:Pt)=>boolean,
 maxLegs=4):JourneyAudit{
 const issues:JourneyIssue[]=[],inspected:string[]=[];
 const kind=site.archetype;
 if(!kind||!site.spawn.length)return {checkedLegs:0,issues,inspected};
 let checkedLegs=0;
 const roomByRole=(role:string)=>site.rooms.filter(r=>r.kind==='room'&&r.purpose===role);
 for(const profile of profiles[kind]){
  inspected.push(profile.name);
  let from=site.spawn[0],fromRole='entry';
  for(const role of profile.stops){
   if(checkedLegs>=maxLegs)break;
   checkedLegs++;
   const candidates=roomByRole(role);
   if(!candidates.length){
    issues.push({name:profile.name,from:fromRole,to:role,reason:'missing-function'});
    continue;
   }
   // A representative usable point is chosen only after checking access.
   // Try up to three passable points per role to avoid center-object false flags.
   const points=candidates.flatMap(roomSamples).filter(canStand);
   if(!points.length){
    issues.push({name:profile.name,from:fromRole,to:role,reason:'blocked-destination'});
    continue;
   }
   const nearest=points.sort((a,b)=>
    Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y));
   const next=nearest.slice(0,3).find(p=>canReach(from,p));
   if(!next){
    issues.push({name:profile.name,from:fromRole,to:role,reason:'unreachable'});
    continue;
   }
   from=next;fromRole=role;
  }
  if(checkedLegs>=maxLegs)break;
 }
 return {checkedLegs,issues,inspected};
}
