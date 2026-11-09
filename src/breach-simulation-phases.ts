/** Deterministic fixed-tick phase support. These helpers only advance
 * simulation-owned state; the runtime loop schedules the 60Hz tick.
 * Keep phase order in breach-game.ts authoritative while extracting owners.
 */
import type {Session,StepPhaseProbe} from './breach-game.ts';
import {executionStatus} from './breach-execution-state.ts';
import {executionTransition} from './breach-execution-events.ts';
export function simulationPhaseMark(probe?:StepPhaseProbe):(phase:string)=>void{
  let perfStart=probe?performance.now():0;
  return (phase:string)=>{
    if(!probe)return;
    const now=performance.now();
    probe(phase,now-perfStart);
    perfStart=now;
  };

}
export function advanceTransientSimulationEffects(s:Session,h:number):void{
  // Effects are usually empty between firefights; the old filters
  // allocated five fresh empty arrays on every authoritative 60Hz tick.
  // Nonempty collections retain the same age increments and expiry gates.
  if(s.sparks.length)s.sparks=s.sparks.filter(a=>(a.age+=h)<.20);
  if(s.shots.length)s.shots=s.shots.filter(a=>(a.age+=h)<.40);
  if(s.noise.length)s.noise=s.noise.filter(n=>s.seconds-n.time<4);
  for(const magazine of s.dropped)magazine.age+=h;
  if(s.impactMarks.length)
    s.impactMarks=s.impactMarks.filter(mark=>(mark.age+=h)<24);
  if(s.flashBursts.length)
    s.flashBursts=s.flashBursts.filter(b=>(b.age+=h)<.70);
}
export function recordSimulationExecutionOutcomes(s:Session):void{
  // Record only changed player-visible states after the authoritative tick.
  // This is observational: no actor motion or tactical orders are changed.
  const friendly=s.operators.filter(a=>a.side==='blue');
  for(const unit of friendly){
    const status=executionStatus(unit,{
      phase:s.phase,doors:s.doors,peers:friendly
    });
    const change=executionTransition(unit.executionLastStatus,status,unit.name);
    unit.executionLastStatus=status;
    if(!change)continue;
    s.executionEvents.push({
      id:s.nextExecutionId++,t:s.seconds,actor:unit.id,
      p:{...unit.p},...change
    });
    if(s.executionEvents.length>240)s.executionEvents.shift();
  }
}
