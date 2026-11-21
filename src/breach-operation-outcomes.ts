/** OC1–OC10: objective completion and individual physical extraction
 * are separate authorities. The live squad remains the only AI/motor input.
 * A removed operator is archived for replay/debrief, never teleported.
 */
import type {Session,TeamActor} from './breach-game.ts';

export type OperationDisposition='completed'|'withdrawn'|'overwhelmed'|'failed';
export type OperationOutcome={
 disposition:OperationDisposition;
 objectiveSecured:boolean;
 extractedOperatorIds:string[];
 evacuatedCasualtyIds:string[];
 leftBehindOperatorIds:string[];
};
export const EXTRACTION_RADIUS=37;
const inExtraction=(s:Pick<Session,'scenario'>,p:{x:number;y:number})=>
 Math.hypot(p.x-s.scenario.extract.x,p.y-s.scenario.extract.y)<=EXTRACTION_RADIUS;

/** Reporting only: retained physical extraction snapshots are not actors
 * in the live combat, fog, AI or collision loops. Preserve roster order. */
export function deployedTeam(s:Pick<Session,'operators'|'extractedOperators'>):TeamActor[]{
 const squad=[...s.operators.filter(a=>a.side==='blue'),
  ...(s.extractedOperators??[])];
 const slots=['rook','moss','ash','vale'];
 const order=(id:string)=>{const n=slots.indexOf(id);return n<0?99:n;};
 return squad.sort((a,b)=>order(a.id)-order(b.id)||a.id.localeCompare(b.id));
}

export function canConcludeWithdrawal(s:Pick<Session,
 'operators'|'scenario'|'withdrawalRequested'|'extractedOperators'>):boolean{
 if(s.withdrawalRequested!==true)return false;
 const mobile=s.operators.filter(a=>a.side==='blue'&&a.health>0);
 if(!mobile.length)return (s.extractedOperators?.length??0)>0;
 return mobile.every(a=>inExtraction(s,a.p));
}
export function requestWithdrawal(s:Pick<Session,
 'phase'|'site'|'started'|'withdrawalRequested'>):boolean{
 if(s.site?.training||!s.started||
    (s.phase!=='running'&&s.phase!=='planning')||
    s.withdrawalRequested===true)return false;
 s.withdrawalRequested=true;
 return true;
}

/** A player may commit a single person only after they physically reach the
 * live extraction zone. The click queues intent; the next fixed GO tick
 * verifies the position again before retiring the actor from combat. */
export function requestIndividualExtraction(s:Pick<Session,
 'phase'|'started'|'withdrawalRequested'|'operators'|
 'scenario'|'pendingExtractionIds'>,actorId:string):boolean{
 if(!s.started||s.phase!=='planning'||!s.withdrawalRequested)return false;
 const actor=s.operators.find(a=>a.id===actorId&&a.side==='blue'&&a.health>0);
 if(!actor||!inExtraction(s,actor.p)||actor.carryingId)return false;
 const pending=s.pendingExtractionIds??(s.pendingExtractionIds=[]);
 if(pending.includes(actor.id))return false;
 pending.push(actor.id);
 return true;
}

/** The sole fixed-tick player-exit commit: removes only actors already at
 * the actual gate, so no active AI, shots, sight or path can reference a
 * "departed" combatant in the following simulation phase. */
export function commitIndividualExtractions(s:Session):TeamActor[]{
 if(!s.withdrawalRequested||!s.pendingExtractionIds?.length)return [];
 const queue=[...s.pendingExtractionIds];
 s.pendingExtractionIds.length=0;
 const archive=s.extractedOperators??(s.extractedOperators=[]);
 const moved:TeamActor[]=[];
 for(const id of queue){
  const idx=s.operators.findIndex(a=>a.id===id&&a.side==='blue');
  if(idx<0)continue;
  const actor=s.operators[idx];
  if(actor.health<=0||!inExtraction(s,actor.p)||actor.carryingId)continue;
  s.operators.splice(idx,1);
  actor.plan.length=0;actor.path.length=0;
  if(s.passageLeases)delete s.passageLeases[actor.id];
  archive.push(actor);moved.push(actor);
 }
 return moved;
}

export function deriveOperationOutcome(s:Pick<Session,
 'phase'|'mission'|'operators'|'scenario'|
 'withdrawalCompleted'|'extractedOperators'>):OperationOutcome{
 const active=s.operators.filter(a=>a.side==='blue');
 const archived=s.extractedOperators??[];
 const extracted=[...archived.filter(a=>a.health>0),
  ...active.filter(a=>a.health>0&&inExtraction(s,a.p))];
 const evacuated=active.filter(a=>a.health<=0&&inExtraction(s,a.p));
 const accounted=new Set([...extracted,...evacuated].map(a=>a.id));
 const disposition:OperationDisposition=s.phase==='won'?'completed':
  s.withdrawalCompleted===true&&s.phase==='lost'?'withdrawn':
  [...active,...archived].every(a=>a.health<=0)?'overwhelmed':'failed';
 return {disposition,objectiveSecured:s.mission==='extract'||s.mission==='done',
   extractedOperatorIds:extracted.map(a=>a.id),
   evacuatedCasualtyIds:evacuated.map(a=>a.id),
   leftBehindOperatorIds:[...active,...archived].filter(a=>!accounted.has(a.id)).map(a=>a.id)};
}
