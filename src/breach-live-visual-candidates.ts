/** Position/heading projection cache, NEVER a visibility cache.
 * LOS, doors, posture, material damage and moving actors are still
 * checked live on every call. Weak keys cannot retain old mission actors.
 */
import {groundView,type GroundView} from './breach-ground-view.ts';
import type {Pt} from './breach-core.ts';
type FacingActor={p:Pt;heading:number};
type CachedProjection={x:number;y:number;heading:number;view:GroundView};
const projections=new WeakMap<FacingActor,CachedProjection>();
export function cachedActorGroundView(actor:FacingActor):GroundView{
  const x=actor.p.x,y=actor.p.y,heading=actor.heading;
  const last=projections.get(actor);
  if(last&&last.x===x&&last.y===y&&last.heading===heading)
    return last.view;
  const view=groundView(x,y,heading);
  projections.set(actor,{x,y,heading,view});
  return view;
}
