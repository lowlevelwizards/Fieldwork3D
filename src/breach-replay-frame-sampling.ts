/** Shared historical interpolation for V1 full films and V2 bounded
 * frame windows. Discrete world, target discovery, cover, audio event and
 * mission decisions remain on the LEFT authoritative sample. Only visual
 * animation properties interpolate toward the adjacent recorded sample.
 * This module must never re-run AI, LOS or any live simulation.
 */
import type {ReplayFrame} from './breach-replay.ts';
import type {ReplayMotionRecorder} from './breach-replay-motion.ts';
export type ReplayFrameSpan={
  previous:ReplayFrame;next:ReplayFrame;alpha:number
};
const position=(p:{x:number;y:number})=>({x:p.x,y:p.y});
const shotCopy=<T extends {start:{x:number;y:number};end:{x:number;y:number}}>(s:T):T=>({
  ...s,start:position(s.start),end:position(s.end)
});
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const mixAngle=(a:number,b:number,t:number)=>
  a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
/** No mutation of source frames, including archived operator observations. */
export function sampleReplaySpan(
  span:ReplayFrameSpan,motion:ReplayMotionRecorder
):ReplayFrame{
  if(!Number.isFinite(span.alpha)||span.alpha<0||span.alpha>1)
    throw Error('Invalid authoritative replay interpolation');
  const {previous,next,alpha}=span;
  if(!previous||!next||!Number.isFinite(previous.t)||
    !Number.isFinite(next.t)||next.t<previous.t)
    throw Error('Invalid or nonmonotonic replay sample span');
    const t=previous.t+(next.t-previous.t)*alpha;
    const byId=new Map(next.actors.map(a=>[a.id,a]));
    const actors=previous.actors.map(a=>{
      const b=byId.get(a.id);
      if(!b||!alpha)return {...a,p:position(a.p)};
      return {...a,p:{x:mix(a.p.x,b.p.x,alpha),
        y:mix(a.p.y,b.p.y,alpha)},
        heading:mixAngle(a.heading,b.heading,alpha),
        weaponYaw:mixAngle(a.weaponYaw,b.weaponYaw,alpha),
        travelYaw:mixAngle(a.travelYaw??a.heading,
          b.travelYaw??b.heading,alpha),
        velocity:mix(a.velocity,b.velocity,alpha),
        turning:mix(a.turning,b.turning,alpha),
        aim:mix(a.aim,b.aim,alpha),
        reload:mix(a.reload,b.reload,alpha),
        recoil:mix(a.recoil,b.recoil,alpha),
        stability:mix(a.stability,b.stability,alpha),
        stride:mix(a.stride,b.stride,alpha),
        traversalElevation:a.traversal&&b.traversal&&
          a.traversal.obstacleIndex===b.traversal.obstacleIndex?
          mix(a.traversalElevation,b.traversalElevation,alpha):
          a.traversalElevation,
        traversalElapsed:a.traversal&&b.traversal&&
          a.traversal.obstacleIndex===b.traversal.obstacleIndex?
          mix(a.traversalElapsed,b.traversalElapsed,alpha):
          a.traversalElapsed};
    });
    const nextCivilians=new Map((next.civilians??[]).map(c=>[c.id,c]));
    const civilians=(previous.civilians??[]).map(c=>{
      const later=nextCivilians.get(c.id);
      if(!later||!alpha)return {...c,p:position(c.p)};
      return {...c,p:{
        x:mix(c.p.x,later.p.x,alpha),
        y:mix(c.p.y,later.p.y,alpha)
      },heading:mixAngle(c.heading,later.heading,alpha),
      velocity:mix(c.velocity,later.velocity,alpha)};
    });
    const presentation=motion.presentation(t,actors.map(a=>a.id));
    for(const actor of actors)
      presentation.travelYaw[actor.id]=actor.travelYaw??actor.heading;
    const delta=t-previous.t;
    const nextDoors=new Map(next.doors.map(d=>[d.id,d]));
    const doors=previous.doors.map(d=>{
      const later=nextDoors.get(d.id);
      return {...d,openFraction:later?mix(
        d.openFraction??(d.open?1:0),
        later.openFraction??(later.open?1:0),alpha):d.openFraction};
    });
    return {...previous,t,actors,civilians,doors,presentation,
      shots:previous.shots.map(s=>({...shotCopy(s),age:s.age+delta})),
      grenades:previous.grenades.map(g=>({...g,p:position(g.p),
        from:position(g.from),to:position(g.to)}))};
}
