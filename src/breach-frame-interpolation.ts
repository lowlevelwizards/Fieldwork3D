/** Render-only interpolation between fixed 60 Hz actor poses.
 * Never mutates simulation or affects ballistic RNG and replay film.
 */
export type RenderActor={x:number;z:number;heading:number;weaponYaw:number};
export type RenderFrame={previous:Record<string,RenderActor>;alpha:number};
type ActorLike={id:string;p:{x:number;y:number};
  heading:number;weaponYaw:number};
const clamp=(t:number)=>Math.max(0,Math.min(1,t));
export const shortestArc=(a:number,b:number)=>
  Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const lerpAngle=(a:number,b:number,t:number)=>
  a+shortestArc(a,b)*clamp(t);
export function renderSnapshot(actors:readonly ActorLike[]){
  const result:Record<string,RenderActor>={};
  for(const a of actors)result[a.id]={x:a.p.x,z:a.p.y,
    heading:a.heading,weaponYaw:a.weaponYaw};
  return result;
}
export function interpolatedActor(actor:ActorLike,frame?:RenderFrame|null):
  RenderActor{
  const b={x:actor.p.x,z:actor.p.y,heading:actor.heading,
    weaponYaw:actor.weaponYaw};
  if(!frame||!frame.previous[actor.id])return b;
  const a=frame.previous[actor.id],t=clamp(frame.alpha);
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,
    heading:lerpAngle(a.heading,b.heading,t),
    weaponYaw:lerpAngle(a.weaponYaw,b.weaponYaw,t)};
}
