/** Priority-based, time-limited HUD notices from the EXISTING player-facing event log.
 * No inspection of enemy state, fog, or world geometry. */
export type FeedbackSeverity='danger'|'contact'|'warning'|'progress'|'routine'|'state';
export type ExecutionNotice={
  text:string;label:string;severity:FeedbackSeverity;priority:number;
  born:number;expires:number;
};
type Classified={label:string;severity:FeedbackSeverity;priority:number;duration:number};
export function classifyExecutionNotice(message:string):Classified{
  const text=message.toUpperCase();
  if(/\b(DOWN|HEAVY WOUND|INCAPACITATED|BLEEDING|CRITICAL|MISSION FAILED|TEAM LOST)\b/.test(text))
    return {label:'URGENT',severity:'danger',priority:5,duration:5200};
  if(/\b(CONTACT|SPOTTED|UNSEEN GUNFIRE)\b/.test(text))
    return {label:'CONTACT',severity:'contact',priority:4,duration:4100};
  if(/\b(BLOCKED|OBSTRUCT|NO SAFE ROUTE|CANNOT|INVALID|JAMMED|OUT OF RANGE|NO WALKABLE|LOCKED|RESISTED)\b/.test(text))
    return {label:'OBSTRUCTED',severity:'warning',priority:3,duration:3500};
  if(/\b(INJURED|WOUND|HIT|HURT|STABILIZED)\b/.test(text))
    return {label:'MEDICAL',severity:'danger',priority:4,duration:4500};
  if(/\b(RELOAD|MAGAZINE|FLASH|DOOR|OPENED|CLOSING|FORCED|EXTRACT|RECOVERED|SECURED)\b/.test(text))
    return {label:'ACTION',severity:'progress',priority:2,duration:2300};
  return {label:'UPDATE',severity:'routine',priority:1,duration:1750};
}
export class ExecutionNoticeFeed{
  private priorEvents:string[]|null=null;
  private priorPhase:string|null=null;
  private queue:ExecutionNotice[]=[];
  reset(){
    this.priorEvents=null;this.priorPhase=null;this.queue=[];
  }
  /** Only the new suffix of a rolling, at-most-12-item game event log is ingested. */
  update(events:readonly string[],phase:string,now:number):ExecutionNotice|null{
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
    for(const event of events.slice(start))this.enqueue(event,now);
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
    this.queue.push({text,label:c.label,severity:c.severity,
      priority:c.priority,born:now,expires:now+c.duration});
    if(this.queue.length>8)this.queue.splice(0,this.queue.length-8);
  }
}
