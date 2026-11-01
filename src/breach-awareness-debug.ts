/** Developer-only inspection. Never feed diagnostic truth into player HUD. */
import type {TeamActor} from './breach-game.ts';
export function awarenessDebugLine(actor:TeamActor):string{
 const last=actor.awareness.observations.at(-1);
 const active=Object.values(actor.awareness.contacts)
  .filter(x=>x.confidence>.1).sort((a,b)=>b.confidence-a.confidence);
 const top=active[0];
 return [
  actor.name+' · '+actor.personality.toUpperCase(),
  'INTENT '+(actor.intent?.kind??'none')+
   (actor.intent?.reason?' · '+actor.intent.reason:''),
  'COMBAT '+(actor.combatChoice??'none')+
   ' · ROLE '+(actor.coordinationRole??'none'),
  'ALERT '+actor.alert+' · MORALE '+actor.morale.toFixed(2),
  'CONTACTS '+active.length+(top?
   ' · '+top.source+' '+Math.round(top.confidence*100)+'% ±'+
   Math.round(top.uncertainty):''),
  'LATEST '+(last?last.kind+' '+last.source+' @'+last.at.toFixed(1):'none')
 ].join('\n');
}
