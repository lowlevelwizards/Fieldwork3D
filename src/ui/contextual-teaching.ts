/** Progressive, nonblocking help. No world queries, fog information, or timers.
 * A hint is offered once per successful discovery; explicit Help remains available. */
export type TeachingHint={key:string;text:string;expires:number};
export class ContextualTeaching{
  private seen=new Set<string>();
  private active:TeachingHint|null=null;
  constructor(private readonly read:(key:string)=>boolean=()=>false,
    private readonly write:(key:string)=>void=()=>{}){}
  offer(key:string,text:string,now:number,duration=4000):boolean{
    if(!text.trim()||this.seen.has(key))return false;
    if(this.read(key)){this.seen.add(key);return false;}
    this.seen.add(key);
    try{this.write(key);}catch{/* Private browsing may prohibit persistence. */}
    this.active={key,text,expires:now+Math.max(600,duration)};
    return true;
  }
  current(now:number):TeachingHint|null{
    if(this.active&&now>=this.active.expires)this.active=null;
    return this.active;
  }
  dismiss(){this.active=null;}
  /** Successful interactions can teach even if the player never reads help. */
  learned(key:string){
    this.seen.add(key);
    try{this.write(key);}catch{/* Storage is optional. */}
    if(this.active?.key===key)this.active=null;
  }
}

/** Explicit phase/urgency hierarchy. Presentation decisions never inspect AI. */
export type HudPhase='planning'|'targeting'|'execution'|'debrief'|'replay';
export type HudUrgency='normal'|'warning'|'contact'|'danger';
export function resolveHudPresentation(options:{
  phase:HudPhase;urgency:HudUrgency;explicitHelp:boolean;
  coaching:boolean;targetPrompt:boolean;
}):{showGuidance:boolean;showCoaching:boolean;compactMission:boolean}{
  const {phase,urgency,explicitHelp,coaching,targetPrompt}=options;
  const planning=phase==='planning'||phase==='targeting';
  const critical=urgency==='warning'||urgency==='contact'||urgency==='danger';
  return {
    showGuidance:planning&&(targetPrompt||explicitHelp||(!critical&&coaching)),
    showCoaching:planning&&!critical&&!targetPrompt&&!explicitHelp&&coaching,
    compactMission:phase==='execution'||phase==='replay'
  };
}
