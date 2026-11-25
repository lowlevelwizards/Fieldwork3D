/** V19.4: optional, bounded observer-specific effect samples.
 * Ground-plane optical probes use the actual historical observer at capture,
 * never a future explored-ground map. Personal playback consumes only
 * exact sampled identities and positions. Unsupported effects stay hidden. */
import {observerPointVisible,type Session,type TeamActor,type ShotEvent,type ImpactMark} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {isGroundImpactMark} from './breach-impact-surface.ts';
import {recordedReplayKnowledge} from './breach-replay-visibility.ts';
import {reuseFrozenReplayValue} from './breach-replay-sharing.ts';
export const EFFECT_SAMPLE_POINT_LIMIT=12;
export const EFFECT_SAMPLE_OBSERVER_LIMIT=4;
export const EFFECT_SAMPLE_MAX_AGE=.075;
// kind, id, world x, world z, immutable event/revision token.
export type EffectEvidenceRow=readonly [kind:'muzzle'|'impact'|'ground',id:number,x:number,y:number,token:string];
export type ReplayEffectEvidence={version:1;at:number;rows:readonly EffectEvidenceRow[];
 observers:readonly (readonly [id:string,mask:number])[]};
export function shotEffectRow(shot:ShotEvent,kind:'muzzle'|'impact'):EffectEvidenceRow{
 const p=kind==='muzzle'?shot.start:shot.end;
 return [kind,shot.id,p.x,p.y,shot.shooterId+':'+(shot.firedAt??'legacy')+':'+(kind==='muzzle'?shot.muzzleHeight??15:shot.impactHeight??12)];
}
export function groundEffectRow(mark:ImpactMark):EffectEvidenceRow{
 return ['ground',mark.id,mark.p.x,mark.p.y,
  JSON.stringify([mark.surface,mark.bloodKind,mark.bloodAmount,mark.damageCount,mark.shotId])];
}
const sameRow=(a:EffectEvidenceRow,b:EffectEvidenceRow)=>a.every((v,i)=>v===b[i]);
export function captureEffectEvidence(s:Session,prior?:ReplayEffectEvidence,
 visible:(s:Session,a:TeamActor,p:Pt)=>boolean=observerPointVisible):ReplayEffectEvidence|undefined{
 const rows:EffectEvidenceRow[]=[];
 for(let i=s.shots.length-1,n=0;i>=0&&n<4;i--){
  const shot=s.shots[i];
  if(shot.age<0||shot.age>.4)continue;
  if(shot.age<=.12)rows.push(shotEffectRow(shot,'muzzle'));
  rows.push(shotEffectRow(shot,'impact'));n++;
 }
 for(let i=s.impactMarks.length-1,n=0;i>=0&&n<4&&rows.length<EFFECT_SAMPLE_POINT_LIMIT;i--){
  const mark=s.impactMarks[i];if(!isGroundImpactMark(mark))continue;
  rows.push(groundEffectRow(mark));n++;
 }
 if(!rows.length)return undefined;
 const observers:(readonly [string,number])[]=[];
 for(const actor of s.operators){
  if(actor.side!=='blue'||actor.health<=0)continue;
  if(observers.length>=EFFECT_SAMPLE_OBSERVER_LIMIT)break;
  let mask=0;
  // Deduplicate coincident optical points for this observer, not across
  // observers. A false bit is just as important as a true bit.
  const points=new Map<string,boolean>();
  for(let i=0;i<rows.length;i++){
   const [, ,x,y]=rows[i];if(!Number.isFinite(x)||!Number.isFinite(y))continue;
   const key=x+','+y;
   let seen=points.get(key);
   if(seen===undefined){seen=visible(s,actor,{x,y});points.set(key,seen);}
   if(seen)mask|=1<<i;
  }
  observers.push([actor.id,mask]);
 }
 return {version:1,at:s.seconds,
  rows:reuseFrozenReplayValue(rows,prior?.rows as EffectEvidenceRow[]|undefined,()=>rows),
  observers:reuseFrozenReplayValue(observers,prior?.observers as (readonly [string,number])[]|undefined,()=>observers)};
}
export function effectSampleAllows(sample:ReplayEffectEvidence|undefined,
 time:number,observerId:string,row:EffectEvidenceRow):boolean{
 if(sample?.version!==1||!Number.isFinite(time)||!Number.isFinite(sample.at)||
   time<sample.at-1e-6||time-sample.at>EFFECT_SAMPLE_MAX_AGE||
   !Array.isArray(sample.rows)||sample.rows.length>EFFECT_SAMPLE_POINT_LIMIT||
   !Array.isArray(sample.observers)||sample.observers.length>EFFECT_SAMPLE_OBSERVER_LIMIT)return false;
 const observer=sample.observers.find(o=>Array.isArray(o)&&o[0]===observerId);
 if(!observer||!Number.isInteger(observer[1]))return false;
 const index=sample.rows.findIndex(r=>Array.isArray(r)&&r.length===5&&sameRow(r,row));
 return index>=0&&(observer[1]&(1<<index))!==0;
}
export function recordedEffectAllows(s:Session,observerId:string,row:EffectEvidenceRow):boolean{
 return effectSampleAllows(recordedReplayKnowledge(s)?.effectEvidence,s.seconds,observerId,row);
}
