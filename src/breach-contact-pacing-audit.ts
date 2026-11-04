/** R8A — retrospective contact pacing, evaluated from the actual operator
 * film. May inspect simulated enemy positions ONLY in the offline audit;
 * never expose hidden hostile coordinates or use this to direct gameplay.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {BattleEvent} from './breach-combat.ts';
import {summarizeMissionPacing} from './breach-mission-pacing.ts';
export type ContactReason='engaged'|'confirmed-no-shot'|'no-hostiles'|
 'no-valid-orders'|'movement-stalled'|'approach-still-distant'|
 'nearby-without-acquisition'|'line-of-sight-or-route-delay'|'unconfirmed-gunfire';
export type ContactPacingAudit={
 reason:ContactReason;firstContactAt:number|null;firstShotAt:number|null;
 nearestHostile:number|null;firstNearestHostile:number|null;
 friendlyTravel:number;hostileTravel:number;
 observationWindow:number;quietApproach:boolean;
};
const d=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.hypot(a.x-b.x,a.y-b.y);
export function analyzeContactPacing(frames:readonly ReplayFrame[],
 events:readonly BattleEvent[],hostileIds:readonly string[],
 acceptedOrders:number,quietApproach=false):ContactPacingAudit{
 const pace=summarizeMissionPacing(events);
 const ids=new Set(hostileIds);
 let closest=Infinity,firstNearest=Infinity,travel=0,hostileTravel=0;
 const first=frames[0],last=frames.at(-1);
 if(first&&last){
  const firstFriends=first.actors.filter(a=>!ids.has(a.id)&&a.health>0);
  const firstHostiles=first.actors.filter(a=>ids.has(a.id)&&a.health>0);
  const destinations=new Map(last.actors.map(a=>[a.id,a]));
  for(const a of firstFriends){
   const end=destinations.get(a.id);
   if(end)travel=Math.max(travel,d(a.p,end.p));
  }
  for(const a of firstHostiles){
   const end=destinations.get(a.id);
   if(end)hostileTravel=Math.max(hostileTravel,d(a.p,end.p));
  }
  for(const a of firstFriends)for(const b of firstHostiles)
   firstNearest=Math.min(firstNearest,d(a.p,b.p));
 }
 // Sample all recorded positions, rather than final proximity alone; a
 // defender might have passed close and then moved away after a firefight.
 for(const frame of frames){
  const friendly=frame.actors.filter(a=>!ids.has(a.id)&&a.health>0);
  const hostiles=frame.actors.filter(a=>ids.has(a.id)&&a.health>0);
  for(const a of friendly)for(const b of hostiles)
   closest=Math.min(closest,d(a.p,b.p));
 }
 const nearestHostile=Number.isFinite(closest)?
  Math.round(closest*10)/10:null;
 const initial=Number.isFinite(firstNearest)?
  Math.round(firstNearest*10)/10:null;
 let reason:ContactReason;
 if(pace.firstContactAt!==null)
  reason=pace.firstShotAt===null?'confirmed-no-shot':'engaged';
 else if(pace.firstShotAt!==null)reason='unconfirmed-gunfire';
 else if(!hostileIds.length)reason='no-hostiles';
 else if(!acceptedOrders)reason='no-valid-orders';
 else if(travel<25)reason='movement-stalled';
 else if(nearestHostile!==null&&nearestHostile>180)
  reason='approach-still-distant';
 else if(nearestHostile!==null&&nearestHostile<65)
  reason='nearby-without-acquisition';
 else reason='line-of-sight-or-route-delay';
 return {reason,firstContactAt:pace.firstContactAt,
  firstShotAt:pace.firstShotAt,nearestHostile,
  firstNearestHostile:initial,
  friendlyTravel:Math.round(travel*10)/10,
  hostileTravel:Math.round(hostileTravel*10)/10,
  observationWindow:last?.t??0,quietApproach};
}
export function summarizeContactPacing(samples:readonly ContactPacingAudit[]){
 const reasons:Record<string,number>={};
 for(const row of samples)reasons[row.reason]=(reasons[row.reason]??0)+1;
 return {trials:samples.length,confirmed:samples.filter(x=>
  x.firstContactAt!==null).length,
  shots:samples.filter(x=>x.firstShotAt!==null).length,
  quietProfiles:samples.filter(x=>x.quietApproach).length,
  reasons};
}
