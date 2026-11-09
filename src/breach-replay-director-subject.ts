/** Retrospective subject importance, independent of camera placement.
 * Every candidate uses CURRENT recorded friendly activity, not future
 * enemy coordinates, grading, camera angle or a permanent protagonist.
 * Bounded look-ahead can set up a known friendly's action but never
 * outrank a present, observed contact or active room entry.
 */
import type {DirectorActor} from './breach-replay-cinematic-director.ts';
import type {DirectorEditorialEvidence} from './breach-replay-director-edit.ts';

export type DirectorSubjectImportance={
  score:number;reason:string;active:boolean
};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>
  Math.hypot(a.x-b.x,a.y-b.y);

/** Single stable hierarchy: fighting > crossing > breaking/seeing >
 * setting up a door > moving > watch > idle. A door is NOT its subject. */
export function directorSubjectImportance(time:number,
  actor:DirectorActor,e:DirectorEditorialEvidence):DirectorSubjectImportance{
  const intent=e.intents.find(i=>i.actorId===actor.id);
  const speed=Math.max(0,intent?.speed??actor.velocity??0);
  const actualShot=e.actionLines?.some(a=>a.shooterId===actor.id);
  if(actualShot)return {score:10,reason:'recorded friendly firing',active:true};
  if(e.contact?.observerId===actor.id)
    return {score:9.2,reason:'confirmed currently observed contact',active:true};
  if(e.entry?.actorId===actor.id&&e.entry.first&&
    time>=e.entry.t&&time-e.entry.t<=1.2)
    return {score:8.4,reason:'first operator crossing the threshold',active:true};
  if(e.beat?.kind==='door'&&e.beat.actorId===actor.id&&
    time>=e.beat.first-.2&&
    distance(actor.p,e.beat.target)<60)
    return {score:7.6,reason:'recorded door interaction',active:true};
  if(e.discovery?.observerId===actor.id&&
    (e.discovery.newGround>=3||e.discovery.newCivilians>0))
    return {score:7.1,reason:'newly observed ground',active:true};
  if(e.beat?.kind==='fight'&&e.beat.actorId===actor.id&&
    time>=e.beat.first-.5&&time<=e.beat.last+.6)
    return {score:6.6,reason:'recent recorded exchange',active:true};
  // Use only a friendly identity for setup, never future enemy presence.
  if(e.entry?.actorId===actor.id&&e.entry.t>time&&
    e.entry.t-time<=1.1)
    return {score:5.7,reason:'approaching recorded first entry',active:true};
  if(e.upcoming?.actorId===actor.id&&
    e.upcoming.kind==='contact'&&e.upcoming.t>time)
    return {score:5.1,reason:'friendly approaching known action',active:true};
  if(intent?.door&&intent.door.distance<90){
    const toward={x:intent.door.mid.x-actor.p.x,
      y:intent.door.mid.y-actor.p.y};
    const away=toward.x*intent.direction.x+
      toward.y*intent.direction.y<-intent.door.distance*.25&&speed>4;
    // Don't attach the photograph to a spent door when the entrant
    // is already walking into the newly entered room.
    if(!away){
      if(intent.kind==='breach')
        return {score:5.7,reason:'actively breaching',active:true};
      if(intent.kind==='entry')
        return {score:5.5,reason:'actively entering',active:true};
      if(intent.kind==='stack')
        return {score:4.8,reason:'stacking at the threshold',active:true};
      if(intent.kind==='approach')
        return {score:3.9,reason:'approaching doorway',active:true};
    }
  }
  if(speed>6)
    return {score:3.6+clamp((speed-6)/25,0,1.0),
      reason:'operator moving with purpose',active:true};
  if(speed>2)
    return {score:2.9,reason:'operator repositioning',active:true};
  if(intent?.watchDirection||intent?.kind==='overwatch')
    return {score:2.4,reason:'watching a held sector',active:false};
  return {score:.6,reason:'idle / no current action',active:false};
}
