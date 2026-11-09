/** Authoritative motor stride sampler: velocity and lateral speed belong
 * to fixed simulation frames, never render interpolation or animation.
 */
import {type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {injurySpeed} from './breach-combat.ts';
import {approachingNarrowThreshold} from './breach-passage.ts';
const clamp=(x:number,low:number,high:number)=>Math.max(low,Math.min(high,x));
export function sampleActorMotorStride(a:TeamActor,s:Session,
 p:Pt,direction:number,dt:number,gap:number,speedScale:number):{
 canAutoSidestep:boolean;move:Pt}{
  const canAutoSidestep=a.side==='blue'&&a.health>0&&
    a.pace!=='run'&&!a.squeeze&&!a.traversal&&!a.traversalPending&&
    !a.aimInstruction&&!approachingNarrowThreshold(a.p,p,s.doors)&&
    (a.plan[0]?.kind==='move'||a.plan[0]?.kind==='door')&&
    a.plan[0]?.moveMode!=='sprint'&&
    a.plan[0]?.moveMode!=='strafe'&&
    a.plan[0]?.aimMode!=='track'&&
    a.plan[0]?.aimMode!=='fixed'&&a.plan[0]?.facing===undefined;
  // Ordinary cautious travel must fit within achievable step cadence.
  // Running retains the faster existing speed via the pace multiplier.
  const movingSpeed=a.side==='blue'?53:48;
  const suppression=clamp(1-a.suppression*.4,.45,1);
  const requested=movingSpeed*(a.posture==='crouch'?.58:1)*suppression*
    speedScale*injurySpeed(a.injuryStage)*(a.loadMovementScale??1);
  // A lateral shuffle cannot use the same stride speed as forward running.
  // Scale the limit continuously for diagonal travel, preserving ordinary
  // forward movement and crouch/injury speed reductions.
  const lateral=Math.abs(Math.sin(direction-a.heading));
  const sideLimit=(38+37*(1-lateral*lateral))*
    (a.posture==='crouch'?.58:1)*injurySpeed(a.injuryStage)*
    (a.loadMovementScale??1);
  // Narrow travel is genuine slow sideways movement, not a global
  // reduction to actor collision radius or a high-speed clipping shortcut.
  const desired=Math.min(requested,sideLimit,a.squeeze?16:Infinity);
  a.velocity+=(desired-a.velocity)*Math.min(1,dt*6);
  const advance=Math.min(gap,a.velocity*dt);
  const move={x:a.p.x+Math.cos(direction)*advance,
    y:a.p.y+Math.sin(direction)*advance};

 return {canAutoSidestep,move};
}
