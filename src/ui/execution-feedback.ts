import {recoveryAdviceFor} from './recovery-guidance.ts';
import type {ExecutionEvent} from '../breach-execution-events.ts';
/** Priority-based, time-limited HUD notices from the EXISTING player-facing event log.
 * No inspection of enemy state, fog, or world geometry. */
export type FeedbackSeverity='danger'|'contact'|'warning'|'progress'|'routine'|'state';
export type ExecutionNotice={
  text:string;label:string;severity:FeedbackSeverity;priority:number;
  born:number;expires:number;recovery?:string;
};
type Classified={label:string;severity:FeedbackSeverity;priority:number;duration:number};
export function classifyExecutionNotice(message:string):Classified{
  const text=message.toUpperCase();
  if(/\b(DOWN|HEAVY WOUND|INCAPACITATED|BLEEDING|CRITICAL|MISSION FAILED|TEAM LOST)\b/.test(text))
    return {label:'URGENT',severity:'danger',priority:5,duration:5200};
  if(/\b(CONTACT|SPOTTED|UNSEEN GUNFIRE)\b/.test(text))
    return {label:'CONTACT',severity:'contact',priority:4,duration:4100};
  if(/\b(BLOCKED|OBSTRUCT|NO SAFE ROUTE|CANNOT|INVALID|JAMMED|OUT OF RANGE|NO WALKABLE|LOCKED|RESISTED|INSUFFICIENT CLEARANCE|INVALIDATE A LATER WAYPOINT|NOT REACHABLE|NO KNOWN DOOR|NO PUSHABLE|NO OPERABLE|AIM POINT|TARGET UNAVAILABLE)\b/.test(text))
    return {label:'OBSTRUCTED',severity:'warning',priority:3,duration:3500};
  if(/\b(INJURED|WOUND|HIT|HURT|STABILIZED)\b/.test(text))
    return {label:'MEDICAL',severity:'danger',priority:4,duration:4500};
  if(/\b(RELOAD(?:ED|ING)?|MAGAZINE|FLASH|DOOR|OPENED|CLOSING|FORCED|EXTRACT|RECOVERED|SECURED)\b/.test(text))
    return {label:'ACTION',severity:'progress',priority:2,duration:2300};
  return {label:'UPDATE',severity:'routine',priority:1,duration:1750};
}
/** Typed order feedback cannot infer hidden world state or inspect narrative text. */
export function classifyExecutionTransition(event:Pick<ExecutionEvent,'kind'|'reason'>):
 Classified|null{
 switch(event.kind){
  case 'blocked':return {label:'OBSTRUCTED',severity:'warning',priority:3,duration:3500};
  case 'recovering':return {label:'RECOVERING',severity:'progress',priority:2,duration:1800};
  case 'resumed':return {label:'RESUMED',severity:'progress',priority:2,duration:1750};
  case 'completed':return {label:'COMPLETE',severity:'progress',priority:2,duration:2200};
  case 'holding':return event.reason==='contact'?
    {label:'CONTACT HOLD',severity:'contact',priority:4,duration:2900}:
    {label:'HOLDING',severity:'state',priority:1,duration:1500};
  case 'waiting':return {label:'WAITING',severity:'state',priority:1,duration:1300};
  case 'started':return null;
 }
}
function executionRecovery(reason:string):string|undefined{
 if(reason==='door-locked'||reason==='door-obstructed'||reason==='door-held')
  return 'Check the known door and select another available action.';
 if(reason==='traffic-stall'||reason==='traffic')
  return 'Check teammate spacing and the shared passage.';
 if(reason==='order-failed')
  return 'Select the affected order to edit or replace it.';
 if(reason.startsWith('collision-'))
  return 'Check the visible obstruction and adjust the route if needed.';
 return undefined;
}
export class ExecutionNoticeFeed{
  private priorEvents:string[]|null=null;
  private priorPhase:string|null=null;
  private lastExecutionId:number|null=null;
  private queue:ExecutionNotice[]=[];
  reset(){
    this.priorEvents=null;this.priorPhase=null;
    this.lastExecutionId=null;this.queue=[];
  }
  /** Only the new suffix of a rolling, at-most-12-item game event log is ingested. */
  update(events:readonly string[],phase:string,now:number,
    executionEvents:readonly ExecutionEvent[]=[]):ExecutionNotice|null{
    let start=events.length;
    if(this.priorEvents===null){
      // Do not replay an entire old log when the screen first opens.
      start=Math.max(0,events.length-1);
    }else{
      const old=this.priorEvents;
      let overlap=0;
      const bound=Math.min(old.length,events.length);
      for(let count=bound;count>=1;count--){
        if(old.slice(-count).every((value,i)=>value===events[i])){
          overlap=count;break;
        }
      }
      start=overlap;
    }
    const latestId=executionEvents.at(-1)?.id;
    const after=this.lastExecutionId??Math.max(0,(latestId??0)-1);
    const fresh=executionEvents.filter(e=>e.id>after);
    if(latestId!==undefined)this.lastExecutionId=latestId;
    const structuredTexts=new Set(fresh.map(e=>e.text));
    for(const event of events.slice(start))if(!structuredTexts.has(event))
      this.enqueue(event,now);
    for(const event of fresh){
      const classification=classifyExecutionTransition(event);
      if(!classification)continue;
      this.queue.push({text:event.text,label:classification.label,
        severity:classification.severity,priority:classification.priority,
        born:now,expires:now+classification.duration,
        recovery:classification.severity==='warning'?
          executionRecovery(event.reason):undefined});
      if(this.queue.length>8)this.queue.shift();
    }
    if(this.priorPhase&&phase!==this.priorPhase){
      if(this.priorPhase==='running'&&phase==='planning')
        this.enqueue('Execution paused · Edit orders or resume',now,true);
      else if(this.priorPhase==='planning'&&phase==='running')
        this.enqueue('Executing planned orders',now,true);
    }
    this.priorEvents=[...events];
    this.priorPhase=phase;
    this.queue=this.queue.filter(x=>x.expires>now);
    // Higher-priority conditions are not instantly replaced by routine chatter.
    const ranked=this.queue.sort((a,b)=>b.priority-a.priority||b.born-a.born);
    return ranked[0]??null;
  }
  private enqueue(text:string,now:number,phase=false){
    if(!text.trim())return;
    const c:Classified=phase?
      {label:'STATE',severity:'state',priority:1,duration:1600}:
      classifyExecutionNotice(text);
    const recovery=c.severity==='warning'?recoveryAdviceFor(text)?.next:undefined;
    this.queue.push({text,label:c.label,severity:c.severity,recovery,
      priority:c.priority,born:now,expires:now+c.duration});
    if(this.queue.length>8)this.queue.splice(0,this.queue.length-8);
  }
}
