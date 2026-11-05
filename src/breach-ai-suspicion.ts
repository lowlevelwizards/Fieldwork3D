/** E1-A: bounded, actor-local suspicion accumulation.
 * Evidence comes ONLY from an observer's confirmed vision, acoustically
 * interpreted event or physically delivered report. Never a world-truth query.
 * This module never plans routes, targets actors, shoots or pauses the game. */
export type SuspicionStage='unaware'|'curious'|'suspicious'|'alerted'|'searching';
export type SuspicionEvidenceKind='orient'|'investigate'|'alarm'|'report'|'contact';
export type SuspicionEvidence={
  id:string;at:number;kind:SuspicionEvidenceKind;
  intensity?:number;cause:string;
};
export type SuspicionMemory={
  pressure:number;stage:SuspicionStage;
  lastEvidenceAt:number;lastStageAt:number;
  lastCause:string;recentIds:string[];
  searchExhaustedAt:number;
};
const clamp=(value:number,min:number,max:number)=>
  Math.max(min,Math.min(max,value));
export const newSuspicion=():SuspicionMemory=>({
  pressure:0,stage:'unaware',lastEvidenceAt:-1,lastStageAt:-1,
  lastCause:'',recentIds:[],searchExhaustedAt:-1
});
const escalation:Record<SuspicionEvidenceKind,number>={
  orient:.16,investigate:.30,alarm:.73,report:.58,contact:1
};
const rank:Record<SuspicionStage,number>={
  unaware:0,curious:1,suspicious:2,searching:2,alerted:3
};
/** Damp repeated samples with an observer-local bounded event ID cache. */
export function observeSuspicion(memory:SuspicionMemory,
  evidence:SuspicionEvidence):boolean{
  if(!evidence.id||!Number.isFinite(evidence.at)||
    memory.recentIds.includes(evidence.id)||
    evidence.at<memory.lastEvidenceAt-.001)return false;
  memory.recentIds.push(evidence.id);
  if(memory.recentIds.length>24)memory.recentIds.shift();
  const weight=escalation[evidence.kind];
  const intensity=clamp(Number.isFinite(evidence.intensity)?
    evidence.intensity??1:1,0,1);
  // Alert contact is categorical. Otherwise repeated independent evidence
  // accumulates without treating a faint footstep as gunfire.
  memory.pressure=evidence.kind==='contact'?1:
    Math.min(1,memory.pressure+weight*(.75+.25*intensity));
  memory.lastEvidenceAt=evidence.at;
  memory.lastCause=evidence.cause;
  const desired=pressureStage(memory.pressure);
  if(rank[desired]>rank[memory.stage]||
    evidence.kind==='contact'){
    memory.stage=desired;
    memory.lastStageAt=evidence.at;
  }
  return true;
}
export function pressureStage(pressure:number):Exclude<SuspicionStage,'searching'>{
  return pressure>=.70?'alerted':pressure>=.30?'suspicious':
    pressure>=.115?'curious':'unaware';
}
/** Calm only after a brief observation grace period. Remain wary longer
 * after a serious alarm; descending thresholds have dwell hysteresis. */
export function advanceSuspicion(memory:SuspicionMemory,now:number,dt:number,
  searching=false):SuspicionStage{
  if(!Number.isFinite(now)||!Number.isFinite(dt)||dt<=0)return memory.stage;
  const elapsed=memory.lastEvidenceAt<0?Infinity:now-memory.lastEvidenceAt;
  if(elapsed>1.5){
    const rate=memory.pressure>=.70?.018:.030;
    memory.pressure=clamp(memory.pressure-rate*dt,0,1);
  }
  const desired=pressureStage(memory.pressure);
  if(rank[desired]>rank[memory.stage]){
    memory.stage=desired;memory.lastStageAt=now;
  }else if(rank[desired]<rank[memory.stage]&&
           now-memory.lastStageAt>=.85){
    // Require extra evidence decay before going down one or more bands.
    const exits:Record<SuspicionStage,number>={
      unaware:0,curious:.085,suspicious:.24,searching:.24,alerted:.62
    };
    if(memory.pressure<exits[memory.stage]){
      memory.stage=desired;memory.lastStageAt=now;
    }
  }
  if(searching&&memory.pressure>=.24&&memory.stage!=='alerted'){
    if(memory.stage!=='searching')memory.lastStageAt=now;
    memory.stage='searching';
  }else if(memory.stage==='searching'&&!searching){
    memory.stage=pressureStage(memory.pressure);
    memory.lastStageAt=now;
  }
  return memory.stage;
}
/** Search completion reduces sustained alarm but does not erase evidence. */
export function exhaustSuspicionSearch(memory:SuspicionMemory,now:number):void{
  memory.searchExhaustedAt=now;
  memory.pressure=Math.min(memory.pressure,.47);
  if(memory.stage==='searching'||memory.stage==='alerted'){
    memory.stage='suspicious';memory.lastStageAt=now;
  }
}
